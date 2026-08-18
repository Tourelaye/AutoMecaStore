from rest_framework import serializers
from django.conf import settings
from .models import Transaction, HistoriqueActivite, Notification, Magasin
from account.models import Fournisseur
from account.serializers import UtilisateurSerializer


class TransactionSerializer(serializers.ModelSerializer):
    commande_reference = serializers.CharField(source='commande.reference', read_only=True)
    fournisseur_nom = serializers.CharField(source='fournisseur.nom_entreprise', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'commande', 'commande_reference', 'fournisseur', 'fournisseur_nom',
            'montant_brut', 'commission', 'revenu_net', 'statut_reversement',
            'date_transaction', 'date_versement', 'reference_virement'
        ]
        read_only_fields = ['date_transaction']


class HistoriqueActiviteSerializer(serializers.ModelSerializer):
    fournisseur_nom = serializers.CharField(source='fournisseur.nom_entreprise', read_only=True)

    class Meta:
        model = HistoriqueActivite
        fields = ['id', 'fournisseur', 'fournisseur_nom', 'type', 'titre', 'detail', 'created_at']
        read_only_fields = ['created_at']


class NotificationSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format='%Y-%m-%d %H:%M', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'destinataire_id', 'destinataire_type', 'type', 'importance',
            'titre', 'message', 'lien', 'objet_type', 'objet_id', 'lu', 'created_at'
        ]
        read_only_fields = ['created_at']


class FournisseurSerializer(serializers.ModelSerializer):
    user = UtilisateurSerializer(read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    nom = serializers.CharField(source='user.nom', read_only=True)
    prenom = serializers.CharField(source='user.prenom', read_only=True)
    telephone = serializers.CharField(source='user.telephone', read_only=True)
    logo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Fournisseur
        fields = [
            'user', 'nom_entreprise', 'description', 'siret', 'logo',
            'date_inscription', 'statut', 'date_validation', 'note_moyenne',
            'nombre_avis', 'nombre_produits', 'nombre_ventes', 'chiffre_affaires',
            'email', 'nom', 'prenom', 'telephone'
        ]
        read_only_fields = ['user', 'date_inscription', 'email', 'nom', 'prenom', 'telephone']


class MagasinSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    photo_couverture_url = serializers.SerializerMethodField()
    nom_magasin = serializers.CharField(required=True, allow_blank=False)
    email = serializers.EmailField(required=True)
    telephone = serializers.CharField(required=True, allow_blank=False)
    adresse_complete = serializers.CharField(required=True, allow_blank=False)
    ville = serializers.CharField(required=True, allow_blank=False)
    region = serializers.CharField(required=True, allow_blank=False)

    class Meta:
        model = Magasin
        fields = [
            'id', 'fournisseur', 'nom_magasin', 'logo', 'photo_couverture',
            'logo_url', 'photo_couverture_url',
            'description', 'telephone', 'whatsapp', 'email',
            'adresse_complete', 'ville', 'region', 'latitude', 'longitude',
            'horaires_ouverture', 'jours_ouverture',
            'livraison_disponible', 'retrait_magasin', 'rayon_livraison_km',
            'mode_tarif_livraison', 'frais_livraison', 'tarif_gratuit_desous', 'delai_livraison_estime',
            'note_moyenne', 'nombre_avis',
            'date_creation', 'date_modification'
        ]
        read_only_fields = ['id', 'fournisseur', 'date_creation', 'date_modification']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return f"{settings.MEDIA_URL}{obj.logo}"
        return None

    def get_photo_couverture_url(self, obj):
        if obj.photo_couverture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo_couverture.url)
            return f"{settings.MEDIA_URL}{obj.photo_couverture}"
        return None

    def validate_telephone(self, value):
        import re
        if not value:
            return value
        cleaned = re.sub(r'[\s\-.]', '', value).strip()
        if cleaned.startswith('00'):
            cleaned = '+' + cleaned[2:]
        if cleaned.startswith('+221'):
            rest = cleaned[4:]
            if not re.fullmatch(r'(70|75|76|77|78)\d{7}', rest):
                raise serializers.ValidationError('Numéro sénégalais invalide. Exemple : +22177XXXXXXX.')
        elif cleaned.startswith('+'):
            if not re.fullmatch(r'\+[1-9]\d{6,14}', cleaned):
                raise serializers.ValidationError('Numéro international invalide.')
        else:
            if not re.fullmatch(r'(70|75|76|77|78)\d{7}', cleaned):
                raise serializers.ValidationError('Numéro sénégalais invalide. Exemple : 77XXXXXXX.')
        return cleaned

    def validate_whatsapp(self, value):
        if not value:
            return value
        return self.validate_telephone(value)

    def validate_rayon_livraison_km(self, value):
        data = self.get_initial()
        if data.get('livraison_disponible') and not value:
            raise serializers.ValidationError('Le rayon de livraison est requis lorsque la livraison est disponible.')
        return value
