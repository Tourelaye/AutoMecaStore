from rest_framework import serializers
from django.conf import settings
from django.db.models import Avg, Count
from django.apps import apps
from django.utils import timezone
from datetime import timedelta

from .models import Categorie, Marque, Produit, ProduitFavoris, FournisseurProduit, TypePiece, Livraison, Promotion, MouvementStock, DemandePiece
from account.models import Fournisseur, VehiculeClient
from fournisseur.models import Magasin
from support.models import Avis


def _norm(s):
    return (s or '').strip().lower()


def evaluer_compatibilite(produit, vehicule):
    """
    Évalue la compatibilité d'un produit avec un véhicule client.
    Retourne un dict avec 'statut' dans ('compatible', 'non_compatible', 'a_verifier') et 'motif'.
    """
    if not vehicule:
        return None

    vm = _norm(vehicule.get('marque'))
    vmo = _norm(vehicule.get('modele'))
    va = vehicule.get('annee')
    if isinstance(va, str):
        try:
            va = int(va)
        except (ValueError, TypeError):
            va = None
    vmotor = _norm(vehicule.get('motorisation'))
    vversion = _norm(vehicule.get('version'))

    compatibilites = produit.compatibilites or []
    modeles_compatibles = produit.modeles_compatibles or []

    if not compatibilites and not modeles_compatibles and not (produit.annee_debut and produit.annee_fin):
        return {'statut': 'a_verifier', 'motif': 'Aucune information de compatibilité'}

    # Vérification détaillée via compatibilites (JSON)
    for c in compatibilites:
        if not isinstance(c, dict):
            continue
        cm = _norm(c.get('marque'))
        cmo = _norm(c.get('modele'))

        # Si marque/modèle spécifiés et différents, ce n'est pas cette entrée
        if cm and cm != vm:
            continue
        if cmo and cmo != vmo:
            continue

        # Marque et/ou modèle correspondent (ou non spécifiés)
        annee_debut = c.get('annee_debut')
        annee_fin = c.get('annee_fin') or annee_debut
        if va is not None and annee_debut is not None:
            try:
                debut = int(annee_debut)
                fin = int(annee_fin) if annee_fin is not None else debut
                if not (debut <= va <= fin):
                    return {'statut': 'non_compatible', 'motif': 'Année incompatible'}
            except (ValueError, TypeError):
                pass

        if vmotor and c.get('motorisation'):
            if _norm(c.get('motorisation')) != vmotor:
                return {'statut': 'non_compatible', 'motif': 'Motorisation incompatible'}

        if vversion and c.get('version'):
            if _norm(c.get('version')) != vversion:
                return {'statut': 'non_compatible', 'motif': 'Version incompatible'}

        # Si marque/modèle OK mais absence d'année précise => ne pas garantir
        if va is not None and annee_debut is None:
            return {'statut': 'a_verifier', 'motif': 'Marque/modèle OK — année non précisée'}

        return {'statut': 'compatible'}

    # Vérification via modeles_compatibles + annee_debut/fin
    if vmo and modeles_compatibles:
        if any(_norm(m) == vmo for m in modeles_compatibles):
            if va and produit.annee_debut and produit.annee_fin:
                if not (produit.annee_debut <= va <= produit.annee_fin):
                    return {'statut': 'non_compatible', 'motif': 'Année incompatible'}
            if va and not (produit.annee_debut or produit.annee_fin):
                return {'statut': 'a_verifier', 'motif': 'Modèle OK — année non précisée'}
            return {'statut': 'compatible'}

    if compatibilites or modeles_compatibles:
        return {'statut': 'non_compatible', 'motif': 'Marque/modèle non correspondant'}

    return {'statut': 'a_verifier', 'motif': 'Informations insuffisantes'}


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
        fields = ['id', 'nom', 'description', 'datecreation', 'datemodification', 'etat', 'categorieid', 'ordre', 'nombre_produits']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['etat'] = 'actif' if data.get('etat') else 'inactif'
        return data

    def to_internal_value(self, data):
        if 'etat' in data and isinstance(data.get('etat'), str):
            data['etat'] = data['etat'] == 'actif'
        return super().to_internal_value(data)

    def get_nombre_produits(self, obj):
        """Retourne le nombre de produits actifs dans cette catégorie"""
        from django.db.models import Q
        return obj.produits.filter(Q(is_active=True) | Q(is_active__isnull=True)).count()


