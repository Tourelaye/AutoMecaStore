from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Ticket, MessageSupport, Reclamation, Avis, SignalementAvis
from .serializers import (
    TicketSerializer, MessageSupportSerializer, ReclamationSerializer,
    ReclamationCreateSerializer, AvisSerializer, AvisCreateSerializer,
    SignalementAvisSerializer
)
from account.permissions import IsAdmin
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from fournisseur.models import creer_notification_fournisseur


# -----------------------------
# Ticket
# -----------------------------
class TicketCreateView(generics.CreateAPIView):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)


# -----------------------------
# Message
# -----------------------------
class MessageCreateView(generics.CreateAPIView):
    serializer_class = MessageSupportSerializer
    permission_classes = [permissions.IsAuthenticated]


# -----------------------------
# Réclamation
# -----------------------------
class ReclamationCreateView(generics.CreateAPIView):
    serializer_class = ReclamationCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save()


# -----------------------------
# Avis
# -----------------------------
class AvisCreateView(generics.CreateAPIView):
    serializer_class = AvisCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        avis = serializer.save()

        def notifier(fournisseur_id, nom_cible):
            if not fournisseur_id:
                return
            importance = 'danger' if avis.note <= 2 else 'info'
            creer_notification_fournisseur(
                fournisseur_id=fournisseur_id,
                type_notif='REVIEW_CREATED',
                titre='Nouvel avis',
                message=f"{nom_cible} a reçu un avis de {avis.note}/5.",
                lien='/fournisseur/avis',
                importance=importance,
                objet_type='Avis',
                objet_id=avis.id
            )

        if avis.produit and avis.produit.fournisseur_id:
            notifier(avis.produit.fournisseur_id, f"Votre produit « {avis.produit.nom} »")
        if avis.magasin and avis.magasin.fournisseur_id:
            notifier(avis.magasin.fournisseur_id, f"Votre magasin « {avis.magasin.nom_magasin} »")


# -----------------------------
# Admin - Gestion des avis
# -----------------------------
class AdminAvisListView(generics.ListAPIView):
    """
    Liste tous les avis pour l'administration
    """
    serializer_class = AvisSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['note', 'approuve']
    search_fields = ['client__user__nom', 'client__user__email', 'produit__nom']
    ordering_fields = ['date_creation', 'note']
    ordering = ['-date_creation']

    def get_queryset(self):
        return Avis.objects.all().select_related('client__user', 'produit')


class AdminAvisDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Détail, mise à jour et suppression d'un avis pour l'admin
    """
    serializer_class = AvisSerializer
    permission_classes = [IsAdmin]
    queryset = Avis.objects.all().select_related('client__user', 'produit')


class AdminAvisToggleApproveView(generics.UpdateAPIView):
    """
    Approuver/Désapprouver un avis
    """
    serializer_class = AvisSerializer
    permission_classes = [IsAdmin]
    queryset = Avis.objects.all()

    def patch(self, request, *args, **kwargs):
        avis = self.get_object()
        avis.approuve = not avis.approuve
        avis.save()
        return Response(AvisSerializer(avis).data)


# -----------------------------
# Admin - Gestion des réclamations
# -----------------------------
class AdminReclamationListView(generics.ListAPIView):
    """
    Liste toutes les réclamations pour l'administration
    """
    serializer_class = ReclamationSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut', 'type']
    search_fields = ['client__user__nom', 'client__user__email', 'titre']
    ordering_fields = ['date_creation', 'statut']
    ordering = ['-date_creation']

    def get_queryset(self):
        return Reclamation.objects.all().select_related('client__user')


class AdminReclamationDetailView(generics.RetrieveUpdateAPIView):
    """
    Détail et mise à jour d'une réclamation pour l'admin
    """
    serializer_class = ReclamationSerializer
    permission_classes = [IsAdmin]
    queryset = Reclamation.objects.all().select_related('client__user')


class AdminReclamationUpdateStatutView(generics.UpdateAPIView):
    """
    Mettre à jour le statut d'une réclamation
    """
    serializer_class = ReclamationSerializer
    permission_classes = [IsAdmin]
    queryset = Reclamation.objects.all()

    def patch(self, request, *args, **kwargs):
        reclamation = self.get_object()
        nouveau_statut = request.data.get("statut")
        reponse_admin = request.data.get("reponse_admin", "")

        if nouveau_statut:
            reclamation.statut = nouveau_statut

        if reponse_admin:
            reclamation.reponse_admin = reponse_admin

        reclamation.save()
        return Response(ReclamationSerializer(reclamation).data)


# ------------------------------
# Avis publics - liste par produit / magasin
# ------------------------------
class AvisProductListView(generics.ListAPIView):
    """Avis visibles d'un produit (public)."""
    serializer_class = AvisSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        produit_id = self.kwargs.get('produit_id')
        return Avis.objects.filter(
            produit_id=produit_id, approuve=True
        ).select_related('client__user', 'produit', 'magasin', 'commande').prefetch_related('signalements')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['client'] = getattr(self.request.user, 'client', None) if self.request.user.is_authenticated else None
        return ctx


