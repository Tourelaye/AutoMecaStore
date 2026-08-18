from rest_framework import serializers
from .models import Livraison, Adresse, Vehicule, PartenaireLivraison
from fournisseur.serializers import MagasinSerializer


# -----------------------------
# Adresse
# -----------------------------
class AdresseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Adresse
        fields = [
            'id', 'client', 'nom_destinataire', 'telephone', 'ville', 'quartier',
            'adresse', 'point_de_repere', 'instructions', 'latitude', 'longitude',
            'est_principale', 'created_at'
        ]
        read_only_fields = ['client', 'created_at']


# -----------------------------
# Vehicule
# -----------------------------
class VehiculeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicule
        fields = "__all__"


# -----------------------------
# Partenaire de livraison
# -----------------------------
class PartenaireLivraisonSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartenaireLivraison
        fields = "__all__"


# -----------------------------
# Livraison
# -----------------------------
class LivraisonSerializer(serializers.ModelSerializer):
    adresse = AdresseSerializer(read_only=True)
    adresse_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    magasin = MagasinSerializer(read_only=True)
    magasin_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    responsable_nom = serializers.SerializerMethodField()

    class Meta:
        model = Livraison
        fields = [
            'id', 'commande', 'client', 'adresse', 'adresse_id',
            'magasin', 'magasin_id', 'fournisseur', 'partenaire', 'livreur', 'vehicule',
            'responsable_type', 'responsable_nom', 'mode_tarif', 'frais_livraison',
            'delai_estime', 'statut', 'instructions', 'remarque',
            'date_creation', 'date_attribution', 'date_livraison'
        ]
        read_only_fields = ['client', 'date_creation', 'date_attribution', 'date_livraison']

    def get_responsable_nom(self, obj):
        if obj.responsable_type == 'magasin' and obj.magasin:
            return obj.magasin.nom_magasin or obj.magasin.fournisseur.nom_entreprise
        if obj.responsable_type == 'partenaire' and obj.partenaire:
            return obj.partenaire.nom
        if obj.responsable_type == 'livreur' and obj.livreur:
            return f"{obj.livreur.user.prenom} {obj.livreur.user.nom}".strip()
        if obj.responsable_type == 'non_attribue':
            return 'Non attribué'
        return None