from rest_framework import serializers
from .models import Utilisateur, Client, Fournisseur 
from catalog.models import Categorie, Produit
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from orders.models import Commande

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
        # Assigner explicitement le rôle 'client' aux nouvelles inscriptions
        validated_data['role'] = 'client'
        user = Utilisateur.objects.create_user(
            password=password,
            **validated_data
        )
        # Créer le profil client uniquement pour les vrais clients
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
            'telephone',
            'is_active',
            'date_joined'
            ]

class RegisterFournisseurSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    nom_entreprise = serializers.CharField(max_length=200, required=True)
    siret = serializers.CharField(max_length=50, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Utilisateur
        fields = [
            'id',
            'email',
            'password',
            'nom',
            'prenom',
            'telephone',
            'adresse',
            'nom_entreprise',
            'siret',
            'description'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        nom_entreprise = validated_data.pop('nom_entreprise', '')
        siret = validated_data.pop('siret', '')
        description = validated_data.pop('description', '')
        validated_data['role'] = 'fournisseur'
        validated_data['email'] = validated_data['email'].strip().lower()
        user = Utilisateur.objects.create_user(
            password=password,
            is_active=True,
            **validated_data
        )
        Fournisseur.objects.create(
            user=user,
            nom_entreprise=nom_entreprise,
            siret=siret,
            description=description
        )
        return user


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
        if user.role == 'fournisseur' and hasattr(user, 'fournisseur'):
            token['fournisseur_status'] = user.fournisseur.statut
        else:
            token['fournisseur_status'] = None
        return token

class ClientSerializer(serializers.ModelSerializer):
    """Serializer pour les clients avec informations complètes pour l'admin"""
    nom_complet = serializers.SerializerMethodField()
    nombre_commandes = serializers.SerializerMethodField()
    statut = serializers.SerializerMethodField()
    
    class Meta:
        model = Client
        fields = [
            'user',
            'date_inscription',
            'point_fidelite',
            'mode_paiement_favoris',
            'nom_complet',
            'nombre_commandes',
            'statut'
        ]
    
    def get_nom_complet(self, obj):
        return f"{obj.user.nom} {obj.user.prenom}"
    
    def get_nombre_commandes(self, obj):
        return Commande.objects.filter(client=obj).count()
    
    def get_statut(self, obj):
        return 'actif' if obj.user.is_active else 'inactif'

class ClientDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour un client spécifique"""
    user = UtilisateurSerializer(read_only=True)
    nom_complet = serializers.SerializerMethodField()
    nombre_commandes = serializers.SerializerMethodField()
    statut = serializers.SerializerMethodField()
    
    class Meta:
        model = Client
        fields = [
            'user',
            'date_inscription',
            'point_fidelite',
            'mode_paiement_favoris',
            'note_livreur',
            'livreur_id',
            'administrateur_id',
            'nom_complet',
            'nombre_commandes',
            'statut'
        ]
    
    def get_nom_complet(self, obj):
        return f"{obj.user.nom} {obj.user.prenom}"
    
    def get_nombre_commandes(self, obj):
        return Commande.objects.filter(client=obj).count()
    
    def get_statut(self, obj):
        return 'actif' if obj.user.is_active else 'inactif'
