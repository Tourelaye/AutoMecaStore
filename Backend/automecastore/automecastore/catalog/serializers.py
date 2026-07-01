from rest_framework import serializers

from .models import Categorie, Produit, ProduitFavoris, SousCategorie



# -----------------------------
# Categorie Serializer (simplifié pour ProduitSerializer)
# -----------------------------
class CategorieSimpleSerializer(serializers.ModelSerializer):
    """Serializer léger pour afficher la catégorie dans un produit"""
    class Meta:
        model = Categorie
        fields = ['id', 'nom']


# -----------------------------
# SousCategorie Serializer
# -----------------------------
class SousCategorieSerializer(serializers.ModelSerializer):
    """Serializer pour les sous-catégories (types de pièces)"""
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    
    class Meta:
        model = SousCategorie
        fields = ['id', 'nom', 'description', 'categorie', 'categorie_nom', 'etat']
        read_only_fields = ['datecreation', 'datemodification']


class SousCategorieSimpleSerializer(serializers.ModelSerializer):
    """Serializer léger pour afficher la sous-catégorie dans un produit"""
    class Meta:
        model = SousCategorie
        fields = ['id', 'nom']



# -----------------------------
# Categorie Serializer (complet avec nombre de produits)
# -----------------------------
class CategorieSerializer(serializers.ModelSerializer):
    nombre_produits = serializers.SerializerMethodField()
    
    class Meta:
        model = Categorie
        fields = ['id', 'nom', 'description', 'datecreation', 'datemodification', 'etat', 'categorieid', 'nombre_produits']
    
    def get_nombre_produits(self, obj):
        """Retourne le nombre de produits actifs dans cette catégorie"""
        from django.db.models import Q
        return obj.produits.filter(Q(is_active=True) | Q(is_active__isnull=True)).count()



# -----------------------------
# Produit Serializer
# -----------------------------
class ProduitSerializer(serializers.ModelSerializer):
    # En lecture : retourne l'objet catégorie complet
    categorie_detail = CategorieSimpleSerializer(source='categorie', read_only=True)
    # En lecture : juste le nom (pour compatibilité)
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    # En lecture : sous-catégorie
    sous_categorie_detail = SousCategorieSimpleSerializer(source='sous_categorie', read_only=True)
    sous_categorie_nom = serializers.CharField(source='sous_categorie.nom', read_only=True)
    # En lecture : URL complète de l'image
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Produit
        fields = [
            'id', 'nom', 'description', 'prix', 'stock', 'image', 'image_url',
            'categorie', 'categorie_detail', 'categorie_nom', 
            'sous_categorie', 'sous_categorie_detail', 'sous_categorie_nom',
            'gestionnaire_stock',
            'est_en_promo', 'prix_promo', 'date_fin_promo',
            'reference', 'marque', 'is_active', 'date_suppression'
        ]
        read_only_fields = ['date_suppression', 'categorie_detail', 'categorie_nom', 
                           'sous_categorie_detail', 'sous_categorie_nom', 'image_url']
    
    def get_image_url(self, obj):
        """Retourne l'URL complète de l'image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None





# -----------------------------

# ProduitFavoris

# -----------------------------

class ProduitFavorisSerializer(serializers.ModelSerializer):

    class Meta:

        model = ProduitFavoris

        fields = ['id', 'client', 'produit', 'date_ajout']

        read_only_fields = ['date_ajout']