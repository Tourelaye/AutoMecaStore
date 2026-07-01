from rest_framework import serializers
from django.conf import settings

from .models import Categorie, Produit, ProduitFavoris, TypePiece, Livraison



# -----------------------------
# TypePiece Serializer
# -----------------------------
class TypePieceSerializer(serializers.ModelSerializer):
    """Serializer pour TypePiece"""
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)

    class Meta:
        model = TypePiece
        fields = ['id', 'nom', 'description', 'categorie', 'categorie_nom', 'datecreation', 'datemodification', 'etat']


class TypePieceSimpleSerializer(serializers.ModelSerializer):
    """Serializer léger pour afficher le type de pièce dans un produit"""
    class Meta:
        model = TypePiece
        fields = ['id', 'nom']


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
    # En lecture : retourne l'objet type de pièce complet
    type_piece_detail = TypePieceSimpleSerializer(source='type_piece', read_only=True)
    # En lecture : juste le nom du type de pièce (pour compatibilité)
    type_piece_nom = serializers.CharField(source='type_piece.nom', read_only=True)
    # Image field - pour l'upload (écriture)
    image = serializers.ImageField(required=False, allow_null=True)
    image_2 = serializers.ImageField(required=False, allow_null=True)
    image_3 = serializers.ImageField(required=False, allow_null=True)
    image_4 = serializers.ImageField(required=False, allow_null=True)
    # Image URLs complètes (lecture seule)
    image_url = serializers.SerializerMethodField()
    image_2_url = serializers.SerializerMethodField()
    image_3_url = serializers.SerializerMethodField()
    image_4_url = serializers.SerializerMethodField()
    # is_active - gérer la conversion depuis FormData
    is_active = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = Produit
        fields = [
            'id', 'nom', 'description', 'prix', 'stock',
            'image', 'image_2', 'image_3', 'image_4',
            'image_url', 'image_2_url', 'image_3_url', 'image_4_url',
            'categorie', 'categorie_detail', 'categorie_nom',
            'type_piece', 'type_piece_detail', 'type_piece_nom',
            'gestionnaire_stock',
            'est_en_promo', 'prix_promo', 'pourcentage_reduction',
            'date_debut_promo', 'date_fin_promo',
            'vente_eclair', 'heure_debut_eclair', 'heure_fin_eclair',
            'est_vedette', 'est_tendance', 'est_recommande', 'est_bestseller',
            'nombre_vues', 'nombre_favoris', 'nombre_ventes',
            'reference', 'marque', 'is_active', 'date_suppression'
        ]
        read_only_fields = ['date_suppression', 'categorie_detail', 'categorie_nom', 'type_piece_detail', 'type_piece_nom', 'image_url', 'image_2_url', 'image_3_url', 'image_4_url', 'nombre_vues', 'nombre_favoris', 'nombre_ventes']
        extra_kwargs = {
            'is_active': {'default': True}
        }

    def get_image_url(self, obj):
        """Retourne l'URL complète de l'image ou null"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return f"{settings.MEDIA_URL}{obj.image}"
        return None

    def get_image_2_url(self, obj):
        """Retourne l'URL complète de l'image_2 ou null"""
        if obj.image_2:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_2.url)
            return f"{settings.MEDIA_URL}{obj.image_2}"
        return None

    def get_image_3_url(self, obj):
        """Retourne l'URL complète de l'image_3 ou null"""
        if obj.image_3:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_3.url)
            return f"{settings.MEDIA_URL}{obj.image_3}"
        return None

    def get_image_4_url(self, obj):
        """Retourne l'URL complète de l'image_4 ou null"""
        if obj.image_4:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_4.url)
            return f"{settings.MEDIA_URL}{obj.image_4}"
        return None

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


# -----------------------------
# Livraison Serializer
# -----------------------------
class LivraisonSerializer(serializers.ModelSerializer):
    """Serializer pour Livraison"""
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = Livraison
        fields = [
            'id',
            'commande_id',
            'client',
            'adresse',
            'statut',
            'statut_label',
            'transporteur',
            'tracking',
            'date_creation',
            'date_livraison'
        ]
        read_only_fields = ['date_creation']