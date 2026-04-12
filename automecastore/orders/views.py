from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.db import transaction
from .models import Commande, LigneCommande, Panier, PanierItem
from .serializers import CommandeSerializer, LigneCommandeSerializer, PanierSerializer, PanierItemSerializer
from catalog.models import Produit


# -----------------------------
# Panier
# -----------------------------
class PanierView(generics.RetrieveAPIView):
    serializer_class = PanierSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        panier, _ = Panier.objects.get_or_create(client=self.request.user.client)
        return panier


# -----------------------------
# Ajouter au panier
# -----------------------------
class AjouterAuPanierView(generics.CreateAPIView):
    serializer_class = PanierItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        panier, _ = Panier.objects.get_or_create(client=request.user.client)

        produit_id = request.data.get('produit_id')
        quantite = int(request.data.get('quantite', 1))

        if quantite <= 0:
            return Response(
                {"error": "Quantité invalide"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            produit = Produit.objects.get(id=produit_id)
        except Produit.DoesNotExist:
            return Response(
                {"error": "Produit introuvable"},
                status=status.HTTP_404_NOT_FOUND
            )

        if produit.stock < quantite:
            return Response(
                {"error": "Stock insuffisant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        item, created = PanierItem.objects.get_or_create(
            panier=panier,
            produit=produit
        )

        if not created:
            item.quantite += quantite
        else:
            item.quantite = quantite

        item.save()

        return Response(PanierSerializer(panier).data)


# -----------------------------
# Commande
# -----------------------------
class CommandeCreateView(generics.CreateAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)


# -----------------------------
# Ligne commande
# -----------------------------
class LigneCommandeCreateView(generics.CreateAPIView):
    serializer_class = LigneCommandeSerializer
    permission_classes = [permissions.IsAuthenticated]


# -----------------------------
# Créer commande depuis panier
# -----------------------------
class CreerCommandeDepuisPanierView(generics.CreateAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):

        try:
            panier = Panier.objects.get(client=request.user.client)
        except Panier.DoesNotExist:
            return Response(
                {"error": "Panier introuvable"},
                status=status.HTTP_404_NOT_FOUND
            )

        if not panier.items.exists():
            return Response(
                {"error": "Panier vide"},
                status=status.HTTP_400_BAD_REQUEST
            )

        commande = Commande.objects.create(client=request.user.client)

        for item in panier.items.all():

            produit = item.produit

            if produit.stock < item.quantite:
                return Response(
                    {"error": f"Stock insuffisant pour {produit.nom}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            LigneCommande.objects.create(
                commande=commande,
                produit=produit,
                quantite=item.quantite
            )

            # 🔻 Déduction stock
            produit.stock -= item.quantite
            produit.save()

        # 🧹 Vider panier
        panier.items.all().delete()

        return Response(
            CommandeSerializer(commande).data,
            status=status.HTTP_201_CREATED
        )