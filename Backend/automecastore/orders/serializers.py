from rest_framework import serializers
from .models import Commande, LigneCommande, Panier, PanierItem, HistoriqueCommande
from account.models import Client, Fournisseur
from catalog.models import Produit, FournisseurProduit
from catalog.serializers import ProduitSerializer
from payments.serializers import PaiementSerializer
from fournisseur.models import Magasin
from fournisseur.serializers import MagasinSerializer
from delivery.models import Livraison
from delivery.serializers import LivraisonSerializer


# -----------------------------
# Client
# -----------------------------
class ClientSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='user.id', read_only=True)
    nom = serializers.CharField(source='user.nom', read_only=True)
    prenom = serializers.CharField(source='user.prenom', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    telephone = serializers.CharField(source='user.telephone', read_only=True)
    adresse = serializers.CharField(source='user.adresse', read_only=True)

    class Meta:
        model = Client
        fields = ['id', 'nom', 'prenom', 'email', 'telephone', 'adresse']


# -----------------------------
# LigneCommande
# -----------------------------
class FournisseurMinSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='user_id', read_only=True)
    nom = serializers.CharField(source='nom_entreprise', read_only=True)

    class Meta:
        model = Fournisseur
        fields = ['id', 'nom']


class LigneCommandeSerializer(serializers.ModelSerializer):
    produit = ProduitSerializer(read_only=True)
    produit_id = serializers.PrimaryKeyRelatedField(queryset=Produit.objects.all(), source='produit', write_only=True)
    fournisseur = FournisseurMinSerializer(read_only=True)
    fournisseur_id = serializers.PrimaryKeyRelatedField(queryset=Fournisseur.objects.all(), source='fournisseur', write_only=True, required=False, allow_null=True)
    magasin = MagasinSerializer(read_only=True)
    magasin_id = serializers.PrimaryKeyRelatedField(queryset=Magasin.objects.all(), source='magasin', write_only=True, required=False, allow_null=True)

    class Meta:
        model = LigneCommande
        fields = [
            'id', 'commande', 'produit', 'produit_id', 'fournisseur', 'fournisseur_id',
            'magasin', 'magasin_id', 'quantite', 'prix_unitaire', 'sous_total', 'mode_reception', 'statut'
        ]
        read_only_fields = ['prix_unitaire', 'sous_total', 'fournisseur', 'magasin']

    def validate_quantite(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être supérieure à 0")
        return value


# -----------------------------
# Historique
# -----------------------------
class HistoriqueCommandeSerializer(serializers.ModelSerializer):
    utilisateur = serializers.SerializerMethodField()

    class Meta:
        model = HistoriqueCommande
        fields = ['id', 'statut', 'commentaire', 'motif', 'utilisateur', 'date']

    def get_utilisateur(self, obj):
        if obj.utilisateur:
            return f"{obj.utilisateur.prenom or ''} {obj.utilisateur.nom or ''}".strip()
        return obj.utilisateur_nom or 'Système'


# -----------------------------
# Commande
# -----------------------------
class CommandeSerializer(serializers.ModelSerializer):
    lignes = serializers.SerializerMethodField()
    client = ClientSerializer(read_only=True)
    historique = HistoriqueCommandeSerializer(many=True, read_only=True)
    livraisons = LivraisonSerializer(many=True, read_only=True)
    paiements = PaiementSerializer(many=True, read_only=True)

    class Meta:
        model = Commande
        fields = [
            'id',
            'reference',
            'date_commande',
            'statut',
            'montant_total',
            'frais_livraison',
            'mode_paiement',
            'mode_reception',
            'adresse_livraison',
            'telephone_client',
            'commentaire_fournisseur',
            'client',
            'lignes',
            'historique',
            'livraisons',
            'paiements'
        ]
        read_only_fields = [
            'reference',
            'date_commande',
            'montant_total',
            'lignes',
            'historique',
            'client',
            'livraisons',
            'paiements'
        ]

    def get_lignes(self, obj):
        request = self.context.get('request')
        fournisseur_id = self.context.get('fournisseur_id')
        if not fournisseur_id and request and hasattr(request.user, 'fournisseur'):
            fournisseur_id = request.user.fournisseur.pk

        qs = obj.lignes.all()
        if fournisseur_id:
            qs = qs.filter(fournisseur_id=fournisseur_id)
        return LigneCommandeSerializer(qs, many=True, context=self.context).data
# -----------------------------
# Panier
# -----------------------------
class PanierItemSerializer(serializers.ModelSerializer):
    produit = ProduitSerializer(read_only=True)

    produit_id = serializers.IntegerField(source='produit.id', read_only=True)
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    fournisseur_id = serializers.IntegerField(source='fournisseur.id', read_only=True)
    magasin_id = serializers.IntegerField(source='magasin.id', read_only=True)
    image = serializers.SerializerMethodField()
    prix = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    sous_total = serializers.SerializerMethodField()
    fournisseur_nom = serializers.SerializerMethodField()
    magasin_nom = serializers.SerializerMethodField()

    class Meta:
        model = PanierItem
        fields = [
            'id', 'panier', 'produit', 'produit_id', 'produit_nom', 'image', 'prix', 'stock',
            'sous_total', 'fournisseur', 'fournisseur_id', 'fournisseur_nom',
            'magasin', 'magasin_id', 'magasin_nom', 'quantite', 'mode_reception'
        ]
        read_only_fields = ['produit', 'fournisseur', 'magasin', 'produit_id', 'produit_nom', 'fournisseur_id', 'magasin_id', 'image', 'prix', 'stock', 'sous_total', 'fournisseur_nom', 'magasin_nom']

    def _offre(self, obj):
        fournisseur = obj.fournisseur
        if not fournisseur and obj.magasin:
            fournisseur = obj.magasin.fournisseur
        if not fournisseur:
            return None
        try:
            catalog_f = fournisseur.user.catalog_fournisseurs.first() if fournisseur.user else None
            if not catalog_f:
                return None
            return FournisseurProduit.objects.filter(produit=obj.produit, fournisseur=catalog_f).first()
        except Exception:
            return None

    def get_prix(self, obj):
        offre = self._offre(obj)
        if offre and offre.prix_vente is not None:
            return float(offre.prix_vente)
        return float(obj.produit.prix) if obj.produit else 0

    def get_stock(self, obj):
        offre = self._offre(obj)
        if offre and offre.stock_disponible is not None:
            return int(offre.stock_disponible)
        return int(obj.produit.stock) if obj.produit else 0

    def get_sous_total(self, obj):
        return round(self.get_prix(obj) * obj.quantite, 2)

    def get_image(self, obj):
        if obj.produit and obj.produit.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.produit.image.url)
            return f"{settings.MEDIA_URL}{obj.produit.image}"
        return None

    def get_fournisseur_nom(self, obj):
        if obj.fournisseur and obj.fournisseur.nom_entreprise:
            return obj.fournisseur.nom_entreprise
        if obj.magasin and obj.magasin.fournisseur:
            return obj.magasin.fournisseur.nom_entreprise
        return None

    def get_magasin_nom(self, obj):
        if obj.magasin:
            return obj.magasin.nom_magasin
        return None


class PanierSerializer(serializers.ModelSerializer):
    items = PanierItemSerializer(many=True, read_only=True)

    class Meta:
        model = Panier
        fields = ['id', 'nom_panier', 'client', 'invite', 'items']