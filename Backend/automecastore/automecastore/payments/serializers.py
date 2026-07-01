from rest_framework import serializers
from .models import Paiement


class PaiementSerializer(serializers.ModelSerializer):

    class Meta:
        model = Paiement
        fields = "__all__"
        read_only_fields = ['reference', 'date_paiement', 'statut', 'client']