class MarqueSerializer(serializers.ModelSerializer):
    nombre_produits = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Marque
        fields = ['id', 'nom', 'description', 'logo', 'logo_url', 'est_visible', 'ordre', 'datecreation', 'datemodification', 'nombre_produits']

    def get_nombre_produits(self, obj):
        from django.db.models import Q
        return Produit.objects.filter(Q(is_active=True) | Q(is_active__isnull=True), marque=obj.nom).count()

    def get_logo_url(self, obj):
        if obj.logo:
            return obj.logo.url
        return None



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
    # Nombre de magasins proposant ce produit
    nombre_magasins = serializers.SerializerMethodField()

    # Nouveauté (lecture seule)
    is_new = serializers.SerializerMethodField()

    # Stock
    statut_stock = serializers.SerializerMethodField()
    date_derniere_maj_stock = serializers.DateTimeField(read_only=True)

    # Compatibilité avec le véhicule actif
    compatibilite_vehicule = serializers.SerializerMethodField()

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
            'est_vedette', 'est_tendance', 'est_recommande', 'est_bestseller', 'est_meilleure_offre',
            'nombre_vues', 'nombre_favoris', 'nombre_ventes',
            'reference', 'marque', 'fabricant', 'is_active', 'date_suppression',
            # Avis
            'note_moyenne', 'nombre_avis', 'nombre_magasins',
            # Compatibilité
            'modeles_compatibles', 'annee_debut', 'annee_fin', 'compatibilites',
            # Informations techniques
            'etat', 'garantie_mois', 'garantie_disponible', 'conditions_garantie',
            'pays_origine', 'reference_oem',
            'poids', 'longueur', 'largeur', 'hauteur', 'matiere', 'couleur',
            # Stock
            'disponibilite', 'delai_livraison', 'seuil_alerte', 'quantite_min',
            # Livraison
            'livraison_disponible', 'retrait_magasin', 'delai_preparation',
            # Complémentaires
            'description_courte', 'description_detaillee', 'precautions',
            'mots_cles', 'conseils_installation', 'conditions_retour',
            # Images
            'image_principale_index',
            # Nouveauté
            'date_ajout', 'is_new',
            # Stock avancé
            'date_derniere_maj_stock', 'statut_stock',
            # Compatibilité dynamique
            'compatibilite_vehicule'
        ]
        read_only_fields = ['date_suppression', 'categorie_detail', 'categorie_nom', 'type_piece_detail', 'type_piece_nom', 'image_url', 'image_2_url', 'image_3_url', 'image_4_url', 'nombre_vues', 'nombre_favoris', 'nombre_ventes', 'note_moyenne', 'nombre_avis', 'nombre_magasins', 'date_ajout', 'is_new', 'date_derniere_maj_stock', 'statut_stock', 'compatibilite_vehicule']
        extra_kwargs = {
            'is_active': {'default': True}
        }

    def _parse_json_list(self, value):
        """Parse une chaîne JSON en liste/objet si nécessaire."""
        import json
        if value is None:
            return []
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                return []
        return value if isinstance(value, (list, dict)) else []

    def validate_compatibilites(self, value):
        return self._parse_json_list(value)

    def validate_mots_cles(self, value):
        return self._parse_json_list(value)

    def validate_modeles_compatibles(self, value):
        return self._parse_json_list(value)

    def validate(self, data):
        annee_debut = data.get('annee_debut')
        annee_fin = data.get('annee_fin')
        if annee_debut and annee_fin and annee_fin < annee_debut:
            raise serializers.ValidationError({'annee_fin': "L'année de fin doit être supérieure ou égale à l'année de début."})

        stock = data.get('stock', 0)
        quantite_min = data.get('quantite_min') or 0
        if quantite_min > stock:
            raise serializers.ValidationError({'quantite_min': "La quantité minimale ne peut pas dépasser le stock actuel."})

        # Ajustement automatique de la disponibilité selon le stock
        if stock == 0:
            data['disponibilite'] = 'rupture'
        elif stock <= (data.get('seuil_alerte') or 10):
            data['disponibilite'] = 'faible_stock'
        else:
            data['disponibilite'] = 'en_stock'

        return data

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

    def _get_avis_qs(self, obj):
        Avis = apps.get_model('support', 'Avis')
        return Avis.objects.filter(produit=obj)

    def get_nombre_avis(self, obj):
        """Retourne le nombre d'avis clients approuvés"""
        return self._get_avis_qs(obj).count()

    def get_nombre_magasins(self, obj):
        """Retourne le nombre de magasins proposant ce produit."""
        # FournisseurProduit.fournisseur est catalog.Fournisseur,
        # tandis que Produit.fournisseur est account.Fournisseur : on ne peut pas les exclure directement.
        return FournisseurProduit.objects.filter(produit=obj).count() + (1 if obj.fournisseur else 0)

    def get_note_moyenne(self, obj):
        """Retourne la note moyenne arrondie à 1 décimale (0 si pas d'avis)"""
        result = self._get_avis_qs(obj).aggregate(avg_note=Avg('note'), total=Count('id'))
        if not result or result.get('total', 0) == 0:
            return 0
        return round(float(result['avg_note']), 1)

    def get_is_new(self, obj):
        """Retourne True si le produit a été ajouté il y a moins de 30 jours"""
        if not obj.date_ajout:
            return False
        return (timezone.now() - obj.date_ajout) <= timedelta(days=30)

    def get_statut_stock(self, obj):
        """Retourne le statut du stock en fonction de la quantité et du seuil"""
        stock = obj.stock or 0
        seuil = obj.seuil_alerte if obj.seuil_alerte is not None else 5
        if stock == 0:
            return 'rupture'
        if stock <= seuil:
            return 'faible'
        return 'en_stock'

    def get_compatibilite_vehicule(self, obj):
        vehicule = self.context.get('vehicule')
        if not vehicule:
            return None
        return evaluer_compatibilite(obj, vehicule)

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


