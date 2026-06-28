from rest_framework import serializers
from .models import Ticket, MessageSupport, Reclamation, Avis


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = "__all__"
        read_only_fields = ['client', 'date_ouverture', 'statut']


class MessageSupportSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageSupport
        fields = "__all__"
        read_only_fields = ['date_envoi']


class ReclamationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reclamation
        fields = "__all__"
        read_only_fields = ['client', 'date_soumission']


class AvisSerializer(serializers.ModelSerializer):
    class Meta:
        model = Avis
        fields = "__all__"
        read_only_fields = ['client', 'date']