class AvisMagasinListView(generics.ListAPIView):
    """Avis visibles d'un magasin (public)."""
    serializer_class = AvisSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        magasin_id = self.kwargs.get('magasin_id')
        return Avis.objects.filter(
            magasin_id=magasin_id, approuve=True
        ).select_related('client__user', 'produit', 'magasin', 'commande').prefetch_related('signalements')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['client'] = getattr(self.request.user, 'client', None) if self.request.user.is_authenticated else None
        return ctx


class ClientAvisListView(generics.ListAPIView):
    """Avis laissés par le client connecté."""
    serializer_class = AvisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        client = getattr(self.request.user, 'client', None)
        if not client:
            return Avis.objects.none()
        return Avis.objects.filter(client=client).select_related('produit', 'magasin', 'commande').prefetch_related('signalements')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['client'] = getattr(self.request.user, 'client', None)
        return ctx


# ------------------------------
# Signalement
# ------------------------------
class SignalementAvisCreateView(generics.CreateAPIView):
    """Client ou fournisseur peut signaler un avis."""
    serializer_class = SignalementAvisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        avis_id = self.kwargs.get('avis_id')
        avis = get_object_or_404(Avis, pk=avis_id)
        client = getattr(self.request.user, 'client', None)
        fournisseur = getattr(self.request.user, 'fournisseur', None)
        serializer.save(avis=avis, client=client, fournisseur=fournisseur)


# ------------------------------
# Admin - Signalements
# ------------------------------
class AdminSignalementAvisListView(generics.ListAPIView):
    """Liste des signalements d'avis pour modération."""
    serializer_class = SignalementAvisSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut', 'motif']
    ordering_fields = ['date', 'statut']
    ordering = ['-date']

    def get_queryset(self):
        return SignalementAvis.objects.all().select_related('avis', 'client__user', 'fournisseur__user')


class AdminSignalementAvisUpdateStatutView(APIView):
    """Admin: marquer un signalement comme traité ou rejeté."""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        statut = request.data.get('statut')
        if statut not in ['traite', 'rejete']:
            return Response({'error': 'Statut invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        signalement = get_object_or_404(SignalementAvis, pk=pk)
        signalement.statut = statut
        signalement.save()
        return Response(SignalementAvisSerializer(signalement).data)


class AdminAvisActionView(APIView):
    """Admin: conserver, masquer (approuve=False) ou supprimer un avis."""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        avis = get_object_or_404(Avis, pk=pk)
        action = request.data.get('action')
        if action == 'conserver':
            avis.approuve = True
            avis.save()
        elif action == 'masquer':
            avis.approuve = False
            avis.save()
        elif action == 'supprimer':
            avis.delete()
            return Response({'message': 'Avis supprimé.'}, status=status.HTTP_204_NO_CONTENT)
        else:
            return Response({'error': 'Action inconnue.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(AvisSerializer(avis).data)