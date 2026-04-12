from rest_framework import serializers
from .models import Categorie, Produit, ProduitFavoris

# -----------------------------
# Categorie
# -----------------------------
class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ['id', 'nom', 'description', 'datecreation', 'datemodification', 'etat', 'categorieid']


# -----------------------------
# Produit
# -----------------------------
class ProduitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produit
        fields = ['id', 'nom', 'description', 'prix', 'stock','image', 'categorie', 'gestionnaire_stock']


# -----------------------------
# ProduitFavoris
# -----------------------------
class ProduitFavorisSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduitFavoris
        fields = ['id', 'client', 'produit', 'date_ajout']
        read_only_fields = ['date_ajout']