# -----------------------------
# Promotion Serializer
# -----------------------------
class PromotionSerializer(serializers.ModelSerializer):
    fournisseur_nom = serializers.CharField(source='fournisseur.nom_entreprise', read_only=True)
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    produit = serializers.PrimaryKeyRelatedField(queryset=Produit.objects.all(), required=False, allow_null=True)
    fournisseur = serializers.PrimaryKeyRelatedField(read_only=True)

    type_promotion_label = serializers.CharField(source='get_type_promotion_display', read_only=True)
    statut = serializers.SerializerMethodField()
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)

    prix_original = serializers.SerializerMethodField()
    prix_promo = serializers.SerializerMethodField()

    date_debut = serializers.DateTimeField(
        input_formats=['%Y-%m-%dT%H:%M', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d']
    )
    date_fin = serializers.DateTimeField(
        input_formats=['%Y-%m-%dT%H:%M', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d']
    )
    heure_debut = serializers.TimeField(input_formats=['%H:%M'], required=False, allow_null=True)
    heure_fin = serializers.TimeField(input_formats=['%H:%M'], required=False, allow_null=True)

    class Meta:
        model = Promotion
        fields = [
            'id', 'fournisseur', 'fournisseur_nom', 'produit', 'produit_nom',
            'nom', 'description', 'type_promotion', 'type_promotion_label',
            'pourcentage', 'valeur_reduction',
            'date_debut', 'heure_debut', 'date_fin', 'heure_fin',
            'quantite_min', 'nombre_max_utilisations', 'nb_utilisations',
            'is_active', 'statut', 'statut_label', 'created_at',
            'prix_original', 'prix_promo'
        ]
        read_only_fields = [
            'fournisseur', 'fournisseur_nom', 'produit_nom', 'nb_utilisations',
            'statut', 'statut_label', 'created_at', 'prix_original', 'prix_promo'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._instance = kwargs.get('instance')

    def get_statut(self, obj):
        from django.utils import timezone
        now = timezone.now()
        if not obj.is_active:
            return 'suspendue'
        if now < obj.date_debut:
            return 'a_venir'
        if now > obj.date_fin:
            return 'terminee'
        return 'active'

    def get_prix_original(self, obj):
        if obj.produit:
            return str(obj.produit.prix)
        return None

    def get_prix_promo(self, obj):
        return self._calculer_prix_promo(obj)

    @staticmethod
    def _calculer_prix_promo(promotion):
        from decimal import Decimal
        produit = promotion.produit
        if not produit:
            return None

        prix = produit.prix
        type_promo = promotion.type_promotion

        if type_promo in ('produit_vedette', 'nouveau_produit', 'dernieres_pieces'):
            return str(prix)

        if type_promo == 'montant_fixe' and promotion.valeur_reduction:
            prix_promo = max(Decimal('0'), prix - promotion.valeur_reduction)
            return str(prix_promo.quantize(Decimal('0.01')))

        if promotion.pourcentage:
            reduction = Decimal(str(promotion.pourcentage)) / Decimal('100')
            prix_promo = prix * (Decimal('1') - reduction)
            return str(prix_promo.quantize(Decimal('0.01')))

        return str(prix)

    def validate(self, data):
        from decimal import Decimal
        from django.utils import timezone

        data = super().validate(data)

        # Combine date + heure si les deux sont fournies
        if data.get('heure_debut') and data.get('date_debut'):
            h = data['heure_debut']
            data['date_debut'] = data['date_debut'].replace(hour=h.hour, minute=h.minute, second=0, microsecond=0)
        if data.get('heure_fin') and data.get('date_fin'):
            h = data['heure_fin']
            data['date_fin'] = data['date_fin'].replace(hour=h.hour, minute=h.minute, second=0, microsecond=0)

        produit = data.get('produit')
        type_promo = data.get('type_promotion')
        prix = produit.prix if produit else Decimal('0')

        # Validation des valeurs de réduction
        discount_types = ('pourcentage', 'montant_fixe', 'vente_flash', 'offre_speciale')
        if type_promo in discount_types:
            if type_promo == 'montant_fixe':
                valeur = data.get('valeur_reduction')
                if valeur is None or valeur <= 0:
                    raise serializers.ValidationError({'valeur_reduction': 'Le montant de réduction est requis.'})
                if valeur > prix:
                    raise serializers.ValidationError({'valeur_reduction': 'La réduction ne peut pas dépasser le prix du produit.'})
            else:
                pct = data.get('pourcentage')
                if pct is None or pct <= 0 or pct > 100:
                    raise serializers.ValidationError({'pourcentage': 'Le pourcentage doit être compris entre 1 et 100.'})

        if data['date_fin'] <= data['date_debut']:
            raise serializers.ValidationError({'date_fin': "La date de fin doit être postérieure à la date de début."})

        if data['date_debut'] < timezone.now() and not (self._instance and self._instance.pk):
            # Optionnel : empêcher la création rétroactive
            pass

        # Conflit avec une autre promotion du produit
        if produit:
            qs = Promotion.objects.filter(produit=produit, is_active=True)
            if self._instance and self._instance.pk:
                qs = qs.exclude(pk=self._instance.pk)
            for promo in qs:
                if data['date_debut'] <= promo.date_fin and promo.date_debut <= data['date_fin']:
                    raise serializers.ValidationError(
                        {'produit': 'Ce produit a déjà une promotion active ou planifiée sur cette période.'}
                    )

        # Contrôle d'accès produit
        request = self.context.get('request')
        if request and hasattr(request.user, 'fournisseur'):
            if produit and produit.fournisseur != request.user.fournisseur:
                raise serializers.ValidationError({'produit': 'Produit non autorisé pour ce fournisseur.'})

        return data

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request.user, 'fournisseur'):
            validated_data['fournisseur'] = request.user.fournisseur
        else:
            raise serializers.ValidationError({'fournisseur': 'Utilisateur non fournisseur.'})

        # Retirer les champs lecture seule/affichage si présents
        validated_data.pop('statut', None)
        validated_data.pop('statut_label', None)
        validated_data.pop('type_promotion_label', None)

        promotion = super().create(validated_data)
        self._sync_produit_promotion(promotion)
        return promotion

    def update(self, instance, validated_data):
        validated_data.pop('statut', None)
        validated_data.pop('statut_label', None)
        validated_data.pop('type_promotion_label', None)

        promotion = super().update(instance, validated_data)
        self._sync_produit_promotion(promotion)
        return promotion

    @staticmethod
    def _sync_produit_promotion(promotion):
        from decimal import Decimal
        from django.utils import timezone

        produit = promotion.produit
        if not produit:
            return

        now = timezone.now()
        if not promotion.is_active:
            statut = 'suspendue'
        elif now < promotion.date_debut:
            statut = 'a_venir'
        elif now > promotion.date_fin:
            statut = 'terminee'
        else:
            statut = 'active'

        if promotion.pk is not None and promotion.statut != statut:
            promotion.statut = statut
            promotion.save(update_fields=['statut'])

        active_promos = Promotion.objects.filter(
            produit=produit,
            is_active=True,
            date_debut__lte=now,
            date_fin__gte=now
        )

        # Promotion de prix : on prend la première active parmi les réductions
        prix_promo = None
        pct_reduction = None
        date_debut_promo = None
        date_fin_promo = None

        discount_promos = active_promos.filter(type_promotion__in=['pourcentage', 'montant_fixe', 'vente_flash', 'offre_speciale'])
        if discount_promos.exists():
            promo = discount_promos.first()
            date_debut_promo = promo.date_debut
            date_fin_promo = promo.date_fin

            if promo.type_promotion == 'montant_fixe' and promo.valeur_reduction:
                prix_promo = max(Decimal('0'), produit.prix - promo.valeur_reduction)
            elif promo.pourcentage:
                reduction = Decimal(str(promo.pourcentage)) / Decimal('100')
                prix_promo = produit.prix * (Decimal('1') - reduction)

            if prix_promo is not None:
                prix_promo = prix_promo.quantize(Decimal('0.01'))

            if promo.type_promotion in ('pourcentage', 'vente_flash', 'offre_speciale'):
                pct_reduction = int(promo.pourcentage)

        produit.est_en_promo = discount_promos.exists()
        produit.prix_promo = prix_promo
        produit.pourcentage_reduction = pct_reduction
        produit.date_debut_promo = date_debut_promo
        produit.date_fin_promo = date_fin_promo

        # Mise à jour des flags de mise en avant
        produit.est_vedette = active_promos.filter(type_promotion='produit_vedette').exists()
        produit.est_tendance = active_promos.filter(type_promotion='nouveau_produit').exists()
        produit.est_recommande = active_promos.filter(type_promotion='offre_speciale').exists()
        produit.est_meilleure_offre = active_promos.filter(type_promotion='dernieres_pieces').exists()
        produit.vente_eclair = active_promos.filter(type_promotion='vente_flash').exists()

        produit.save()


# -----------------------------
# MouvementStock Serializer
# -----------------------------
class MouvementStockSerializer(serializers.ModelSerializer):
    """Serializer pour les mouvements de stock"""
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    produit_reference = serializers.CharField(source='produit.reference', read_only=True)
    utilisateur_nom = serializers.SerializerMethodField()
    type_mouvement_label = serializers.CharField(source='get_type_mouvement_display', read_only=True)

    class Meta:
        model = MouvementStock
        fields = [
            'id', 'type_mouvement', 'type_mouvement_label', 'quantite',
            'observation', 'date_mouvement', 'produit', 'produit_nom',
            'produit_reference', 'utilisateur', 'utilisateur_nom'
        ]
        read_only_fields = ['date_mouvement', 'produit_nom', 'produit_reference', 'utilisateur_nom', 'utilisateur', 'type_mouvement_label']

    def get_utilisateur_nom(self, obj):
        if obj.utilisateur:
            return f"{obj.utilisateur.prenom or ''} {obj.utilisateur.nom or ''}".strip() or obj.utilisateur.email or 'Utilisateur'
        return 'Système'


# -----------------------------
# Fournisseur (light)
# -----------------------------
class FournisseurSimpleSerializer(serializers.ModelSerializer):
    note = serializers.FloatField(source='note_moyenne', read_only=True)

    class Meta:
        model = Fournisseur
        fields = ['user', 'nom_entreprise', 'note', 'nombre_avis']


# -----------------------------
# Magasin (light)
# -----------------------------
class MagasinSimpleSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()
    adresse = serializers.CharField(source='adresse_complete', read_only=True)
    note = serializers.SerializerMethodField()

    class Meta:
        model = Magasin
        fields = [
            'id', 'nom_magasin', 'logo_url', 'adresse', 'ville', 'region',
            'telephone', 'whatsapp', 'email', 'latitude', 'longitude',
            'horaires_ouverture', 'jours_ouverture', 'livraison_disponible',
            'retrait_magasin', 'rayon_livraison_km', 'distance_km', 'note', 'nombre_avis'
        ]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return f"{settings.MEDIA_URL}{obj.logo}"
        return None

    def get_distance_km(self, obj):
        """Distance calculable côté backend si position client fournie."""
        request = self.context.get('request')
        if request:
            lat = request.query_params.get('lat')
            lng = request.query_params.get('lng')
            if lat and lng and obj.latitude and obj.longitude:
                from math import radians, cos, sin, asin, sqrt
                lat1, lon1, lat2, lon2 = map(radians, [float(lat), float(lng), float(obj.latitude), float(obj.longitude)])
                dlon = lon2 - lon1
                dlat = lat2 - lat1
                a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
                c = 2 * asin(sqrt(a))
                return round(6371 * c, 1)
        return None

    def get_note(self, obj):
        return round(obj.note_moyenne, 1) if obj.note_moyenne is not None else None


# -----------------------------
# Avis (light)
# -----------------------------
class AvisSerializer(serializers.ModelSerializer):
    client_nom = serializers.SerializerMethodField()
    date_ajout = serializers.DateTimeField(source='date', read_only=True)

    class Meta:
        model = Avis
        fields = [
            'id', 'note', 'commentaire', 'date_ajout', 'client_nom',
            'achat_verifie', 'reponse_fournisseur', 'date_reponse',
            'reponse_fournisseur_nom', 'photos'
        ]

    def get_client_nom(self, obj):
        if obj.client and obj.client.user:
            return f"{obj.client.user.prenom or ''} {obj.client.user.nom or ''}".strip() or obj.client.user.email
        return 'Client anonyme'


# -----------------------------
# Offre magasin
# -----------------------------
class OffreSerializer(serializers.Serializer):
    fournisseur = FournisseurSimpleSerializer(read_only=True)
    magasin = MagasinSimpleSerializer(read_only=True)
    prix = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock = serializers.IntegerField()
    livraison_disponible = serializers.BooleanField()
    retrait_magasin = serializers.BooleanField()
    delai_livraison = serializers.CharField()
    distance_km = serializers.FloatField(required=False, allow_null=True)
    badge = serializers.CharField(required=False, allow_null=True)
    badges = serializers.ListField(child=serializers.CharField(), required=False, allow_null=True)


# -----------------------------
# Produit détail étendu
# -----------------------------
class ProduitDetailSerializer(ProduitSerializer):
    fournisseur = serializers.PrimaryKeyRelatedField(queryset=Fournisseur.objects.all())
    fournisseur_detail = FournisseurSimpleSerializer(source='fournisseur', read_only=True)
    magasin_detail = serializers.SerializerMethodField()
    offres = serializers.SerializerMethodField()
    avis = serializers.SerializerMethodField()
    distribution_etoiles = serializers.SerializerMethodField()

    class Meta(ProduitSerializer.Meta):
        fields = ProduitSerializer.Meta.fields + [
            'fournisseur', 'fournisseur_detail', 'magasin_detail',
            'offres', 'avis', 'distribution_etoiles'
        ]

    def get_magasin_detail(self, obj):
        if not obj.fournisseur:
            return None
        try:
            magasin = obj.fournisseur.magasin
            return MagasinSimpleSerializer(magasin, context=self.context).data
        except (Magasin.DoesNotExist, AttributeError):
            return None

    def _build_offre(self, fournisseur, produit, distance_km=None, badge=None, fp=None, badges=None):
        magasin = None
        if fournisseur and fournisseur.administrateur:
            try:
                magasin = fournisseur.administrateur.magasin
            except (Magasin.DoesNotExist, AttributeError):
                magasin = None

        # Prix et stock du produit, éventuellement surchargés par FournisseurProduit
        prix = produit.prix
        if produit.est_en_promo and produit.prix_promo:
            prix = produit.prix_promo
        if fp and fp.prix_vente is not None:
            prix = fp.prix_vente

        stock = produit.stock or 0
        if fp and fp.stock_disponible is not None:
            stock = fp.stock_disponible

        return {
            'fournisseur': FournisseurSimpleSerializer(fournisseur).data if fournisseur else None,
            'magasin': MagasinSimpleSerializer(magasin, context=self.context).data if magasin else None,
            'prix': prix,
            'stock': stock,
            'livraison_disponible': magasin.livraison_disponible if magasin else produit.livraison_disponible,
            'retrait_magasin': magasin.retrait_magasin if magasin else produit.retrait_magasin,
            'delai_livraison': produit.delai_livraison or '2_5j',
            'distance_km': distance_km,
            'badge': badge,
            'badges': badges or [badge]
        }

    def get_offres(self, obj):
        raw_offres = []

        # Toutes les offres sont issues de FournisseurProduit, qui lie un fournisseur catalog à un produit
        qs = FournisseurProduit.objects.filter(produit=obj).select_related('fournisseur')
        for fp in qs:
            f = fp.fournisseur
            if not f:
                continue
            is_principal = bool(obj.fournisseur and obj.fournisseur.user == f.administrateur)
            badge = 'principal' if is_principal else 'partenaire'
            raw_offres.append(self._build_offre(f, obj, fp=fp, badge=badge))

        # Calcul des badges relatifs (prix, distance, note)
        if raw_offres:
            prix_list = [o['prix'] for o in raw_offres]
            dist_list = [o['distance_km'] for o in raw_offres if o['distance_km'] is not None]
            note_list = [o['magasin']['note'] for o in raw_offres if o['magasin'] and o['magasin'].get('note') is not None]

            min_prix = min(prix_list) if prix_list else None
            min_dist = min(dist_list) if dist_list else None
            max_note = max(note_list) if note_list else None

            for offre in raw_offres:
                badges = []
                if min_prix is not None and offre['prix'] == min_prix:
                    badges.append('meilleur_prix')
                if min_dist is not None and offre['distance_km'] is not None and offre['distance_km'] == min_dist:
                    badges.append('plus_proche')
                if max_note is not None and offre['magasin'] and offre['magasin'].get('note') == max_note:
                    badges.append('mieux_note')
                if not badges:
                    badges.append(offre['badge'])
                offre['badges'] = badges

        return raw_offres

    def get_avis(self, obj):
        qs = Avis.objects.filter(produit=obj, approuve=True).order_by('-date')[:50]
        return AvisSerializer(qs, many=True, context=self.context).data

    def get_distribution_etoiles(self, obj):
        total = Avis.objects.filter(produit=obj, approuve=True).count()
        if total == 0:
            return {str(i): {'count': 0, 'pct': 0} for i in range(1, 6)}
        dist = {}
        for i in range(1, 6):
            count = Avis.objects.filter(produit=obj, note=i, approuve=True).count()
            dist[str(i)] = {'count': count, 'pct': round(count / total * 100, 1)}
        return dist


# -----------------------------
# DemandePiece
# -----------------------------
class DemandePieceSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = DemandePiece
        fields = [
            'id', 'piece_recherchee', 'marque_vehicule', 'modele_vehicule',
            'annee_vehicule', 'reference', 'description', 'photo', 'photo_url',
            'client', 'nom_client', 'email_client', 'telephone_client',
            'statut', 'date_creation', 'date_traitement'
        ]
        read_only_fields = ['id', 'statut', 'date_creation', 'date_traitement', 'photo_url']

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return f"{settings.MEDIA_URL}{obj.photo}"
        return None