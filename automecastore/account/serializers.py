from rest_framework import serializers
from .models import Utilisateur, Client, FournisseurProfile, JournalActivite
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
    

class RegisterFournisseurSerializer(serializers.ModelSerializer):
    """Serializer pour l'inscription d'un fournisseur"""
    password = serializers.CharField(write_only=True)
    nom_entreprise = serializers.CharField(required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    siret = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'email', 'password', 'nom', 'prenom',
            'telephone', 'adresse', 'nom_entreprise', 'description', 'siret'
        ]

    def create(self, validated_data):
        nom_entreprise = validated_data.pop('nom_entreprise', '')
        description = validated_data.pop('description', '')
        siret = validated_data.pop('siret', '')
        password = validated_data.pop('password')
        
        validated_data['role'] = 'fournisseur'
        user = Utilisateur.objects.create_user(password=password, **validated_data)
        
        # Créer le profil fournisseur
        FournisseurProfile.objects.create(
            user=user,
            nom_entreprise=nom_entreprise,
            description=description,
            siret=siret
        )
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


# ==============================
# SERIALIZERS FOURNISSEUR
# ==============================

class FournisseurProfileSerializer(serializers.ModelSerializer):
    """Serializer pour le profil fournisseur"""
    user = UtilisateurSerializer(read_only=True)
    nom_complet = serializers.SerializerMethodField()
    
    class Meta:
        model = FournisseurProfile
        fields = [
            'user', 'nom_entreprise', 'description', 'siret', 'logo',
            'date_inscription', 'statut', 'date_validation',
            'note_moyenne', 'nombre_avis', 'nombre_produits',
            'nombre_ventes', 'chiffre_affaires', 'nom_complet'
        ]
        read_only_fields = [
            'date_inscription', 'statut', 'date_validation',
            'note_moyenne', 'nombre_avis', 'nombre_produits',
            'nombre_ventes', 'chiffre_affaires'
        ]
    
    def get_nom_complet(self, obj):
        return f"{obj.user.nom} {obj.user.prenom}"


class FournisseurListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des fournisseurs (admin)"""
    user = UtilisateurSerializer(read_only=True)
    nom_complet = serializers.SerializerMethodField()
    statut_label = serializers.SerializerMethodField()
    
    class Meta:
        model = FournisseurProfile
        fields = [
            'user', 'nom_entreprise', 'description', 'siret', 'logo',
            'date_inscription', 'statut', 'statut_label',
            'note_moyenne', 'nombre_avis', 'nombre_produits',
            'nombre_ventes', 'chiffre_affaires', 'nom_complet'
        ]
    
    def get_nom_complet(self, obj):
        return f"{obj.user.nom} {obj.user.prenom}"
    
    def get_statut_label(self, obj):
        labels = {
            'en_attente': 'En attente de validation',
            'actif': 'Actif',
            'suspendu': 'Suspendu'
        }
        return labels.get(obj.statut, obj.statut)


class FournisseurUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la mise à jour du profil fournisseur"""
    class Meta:
        model = FournisseurProfile
        fields = ['nom_entreprise', 'description', 'siret', 'logo']


class FournisseurValidationSerializer(serializers.Serializer):
    """Serializer pour valider/suspendre un fournisseur (admin)"""
    action = serializers.ChoiceField(choices=['valider', 'suspendre', 'reactiver'])
    commentaire = serializers.CharField(required=False, allow_blank=True)


# ==============================
# SERIALIZERS JOURNAL
# ==============================

class JournalActiviteSerializer(serializers.ModelSerializer):
    """Serializer pour le journal d'activité"""
    utilisateur_nom = serializers.SerializerMethodField()
    categorie_label = serializers.SerializerMethodField()
    action_label = serializers.SerializerMethodField()
    
    class Meta:
        model = JournalActivite
        fields = [
            'id', 'utilisateur', 'utilisateur_nom',
            'categorie', 'categorie_label',
            'action', 'action_label',
            'description', 'ip_address', 'date_creation'
        ]
    
    def get_utilisateur_nom(self, obj):
        if obj.utilisateur:
            return f"{obj.utilisateur.nom} {obj.utilisateur.prenom}"
        return "Système"
    
    def get_categorie_label(self, obj):
        return obj.get_categorie_display()
    
    def get_action_label(self, obj):
        return obj.get_action_display()