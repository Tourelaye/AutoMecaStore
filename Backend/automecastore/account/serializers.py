import re
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from django.db.models import Avg, Count
from django.apps import apps
from django.utils import timezone
from .models import Utilisateur, Client, Fournisseur, VehiculeClient, SecurityActivity
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
    telephone = serializers.CharField(required=True, allow_blank=True, max_length=20)

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

    def validate(self, attrs):
        telephone = attrs.get('telephone', '')
        if not telephone or not str(telephone).strip():
            raise serializers.ValidationError({'telephone': 'Le numéro de téléphone est obligatoire.'})

        cleaned = re.sub(r'[\s\-.]', '', str(telephone)).strip()
        if cleaned.startswith('00'):
            cleaned = '+' + cleaned[2:]

        if not cleaned:
            raise serializers.ValidationError({'telephone': 'Le numéro de téléphone est obligatoire.'})

        if cleaned.startswith('+'):
            if not re.fullmatch(r'\+[1-9]\d{6,14}', cleaned):
                raise serializers.ValidationError({'telephone': 'Le numéro international n\'est pas valide.'})
            if cleaned.startswith('+221'):
                rest = cleaned[4:]
                if not re.fullmatch(r'(70|75|76|77|78)\d{7}', rest):
                    raise serializers.ValidationError({'telephone': 'Numéro sénégalais invalide. Exemple : +22177XXXXXXX ou 77XXXXXXX.'})
            elif cleaned.startswith('+86'):
                rest = cleaned[3:]
                if not re.fullmatch(r'1\d{10}', rest):
                    raise serializers.ValidationError({'telephone': 'Numéro chinois invalide. Exemple : +861XXXXXXXXXX (11 chiffres commençant par 1).'})
        else:
            if not re.fullmatch(r'(70|75|76|77|78)\d{7}', cleaned):
                raise serializers.ValidationError({'telephone': 'Numéro de téléphone invalide. Utilisez un numéro sénégalais (77XXXXXXX) ou le format international (+221XXXXXXXXX).'})

        if Utilisateur.objects.filter(role='fournisseur', telephone=cleaned).exists():
            raise serializers.ValidationError({'telephone': 'Ce numéro est déjà utilisé par un autre fournisseur.'})

        attrs['telephone'] = cleaned
        return attrs

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
    modeles_compatibles = serializers.JSONField(required=False)
    mots_cles = serializers.JSONField(required=False)
    note_moyenne = serializers.SerializerMethodField()
    nombre_avis = serializers.SerializerMethodField()

    class Meta:
        model = Produit
        fields = [
            'id',
            'nom',
            'description',
            'prix',
            'stock',
            'categorie',
            'gestionnaire_stock',
            # Avis
            'note_moyenne', 'nombre_avis',
            # Compatibilité
            'modeles_compatibles', 'annee_debut', 'annee_fin',
            # Informations techniques
            'etat', 'garantie_mois', 'pays_origine', 'reference_oem',
            'poids', 'longueur', 'largeur', 'hauteur',
            # Stock
            'disponibilite', 'delai_livraison',
            # Complémentaires
            'mots_cles', 'conseils_installation', 'conditions_retour',
        ]
        read_only_fields = ['note_moyenne', 'nombre_avis']

    def get_nombre_avis(self, obj):
        Avis = apps.get_model('support', 'Avis')
        return Avis.objects.filter(produit=obj).count()

    def get_note_moyenne(self, obj):
        Avis = apps.get_model('support', 'Avis')
        result = Avis.objects.filter(produit=obj).aggregate(avg_note=Avg('note'), total=Count('id'))
        if not result or result.get('total', 0) == 0:
            return 0
        return round(float(result['avg_note']), 1)

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
        except Exception as e:
            print(f"DEBUG: Erreur validation: {e}")
            # Journaliser l'échec de connexion
            self._log_security(attrs.get('email'), 'login', status='failure')
            raise

        # ── Mettre à jour last_login (SimpleJWT ne le fait pas automatiquement)
        user = self.user
        if user is not None:
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])

            # Journaliser la connexion réussie
            request = self.context.get('request')
            ip = self._get_client_ip(request) if request else None
            try:
                SecurityActivity.objects.create(
                    user=user,
                    action='login',
                    ip_address=ip,
                    status='success',
                    metadata={'portal': request.data.get('portal') if request else None}
                )
            except Exception:
                pass

        # Portail demandé (client, fournisseur, admin)
        portal = request.data.get('portal') if request else None

        if portal:
            if portal == 'client':
                if user.role != 'client':
                    raise PermissionDenied(
                        "Ce compte n'est pas autorisé à accéder à l'espace Client. Veuillez utiliser le portail correspondant à votre rôle."
                    )

            elif portal == 'fournisseur':
                if user.role != 'fournisseur':
                    raise PermissionDenied(
                        "Ce compte n'est pas autorisé à accéder à l'espace Fournisseur."
                    )
                # Un compte fournisseur désactivé (refusé par l'admin) reste bloqué.
                if not user.is_active:
                    raise PermissionDenied(
                        "Votre compte est inactif. Veuillez contacter l'administrateur."
                    )
                # Les comptes en attente/suspendus peuvent se connecter : le front
                # redirige ensuite vers la page /fournisseur/en-attente.
                fournisseur = getattr(user, 'fournisseur', None)

            elif portal == 'admin':
                if user.role != 'admin' or not user.is_staff:
                    raise PermissionDenied(
                        "Accès refusé. Vous ne disposez pas des autorisations nécessaires pour accéder à cet espace."
                    )

        return result

    @staticmethod
    def _get_client_ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    @staticmethod
    def _log_security(email, action, status='failure'):
        """Journalise une tentative de connexion (échec) quand l'utilisateur existe."""
        try:
            user = Utilisateur.objects.filter(email__iexact=email or '').first()
            if user:
                request = None
                # On n'a pas toujours le contexte ; on log sans IP si indisponible.
                SecurityActivity.objects.create(
                    user=user,
                    action=action,
                    status=status,
                    metadata={'email': email}
                )
        except Exception:
            pass

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Ajoute le rôle et le statut dans le token
        token['role'] = user.role
        token['nom'] = user.nom
        token['prenom'] = user.prenom
        token['user_id'] = user.id
        token['is_active'] = user.is_active
        token['is_staff'] = user.is_staff
        if user.role == 'fournisseur' and hasattr(user, 'fournisseur'):
            token['fournisseur_status'] = user.fournisseur.statut
            token['fournisseur_raison_refus'] = user.fournisseur.raison_refus or ''
        else:
            token['fournisseur_status'] = None
            token['fournisseur_raison_refus'] = ''
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


class VehiculeClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehiculeClient
        fields = [
            'id', 'marque', 'modele', 'annee', 'motorisation', 'carburant',
            'version', 'immatriculation', 'actif', 'date_ajout'
        ]
        read_only_fields = ['id', 'date_ajout']

    def validate(self, data):
        if not data.get('marque'):
            raise serializers.ValidationError({'marque': 'La marque est obligatoire.'})
        if not data.get('modele'):
            raise serializers.ValidationError({'modele': 'Le modèle est obligatoire.'})
        if not data.get('annee'):
            raise serializers.ValidationError({'annee': 'L\'année est obligatoire.'})
        return data
