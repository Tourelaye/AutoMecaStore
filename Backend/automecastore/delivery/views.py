from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.utils import timezone
from .models import Livraison, Adresse
from .serializers import LivraisonSerializer, AdresseSerializer
from orders.models import Commande
from account.permissions import IsAdmin
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters


# -----------------------------
# Ajouter adresse
# -----------------------------
class AdresseCreateView(generics.CreateAPIView):
    serializer_class = AdresseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)


# -----------------------------
# Créer livraison depuis commande
# -----------------------------
class CreerLivraisonView(generics.CreateAPIView):
    serializer_class = LivraisonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):

        commande_id = request.data.get("commande")
        adresse_id = request.data.get("adresse")

        try:
            commande = Commande.objects.get(id=commande_id)
        except Commande.DoesNotExist:
            return Response({"error": "Commande introuvable"}, status=404)

        if hasattr(commande, "livraison"):
            return Response({"error": "Livraison déjà créée"}, status=400)

        livraison = Livraison.objects.create(
            commande=commande,
            client=commande.client,
            adresse_id=adresse_id,
            frais_livraison=5000  # exemple fixe
        )

        # Mise à jour statut commande
        commande.statut = "en_cours"
        commande.save()

        return Response(LivraisonSerializer(livraison).data)


# -----------------------------
# Mettre à jour statut livraison
# -----------------------------
class UpdateStatutLivraisonView(generics.UpdateAPIView):
    queryset = Livraison.objects.all()
    serializer_class = LivraisonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        livraison = self.get_object()
        nouveau_statut = request.data.get("statut")

        livraison.statut = nouveau_statut

        if nouveau_statut == "LIVREE":
            livraison.date_livraison = timezone.now()
            livraison.commande.statut = "livre"
            livraison.commande.save()

        livraison.save()
        return Response(LivraisonSerializer(livraison).data)


# -----------------------------
# Admin - Gestion des livraisons
# -----------------------------
class AdminLivraisonListView(generics.ListAPIView):
    """
    Liste toutes les livraisons pour l'administration
    """
    serializer_class = LivraisonSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut']
    search_fields = ['commande__reference', 'client__user__nom', 'client__user__email']
    ordering_fields = ['date_creation', 'date_livraison']
    ordering = ['-date_creation']

    def get_queryset(self):
        return Livraison.objects.all().select_related('commande', 'client__user', 'adresse')


class AdminLivraisonDetailView(generics.RetrieveUpdateAPIView):
    """
    Détail et mise à jour d'une livraison pour l'admin
    """
    serializer_class = LivraisonSerializer
    permission_classes = [IsAdmin]
    queryset = Livraison.objects.all().select_related('commande', 'client__user', 'adresse')


class AdminLivraisonUpdateStatutView(generics.UpdateAPIView):
    """
    Mettre à jour le statut d'une livraison (admin)
    """
    serializer_class = LivraisonSerializer
    permission_classes = [IsAdmin]
    queryset = Livraison.objects.all()

    def patch(self, request, *args, **kwargs):
        livraison = self.get_object()
        nouveau_statut = request.data.get("statut")

        if nouveau_statut:
            livraison.statut = nouveau_statut

            if nouveau_statut == "LIVREE":
                livraison.date_livraison = timezone.now()
                livraison.commande.statut = "livre"
                livraison.commande.save()

            livraison.save()

        return Response(LivraisonSerializer(livraison).data)