from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Ticket, MessageSupport, Reclamation, Avis
from .serializers import TicketSerializer, MessageSupportSerializer, ReclamationSerializer, AvisSerializer
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
    serializer_class = ReclamationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)


# -----------------------------
# Avis
# -----------------------------
class AvisCreateView(generics.CreateAPIView):
    serializer_class = AvisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        super().perform_create(serializer)
        avis = serializer.instance
        if avis.produit and avis.produit.fournisseur_id:
            creer_notification_fournisseur(
                fournisseur_id=avis.produit.fournisseur_id,
                type_notif='avis',
                titre='Nouvel avis',
                message=f"Votre produit « {avis.produit.nom} » a reçu un avis de {avis.note}/5.",
                lien='/fournisseur/avis'
            )


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