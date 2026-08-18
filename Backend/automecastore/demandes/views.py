from rest_framework import generics, permissions, status, views, filters
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q

from .models import DemandePiece, OffreFournisseur
from .serializers import (
    DemandePieceCreateSerializer,
    DemandePieceListSerializer,
    DemandePieceDetailSerializer,
    OffreFournisseurSerializer,
    OffreFournisseurCreateSerializer,
    DemandeAcceptOffreSerializer,
)
from account.models import Client, Administrateur
from account.permissions import IsClient, IsFournisseur, IsAdmin, IsClientOrAdmin
from fournisseur.models import creer_notification_client, creer_notification_fournisseur, creer_notification_admin
from orders.models import Commande, LigneCommande


# -------------------------------------------------------
# Helpers
# -------------------------------------------------------
def _client_ou_none(user):
    try:
        return user.client
    except Exception:
        return None


def _notifier_client_nouvelle_offre(client_id, demande_id, demande_reference):
    if client_id:
        creer_notification_client(
            client_id,
            type_notif='PART_REQUEST_OFFER',
            titre='Nouvelle offre reçue',
            message=f"Un magasin a répondu à votre demande {demande_reference}.",
            lien=f"/mes-demandes/{demande_id}",
            importance='info',
            objet_type='DemandePiece',
            objet_id=demande_id
        )


def _notifier_fournisseur_offre_acceptee(fournisseur_id, demande_id, demande_reference):
    if fournisseur_id:
        creer_notification_fournisseur(
            fournisseur_id,
            type_notif='OFFER_ACCEPTED',
            titre='Offre acceptée',
            message=f"Le client a accepté votre offre pour la demande {demande_reference}.",
            lien=f"/fournisseur/demandes/{demande_id}",
            importance='success',
            objet_type='DemandePiece',
            objet_id=demande_id
        )


def _notifier_admins_nouvelle_demande(demande):
    try:
        for admin in Administrateur.objects.select_related('user'):
            creer_notification_admin(
                admin.user.id,
                type_notif='ADMIN_ALERT',
                titre='Nouvelle demande de pièce',
                message=f"Demande {demande.reference} : {demande.piece_recherchee}",
                lien=f"/admin/demandes"
            )
    except Exception:
        pass


# -------------------------------------------------------
# DemandePiece - création publique
# -------------------------------------------------------
class DemandePieceCreateView(generics.CreateAPIView):
    """Création d'une demande (client connecté ou visiteur)."""
    queryset = DemandePiece.objects.all()
    serializer_class = DemandePieceCreateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        client = None
        if self.request.user.is_authenticated:
            client = _client_ou_none(self.request.user)
        instance = serializer.save(client=client)
        instance.statut = 'en_recherche'
        instance.save()

        # Notifier les administrateurs
        _notifier_admins_nouvelle_demande(instance)


# -------------------------------------------------------
# Client - Mes demandes
# -------------------------------------------------------
class ClientDemandeListView(generics.ListAPIView):
    serializer_class = DemandePieceListSerializer
    permission_classes = [IsClient]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['piece_recherchee', 'marque_vehicule', 'modele_vehicule']
    ordering_fields = ['date_creation', 'statut']
    ordering = ['-date_creation']

    def get_queryset(self):
        return DemandePiece.objects.filter(client=self.request.user.client)


class ClientDemandeDetailView(generics.RetrieveAPIView):
    serializer_class = DemandePieceDetailSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return DemandePiece.objects.filter(client=self.request.user.client)


# -------------------------------------------------------
# Client - offres d'une demande
# -------------------------------------------------------
class ClientOffreListView(generics.ListAPIView):
    serializer_class = OffreFournisseurSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        demande_id = self.kwargs.get('demande_id')
        return OffreFournisseur.objects.filter(
            demande__id=demande_id,
            demande__client=self.request.user.client
        )


