from rest_framework import generics, permissions, status, views, filters
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404
import uuid

from .models import Paiement
from .serializers import PaiementSerializer, PaiementInitSerializer, PaiementActionSerializer
from orders.models import Commande
from account.permissions import IsAdmin
from fournisseur.models import creer_notification_client


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or getattr(request.user, 'role', None) in ['admin', 'administrateur']:
            return True
        try:
            return obj.client == request.user.client
        except Exception:
            return False


# -----------------------------
# Initier un paiement
# -----------------------------
class PaiementInitView(views.APIView):
    """
    Le client initie un paiement pour une commande existante.
    Le statut reste 'en_attente' ; la confirmation arrivera ultérieurement
    via un callback de prestataire ou une action admin.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = PaiementInitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        commande_id = serializer.validated_data['commande']
        moyen = serializer.validated_data['moyen']
        cle = serializer.validated_data.get('idempotence_key')

        commande = get_object_or_404(
            Commande,
            id=commande_id,
            client=request.user.client
        )

        # Idempotence : double clic -> retourne le même paiement sans doublon
        if cle:
            try:
                existing = Paiement.objects.get(cle_idempotence=cle, commande=commande)
                return Response(PaiementSerializer(existing).data, status=status.HTTP_200_OK)
            except Paiement.DoesNotExist:
                pass

        # Empêcher de payer une commande annulée / déjà remboursée / etc.
        if commande.statut in ['annulee', 'refusee', 'terminee']:
            return Response(
                {'error': "Cette commande ne peut plus faire l'objet d'un paiement."},
                status=status.HTTP_400_BAD_REQUEST
            )

        cle_idempotence = cle or uuid.uuid4().hex

        paiement = Paiement.objects.create(
            commande=commande,
            client=commande.client,
            moyen=moyen,
            montant=commande.montant_total,
            cle_idempotence=cle_idempotence,
            statut='en_attente'
        )

        # On mémorise le moyen choisi sur la commande
        commande.mode_paiement = moyen

        # Paiement différé (livraison/retrait) : pas de blocage en attente de provider
        if moyen in ('a_la_livraison', 'a_la_retrait'):
            commande.statut = 'en_attente_confirmation'
        else:
            commande.statut = 'en_attente_paiement'

        commande.save()

        return Response(PaiementSerializer(paiement).data, status=status.HTTP_201_CREATED)


# -----------------------------
# Client - liste / détail
# -----------------------------
class ClientPaiementListView(generics.ListAPIView):
    serializer_class = PaiementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Paiement.objects.filter(client=self.request.user.client)


class PaiementDetailView(generics.RetrieveAPIView):
    serializer_class = PaiementSerializer
    permission_classes = [IsOwnerOrAdmin]
    queryset = Paiement.objects.all()


# -----------------------------
# Client - annuler
# -----------------------------
class ClientPaiementAnnulerView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        paiement = get_object_or_404(Paiement, pk=pk)

        if paiement.client != request.user.client:
            return Response({'error': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        if paiement.statut not in ('en_attente', 'en_cours'):
            return Response(
                {'error': 'Ce paiement ne peut plus être annulé.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not paiement.peut_transitionner_vers('annule'):
            return Response(
                {'error': 'Transition de statut impossible.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        paiement.statut = 'annule'
        paiement.save()

        commande = paiement.commande
        commande.statut = 'annulee'
        commande.save()

        return Response(PaiementSerializer(paiement).data)


# -----------------------------
# Admin - gestion
# -----------------------------
class AdminPaiementListView(generics.ListAPIView):
    serializer_class = PaiementSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['reference', 'commande__reference', 'client__user__nom', 'client__user__email']
    ordering_fields = ['date_creation', 'montant', 'statut']
    ordering = ['-date_creation']

    def get_queryset(self):
        return Paiement.objects.select_related('commande', 'client__user')


class AdminPaiementDetailView(generics.RetrieveAPIView):
    serializer_class = PaiementSerializer
    permission_classes = [IsAdmin]
    queryset = Paiement.objects.select_related('commande', 'client__user')


class AdminPaiementActionView(views.APIView):
    """
    Action réservée à l'admin/futur prestataire.
    'confirmer' simule ici la réception d'une confirmation de provider.
    L'action 'echouer' simule un retour négatif du provider.
    Aucune action 'réussir' n'est possible depuis le frontend client.
    """
    permission_classes = [IsAdmin]

    ACTION_VERS_STATUT = {
        'confirmer': 'reussi',
        'echouer': 'echoue',
        'annuler': 'annule',
        'demander_remboursement': 'remboursement_demande',
        'demarrer_remboursement': 'remboursement_en_cours',
        'rembourser': 'rembourse',
        'refuser_remboursement': 'remboursement_refuse',
    }

    @transaction.atomic
    def post(self, request, pk):
        paiement = get_object_or_404(Paiement, pk=pk)
        serializer = PaiementActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        action = serializer.validated_data['action']
        motif = serializer.validated_data.get('motif', '')
        provider_reference = serializer.validated_data.get('provider_reference', '')
        remboursement_montant = serializer.validated_data.get('remboursement_montant')
        metadata = serializer.validated_data.get('metadata') or {}

        nouveau_statut = self.ACTION_VERS_STATUT.get(action)
        if not nouveau_statut:
            return Response({'error': 'Action inconnue.'}, status=status.HTTP_400_BAD_REQUEST)

        if not paiement.peut_transitionner_vers(nouveau_statut):
            return Response(
                {'error': f"Impossible de passer le paiement de '{paiement.statut}' vers '{nouveau_statut}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        paiement.statut = nouveau_statut

        if action == 'echoue':
            paiement.motif_erreur = motif
        elif action == 'annuler':
            paiement.motif_erreur = motif or 'Annulé par un opérateur'
        elif action in ('demander_remboursement', 'demarrer_remboursement', 'rembourser', 'refuser_remboursement'):
            paiement.remboursement_motif = motif
            paiement.remboursement_montant = remboursement_montant

        if provider_reference:
            paiement.provider_reference = provider_reference
        if metadata:
            paiement.metadata.update(metadata)

        paiement.save()

        # Mise à jour cohérente du statut de la commande (sans confondre les deux)
        commande = paiement.commande
        if nouveau_statut == 'reussi' and commande.statut == 'en_attente_paiement':
            commande.statut = 'acceptee'
        elif nouveau_statut == 'echoue':
            if commande.statut != 'annulee':
                commande.statut = 'en_attente_paiement'
        elif nouveau_statut == 'annule':
            commande.statut = 'annulee'
        elif nouveau_statut == 'rembourse':
            commande.statut = 'annulee'
        commande.save()

        # 🔔 Notifier le client du résultat du paiement
        if commande.client and commande.client.user:
            if nouveau_statut == 'reussi':
                creer_notification_client(
                    client_id=commande.client.user.id,
                    type_notif='PAYMENT_SUCCESS',
                    titre='Paiement confirmé',
                    message=f"Le paiement de votre commande {commande.reference} a été confirmé.",
                    lien=f'/mes-commandes/{commande.id}',
                    importance='success',
                    objet_type='Paiement',
                    objet_id=paiement.id
                )
            elif nouveau_statut == 'echoue':
                creer_notification_client(
                    client_id=commande.client.user.id,
                    type_notif='PAYMENT_FAILED',
                    titre='Paiement échoué',
                    message=f"Le paiement de votre commande {commande.reference} n'a pas abouti. {motif}",
                    lien=f'/mes-commandes/{commande.id}',
                    importance='danger',
                    objet_type='Paiement',
                    objet_id=paiement.id
                )

        return Response(PaiementSerializer(paiement).data)


# -----------------------------
# Webhook réservé au futur prestataire
# -----------------------------
class PaiementWebhookView(views.APIView):
    """
    Endpoint laissé vide pour une intégration future avec un vrai prestataire.
    L'application frontend n'appelle JAMAIS cet endpoint directement.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        return Response(
            {'detail': 'Webhook réservé à un futur prestataire de paiement.'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )