from rest_framework import serializers

from .models import Livraison, Adresse, Vehicule





# -----------------------------

# Adresse

# -----------------------------

class AdresseSerializer(serializers.ModelSerializer):

    class Meta:

        model = Adresse

        fields = "__all__"

        read_only_fields = ['client']





# -----------------------------

# Vehicule

# -----------------------------

class VehiculeSerializer(serializers.ModelSerializer):

    class Meta:

        model = Vehicule

        fields = "__all__"





# -----------------------------

# Livraison

# -----------------------------

class LivraisonSerializer(serializers.ModelSerializer):

    class Meta:

        model = Livraison

        fields = "__all__"

        read_only_fields = ['client', 'statut', 'date_creation']