# -------------------------------------------------------
# Client - accepter une offre
# -------------------------------------------------------
class ClientAccepterOffreView(views.APIView):
    """
    Le client accepte une offre. Cela crée une Commande réutilisant
    le système de commande existant.
    """
    permission_classes = [IsClient]

    @transaction.atomic
    def post(self, request, pk):
        demande = get_object_or_404(
            DemandePiece,
            pk=pk,
            client=request.user.client
        )

        serializer = DemandeAcceptOffreSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        offre_id = serializer.validated_data['offre_id']
        mode_reception = serializer.validated_data.get('mode_reception') or 'livraison'

        offre = get_object_or_404(
            OffreFournisseur,
            pk=offre_id,
            demande=demande,
            statut='en_attente'
        )

        if demande.statut in ['commande_creee', 'terminee', 'annulee']:
            return Response(
                {'error': 'Cette demande ne peut plus recevoir d\'offre.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        commande = Commande.objects.create(
            client=demande.client,
            statut='en_attente_paiement',
            mode_reception=mode_reception,
            adresse_livraison=f"{demande.quartier}, {demande.ville}".strip(', '),
            telephone_client=demande.telephone_contact,
            commentaire_fournisseur=offre.description
        )

        LigneCommande.objects.create(
            commande=commande,
            produit=None,
            fournisseur=offre.fournisseur,
            magasin=None,
            quantite=demande.quantite,
            prix_unitaire=offre.prix,
            mode_reception=mode_reception,
            statut='en_attente_paiement'
        )

        offre.statut = 'convertie'
        offre.commande = commande
        offre.save()

        demande.commande = commande
        demande.statut = 'commande_creee'
        demande.save()

        OffreFournisseur.objects.filter(demande=demande).exclude(pk=offre.pk).update(statut='rejetee')

        _notifier_fournisseur_offre_acceptee(offre.fournisseur.user_id, demande.id, demande.reference)

        return Response({
            'commande_id': commande.id,
            'commande_reference': commande.reference,
            'offre_id': offre.id,
            'demande_reference': demande.reference
        }, status=status.HTTP_201_CREATED)


# -------------------------------------------------------
# Fournisseur - liste et détail des demandes ouvertes
# -------------------------------------------------------
class FournisseurDemandeListView(generics.ListAPIView):
    serializer_class = DemandePieceListSerializer
    permission_classes = [IsFournisseur]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['piece_recherchee', 'marque_vehicule', 'modele_vehicule', 'ville']
    ordering_fields = ['date_creation']
    ordering = ['-date_creation']

    def get_queryset(self):
        fournisseur = self.request.user.fournisseur
        # Demandes ouvertes auxquelles le fournisseur n'a pas encore répondu
        qs = DemandePiece.objects.filter(
            statut__in=['en_recherche', 'offres_recues']
        ).exclude(offres__fournisseur=fournisseur)

        # Filtre optionnel : ville
        ville = self.request.query_params.get('ville')
        if ville:
            qs = qs.filter(ville__icontains=ville)

        marque = self.request.query_params.get('marque')
        if marque:
            qs = qs.filter(marque_vehicule__icontains=marque)

        return qs


class FournisseurDemandeDetailView(generics.RetrieveAPIView):
    serializer_class = DemandePieceDetailSerializer
    permission_classes = [IsFournisseur]
    queryset = DemandePiece.objects.filter(statut__in=['en_recherche', 'offres_recues'])


# -------------------------------------------------------
# Fournisseur - répondre à une demande
# -------------------------------------------------------
class FournisseurOffreCreateView(views.APIView):
    permission_classes = [IsFournisseur]

    @transaction.atomic
    def post(self, request, pk):
        demande = get_object_or_404(
            DemandePiece,
            pk=pk,
            statut__in=['en_recherche', 'offres_recues']
        )

        fournisseur = request.user.fournisseur

        # Vérifier qu'on n'a pas déjà répondu
        if OffreFournisseur.objects.filter(demande=demande, fournisseur=fournisseur).exists():
            return Response(
                {'error': 'Vous avez déjà répondu à cette demande.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = OffreFournisseurCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        offre = OffreFournisseur.objects.create(
            demande=demande,
            fournisseur=fournisseur,
            **serializer.validated_data
        )

        if demande.statut == 'en_recherche':
            demande.statut = 'offres_recues'
            demande.save()

        if demande.client:
            _notifier_client_nouvelle_offre(demande.client.user_id, demande.id, demande.reference)

        return Response(
            OffreFournisseurSerializer(offre).data,
            status=status.HTTP_201_CREATED
        )


# -------------------------------------------------------
# Fournisseur - mes offres
# -------------------------------------------------------
class FournisseurOffreListView(generics.ListAPIView):
    serializer_class = OffreFournisseurSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        fournisseur = self.request.user.fournisseur
        return OffreFournisseur.objects.filter(
            fournisseur=fournisseur
        ).select_related('demande', 'fournisseur')


# -------------------------------------------------------
# Admin - suivi des demandes
# -------------------------------------------------------
class AdminDemandeListView(generics.ListAPIView):
    serializer_class = DemandePieceListSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['reference', 'piece_recherchee', 'marque_vehicule', 'client__user__email']
    ordering_fields = ['date_creation', 'statut']
    ordering = ['-date_creation']

    def get_queryset(self):
        return DemandePiece.objects.all().select_related('client__user')


class AdminDemandeDetailView(generics.RetrieveAPIView):
    serializer_class = DemandePieceDetailSerializer
    permission_classes = [IsAdmin]
    queryset = DemandePiece.objects.all().select_related('client__user')


class AdminDemandeActionView(views.APIView):
    """Action admin : changer le statut d'une demande."""
    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request, pk):
        demande = get_object_or_404(DemandePiece, pk=pk)
        nouveau = request.data.get('statut')

        if not nouveau:
            return Response({'error': 'Le champ statut est requis.'}, status=status.HTTP_400_BAD_REQUEST)

        if nouveau not in [c[0] for c in DemandePiece.STATUT_CHOICES]:
            return Response({'error': 'Statut invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        demande.statut = nouveau
        demande.save()

        return Response(DemandePieceDetailSerializer(demande).data)
