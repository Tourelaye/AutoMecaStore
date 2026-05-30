from rest_framework import serializers

from .models import Categorie, Produit, ProduitFavoris



# -----------------------------
# Categorie Serializer (simplifié pour ProduitSerializer)
# -----------------------------
class CategorieSimpleSerializer(serializers.ModelSerializer):
    """Serializer léger pour afficher la catégorie dans un produit"""
    class Meta:
        model = Categorie
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
    # Image field - pour gérer l'upload correctement
    image = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = Produit
        fields = [
            'id', 'nom', 'description', 'prix', 'stock', 'image', 
            'categorie', 'categorie_detail', 'categorie_nom', 'gestionnaire_stock',
            'est_en_promo', 'prix_promo', 'date_fin_promo',
            'reference', 'marque', 'is_active', 'date_suppression'
        ]
        read_only_fields = ['date_suppression', 'categorie_detail', 'categorie_nom']
    
    def create(self, validated_data):
        """Assure que is_active est True par défaut lors de la création"""
        if 'is_active' not in validated_data:
            validated_data['is_active'] = True
        return super().create(validated_data)





# -----------------------------

# ProduitFavoris

# -----------------------------

class ProduitFavorisSerializer(serializers.ModelSerializer):

    class Meta:

        model = ProduitFavoris

        fields = ['id', 'client', 'produit', 'date_ajout']

        read_only_fields = ['date_ajout']