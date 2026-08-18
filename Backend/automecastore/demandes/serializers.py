from rest_framework import serializers
from decimal import Decimal

from .models import DemandePiece, OffreFournisseur
from account.models import Client, Fournisseur
from delivery.models import Vehicule


class OffreFournisseurSerializer(serializers.ModelSerializer):
    """Lecture d'une offre (client/fournisseur/admin)."""
    fournisseur_detail = serializers.SerializerMethodField()
    statut_libelle = serializers.CharField(source='get_statut_display', read_only=True)
    etat_libelle = serializers.CharField(source='get_etat_display', read_only=True)
    disponibilite_libelle = serializers.CharField(source='get_disponibilite_display', read_only=True)
    mode_reception_libelle = serializers.CharField(source='get_mode_reception_display', read_only=True)

    class Meta:
        model = OffreFournisseur
        fields = [
            'id', 'demande', 'fournisseur', 'fournisseur_detail',
            'prix', 'etat', 'etat_libelle', 'garantie', 'disponibilite',
            'disponibilite_libelle', 'delai', 'mode_reception', 'mode_reception_libelle',
            'description', 'statut', 'statut_libelle', 'commande',
            'date_creation', 'date_mise_a_jour'
        ]
        read_only_fields = [
            'id', 'demande', 'fournisseur', 'fournisseur_detail', 'statut',
            'statut_libelle', 'commande', 'date_creation', 'date_mise_a_jour'
        ]

    def get_fournisseur_detail(self, obj):
        if not obj.fournisseur:
            return None
        return {
            'id': obj.fournisseur.user_id,
            'nom_entreprise': obj.fournisseur.nom_entreprise,
            'note_moyenne': str(obj.fournisseur.note_moyenne) if obj.fournisseur.note_moyenne else None,
        }


class OffreFournisseurCreateSerializer(serializers.ModelSerializer):
    """Création d'une offre par un fournisseur."""
    class Meta:
        model = OffreFournisseur
        fields = [
            'prix', 'etat', 'garantie', 'disponibilite', 'delai',
            'mode_reception', 'description'
        ]


class DemandePieceCreateSerializer(serializers.ModelSerializer):
    """Création d'une demande (client anonyme ou connecté)."""
    vehicule = serializers.PrimaryKeyRelatedField(
        queryset=Vehicule.objects.all(),
        required=False,
        allow_null=True
    )
    client = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(),
        required=False,
        allow_null=True,
        write_only=True
    )

    class Meta:
        model = DemandePiece
        fields = [
            'client', 'nom_contact', 'email_contact', 'telephone_contact',
            'piece_recherchee', 'reference_oem', 'quantite', 'description',
            'vehicule', 'marque_vehicule', 'modele_vehicule', 'annee_vehicule',
            'motorisation', 'version',
            'ville', 'quartier', 'latitude', 'longitude',
            'photo_piece', 'photo_vehicule'
        ]


class DemandePieceListSerializer(serializers.ModelSerializer):
    """Liste compacte pour le client/fournisseur/admin."""
    statut_libelle = serializers.CharField(source='get_statut_display', read_only=True)
    offres_count = serializers.IntegerField(source='offres.count', read_only=True)
    client_detail = serializers.SerializerMethodField()

    class Meta:
        model = DemandePiece
        fields = [
            'id', 'reference', 'piece_recherchee', 'marque_vehicule',
            'modele_vehicule', 'annee_vehicule', 'quantite', 'ville',
            'statut', 'statut_libelle', 'offres_count', 'date_creation',
            'client_detail', 'photo_piece'
        ]

    def get_client_detail(self, obj):
        if not obj.client:
            return {'nom': obj.nom_contact, 'email': obj.email_contact, 'telephone': obj.telephone_contact}
        return {
            'id': obj.client.user_id,
            'nom': f"{obj.client.user.prenom or ''} {obj.client.user.nom or ''}".strip() or obj.client.user.email,
            'email': obj.client.user.email,
        }


class DemandePieceDetailSerializer(serializers.ModelSerializer):
    """Détail complet d'une demande, avec offres."""
    statut_libelle = serializers.CharField(source='get_statut_display', read_only=True)
    offres = OffreFournisseurSerializer(many=True, read_only=True)
    vehicule_detail = serializers.SerializerMethodField()
    client_detail = serializers.SerializerMethodField()
    commande_reference = serializers.CharField(source='commande.reference', read_only=True)

    class Meta:
        model = DemandePiece
        fields = [
            'id', 'reference', 'client', 'client_detail', 'nom_contact', 'email_contact',
            'telephone_contact', 'piece_recherchee', 'reference_oem', 'quantite',
            'description', 'vehicule', 'vehicule_detail', 'marque_vehicule',
            'modele_vehicule', 'annee_vehicule', 'motorisation', 'version',
            'ville', 'quartier', 'latitude', 'longitude',
            'photo_piece', 'photo_vehicule', 'statut', 'statut_libelle',
            'offres', 'commande', 'commande_reference', 'produit',
            'date_creation', 'date_mise_a_jour'
        ]

    def get_vehicule_detail(self, obj):
        if not obj.vehicule:
            return None
        return {
            'id': obj.vehicule.id,
            'marque': obj.vehicule.marque,
            'plaque': obj.vehicule.plaque,
            'annee': obj.vehicule.annee,
        }

    def get_client_detail(self, obj):
        if not obj.client:
            return {'nom': obj.nom_contact, 'email': obj.email_contact, 'telephone': obj.telephone_contact}
        return {
            'id': obj.client.user_id,
            'nom': f"{obj.client.user.prenom or ''} {obj.client.user.nom or ''}".strip() or obj.client.user.email,
            'email': obj.client.user.email,
            'telephone': obj.client.user.telephone,
        }


class DemandeAcceptOffreSerializer(serializers.Serializer):
    """Validation de l'acceptation d'une offre."""
    offre_id = serializers.IntegerField()
    mode_reception = serializers.ChoiceField(
        choices=[('livraison', 'Livraison'), ('retrait_magasin', 'Retrait en magasin')],
        required=False,
        allow_blank=True
    )
