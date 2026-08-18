from rest_framework import serializers
from .models import Paiement
from orders.models import Commande


class PaiementSerializer(serializers.ModelSerializer):
    """Lecture. Aucune donnée sensible n'est exposée."""
    commande_reference = serializers.CharField(source='commande.reference', read_only=True)
    client_nom = serializers.SerializerMethodField()
    moyen_libelle = serializers.CharField(source='get_moyen_display', read_only=True)
    statut_libelle = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = Paiement
        fields = [
            'id', 'reference', 'cle_idempotence', 'commande', 'commande_reference',
            'client', 'client_nom', 'moyen', 'moyen_libelle', 'statut', 'statut_libelle',
            'montant', 'date_creation', 'date_mise_a_jour',
            'provider_reference', 'motif_erreur', 'remboursement_motif',
            'remboursement_montant', 'metadata'
        ]
        read_only_fields = [
            'id', 'reference', 'cle_idempotence', 'commande', 'commande_reference',
            'client', 'client_nom', 'statut', 'statut_libelle', 'montant',
            'date_creation', 'date_mise_a_jour'
        ]

    def get_client_nom(self, obj):
        if obj.client and obj.client.user:
            return f"{obj.client.user.prenom or ''} {obj.client.user.nom or ''}".strip() or obj.client.user.email
        return ''


class PaiementInitSerializer(serializers.Serializer):
    commande = serializers.IntegerField()
    moyen = serializers.ChoiceField(choices=Commande._meta.get_field('mode_paiement').choices)
    idempotence_key = serializers.CharField(max_length=100, required=False, allow_blank=True)


class PaiementActionSerializer(serializers.Serializer):
    ACTIONS = [
        ('confirmer', 'Confirmer'),
        ('echouer', 'Marquer comme échoué'),
        ('annuler', 'Annuler'),
        ('demander_remboursement', 'Demander un remboursement'),
        ('demarrer_remboursement', 'Démarrer le remboursement'),
        ('rembourser', 'Rembourser'),
        ('refuser_remboursement', 'Refuser le remboursement'),
    ]
    action = serializers.ChoiceField(choices=ACTIONS)
    motif = serializers.CharField(required=False, allow_blank=True)
    provider_reference = serializers.CharField(required=False, allow_blank=True)
    remboursement_montant = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    metadata = serializers.JSONField(required=False, default=dict)