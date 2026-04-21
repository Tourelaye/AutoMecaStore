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
    # Les champs par défaut sont username et password, mais on utilise email
    username_field = 'email'
    
    def validate(self, attrs):
        print(f"DEBUG: Données reçues: {attrs}")
        # Transformer email en username pour le serializer parent
        email = attrs.get('email')
        password = attrs.get('password')
        print(f"DEBUG: Email: {email}, Password: {'*' * len(password) if password else 'None'}")
        
        # Pour le serializer parent, il faut username
        attrs['username'] = email
        print(f"DEBUG: Attributs après transformation: {attrs}")
        
        try:
            result = super().validate(attrs)
            print(f"DEBUG: Validation réussie")
            return result
        except Exception as e:
            print(f"DEBUG: Erreur validation: {e}")
            raise
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Ajoute le rôle dans le token
        token['role'] = user.role
        token['nom'] = user.nom
        token['prenom'] = user.prenom
        token['user_id'] = user.id
        return token