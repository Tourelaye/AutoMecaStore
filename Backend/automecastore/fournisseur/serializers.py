from rest_framework import serializers
from .models import Transaction, HistoriqueActivite, Notification
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
    class Meta:
        model = Notification
        fields = ['id', 'destinataire_id', 'destinataire_type', 'type', 'message', 'lu', 'created_at']
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
