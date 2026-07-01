from rest_framework import serializers
from .models import Commande, LigneCommande, Panier, PanierItem
from catalog.serializers import ProduitSerializer
from catalog.models import Produit

# -----------------------------
# LigneCommande
# -----------------------------
class LigneCommandeSerializer(serializers.ModelSerializer):
    produit = ProduitSerializer(read_only=True)
    produit_id = serializers.PrimaryKeyRelatedField(queryset=Produit.objects.all(), source='produit', write_only=True)

    class Meta:
        model = LigneCommande
        fields = ['id', 'commande', 'produit', 'produit_id', 'quantite', 'prix_unitaire', 'sous_total']
        read_only_fields = ['prix_unitaire', 'sous_total']

    def validate_quantite(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être supérieure à 0")
        return value


# -----------------------------
# Commande
# -----------------------------
class CommandeSerializer(serializers.ModelSerializer):
    lignes = LigneCommandeSerializer(many=True, read_only=True)

    class Meta:
        model = Commande
        fields = [
            'id',
            'reference',
            'date_commande',
            'statut',
            'montant_total',
            'lignes'
        ]
        read_only_fields = [
            'reference',
            'date_commande',
            'montant_total',
            'lignes'
        ]
# -----------------------------
# Panier
# -----------------------------
class PanierItemSerializer(serializers.ModelSerializer):
    produit = ProduitSerializer(read_only=True)
    produit_id = serializers.PrimaryKeyRelatedField(queryset=Produit.objects.all(), source='produit', write_only=True)

    class Meta:
        model = PanierItem
        fields = ['id', 'panier', 'produit', 'produit_id', 'quantite']


class PanierSerializer(serializers.ModelSerializer):
    items = PanierItemSerializer(many=True, read_only=True)

    class Meta:
        model = Panier
        fields = ['id', 'nom_panier', 'client', 'invite', 'items']