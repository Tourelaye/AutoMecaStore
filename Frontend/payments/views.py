from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.db import transaction
from .models import Paiement
from .serializers import PaiementSerializer
from orders.models import Commande


# -----------------------------
# Créer paiement (simulation)
# -----------------------------
class CreerPaiementView(generics.CreateAPIView):
    serializer_class = PaiementSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):

        commande_id = request.data.get("commande")
        type_paiement = request.data.get("type")

        try:
            commande = Commande.objects.get(id=commande_id)
        except Commande.DoesNotExist:
            return Response({"error": "Commande introuvable"}, status=404)

        if hasattr(commande, "paiement"):
            return Response({"error": "Paiement déjà effectué"}, status=400)

        paiement = Paiement.objects.create(
            commande=commande,
            client=commande.client,
            type=type_paiement,
            montant=commande.montant_total
        )

        # 🔥 Simulation paiement automatique
        # Ici on simule un succès
        paiement.statut = "CONFIRME"
        paiement.save()

        # Mise à jour statut commande
        commande.statut = "paye"
        commande.save()

        return Response(
            PaiementSerializer(paiement).data,
            status=status.HTTP_201_CREATED
        )