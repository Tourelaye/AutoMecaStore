from rest_framework import serializers
from .models import Utilisateur, Client 
from catalog.models import Categorie, Produit
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Utilisateur
        fields = [
            'id',
            'email',
            'password',
            'nom',
            'prenom',
            'telephone',
            'adresse'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Utilisateur.objects.create_user(
            password=password,
            **validated_data
        )
        Client.objects.create(user=user)
        return user
    
class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = [
            'id',
            'nom',
            'prenom',
            'email', 
            'role', 
            'adresse', 
            'telephone'
            ]

class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = [
            'id', 
            'nom', 
            'description', 
            'datecreation', 
            'datemodification',
            'etat', 
            'categorieid'
            ]
        
class ProduitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produit
        fields = [
            'id',
            'nom',
            'description',
            'prix',
            'stock',
            'categorie',
            'gestionnaire_stock'
        ]

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Ajoute le rôle dans le token
        token['role'] = user.role
        token['nom'] = user.nom
        token['prenom'] = user.prenom
        return token