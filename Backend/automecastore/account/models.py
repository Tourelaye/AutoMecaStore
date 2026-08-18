from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
# -----------------------------
# Personnalisation Utilisateur
# -----------------------------
class UtilisateurManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('L’email est requis')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def get_by_natural_key(self, username):
        # Recherche insensible à la casse et sans espaces
        return self.get(**{self.model.USERNAME_FIELD + '__iexact': username.strip()})

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)  # Important pour pouvoir se connecter

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Le superuser doit avoir is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Le superuser doit avoir is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


# Modèle Utilisateur
class Utilisateur(AbstractBaseUser, PermissionsMixin):
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    email = models.EmailField(unique=True, max_length=150)
    adresse = models.TextField(blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    ROLE_CHOICES = [
        ('client', 'Client'),
        ('admin', 'Administrateur'),
        ('fournisseur', 'Fournisseur'),
    ]
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='client')

    # Champs pour Django
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # Pour accéder à l’admin
    date_joined = models.DateTimeField(auto_now_add=True)  # Optionnel mais pratique

    # Paramètres de sécurité
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=64, blank=True, null=True)
    email_alerts_enabled = models.BooleanField(default=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)

    objects = UtilisateurManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nom', 'prenom']

    class Meta:
        db_table = 'utilisateur'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f"{self.nom} {self.prenom} ({self.email})"

# -----------------------------
# Administrateur
# -----------------------------
class Administrateur(models.Model):
    user = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, primary_key=True)
    date_embauche = models.DateField()
    

    # class Meta:
    #     managed = False
    #     db_table = 'administrateur'

# -----------------------------
# Client
# -----------------------------
class Client(models.Model):
    user = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, primary_key=True)
    date_inscription = models.DateTimeField(auto_now_add=True)
    point_fidelite = models.IntegerField(blank=True, null=True)
    mode_paiement_favoris = models.CharField(max_length=50, blank=True, null=True)
    note_livreur = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)
    livreur_id = models.IntegerField(blank=True, null=True)
    administrateur_id = models.IntegerField(blank=True, null=True)
    photo = models.ImageField(upload_to='clients/photos/', blank=True, null=True)

    # class Meta:
    #     managed = False
    #     db_table = 'client'

# -----------------------------
# Invite
# -----------------------------
class Invite(models.Model):
    user = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, primary_key=True)
    intention_inscription = models.BooleanField(blank=True, null=True)
    conversion_tentative = models.BooleanField(blank=True, null=True)
    derniere_connexion = models.DateTimeField(blank=True, null=True)
    temps_moyen_visite = models.TimeField(blank=True, null=True)

    # class Meta:
    #     managed = False
    #     db_table = 'invite'

# -----------------------------
# Livreur
# -----------------------------
class Livreur(models.Model):
    user = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, primary_key=True)
    zone_livraison = models.CharField(max_length=100)
    statut = models.CharField(max_length=20)
    nombre_livraison = models.IntegerField(blank=True, null=True)
    note_client_moyenne = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)

    # class Meta:
    #     managed = False
    #     db_table = 'livreur'

# -----------------------------
# Fournisseur
# -----------------------------
class Fournisseur(models.Model):
    user = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, primary_key=True)
    nom_entreprise = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    siret = models.CharField(max_length=50, blank=True, null=True)
    logo = models.ImageField(upload_to='fournisseurs/logos/', blank=True, null=True)
    date_inscription = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(
        max_length=20,
        choices=[
            ('attente', 'En attente de validation'),
            ('actif', 'Actif'),
            ('suspendu', 'Suspendu'),
            ('desactive', 'Désactivé'),
        ],
        default='attente'
    )
    date_validation = models.DateTimeField(blank=True, null=True)
    validated_by = models.ForeignKey('Administrateur', on_delete=models.SET_NULL, null=True, blank=True, related_name='fournisseurs_valides')
    raison_refus = models.TextField(blank=True, null=True)
    note_moyenne = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)
    nombre_avis = models.IntegerField(default=0)
    nombre_produits = models.IntegerField(default=0)
    nombre_ventes = models.IntegerField(default=0)
    chiffre_affaires = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = 'fournisseur'
        verbose_name = 'Fournisseur'
        verbose_name_plural = 'Fournisseurs'

    @property
    def nom_complet(self):
        return f"{self.user.nom} {self.user.prenom}".strip()

    def __str__(self):
        return f"{self.nom_entreprise} ({self.user.email})"


class FournisseurStatusHistory(models.Model):
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.CASCADE, related_name='status_history')
    statut = models.CharField(max_length=20)
    changed_by = models.ForeignKey('Administrateur', on_delete=models.SET_NULL, null=True, blank=True, related_name='fournisseur_status_changes')
    commentaire = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fournisseur_status_history'
        ordering = ['-created_at']
        verbose_name = 'Historique statut fournisseur'
        verbose_name_plural = 'Historiques statuts fournisseurs'

    def __str__(self):
        return f"{self.fournisseur.nom_entreprise} -> {self.statut} ({self.created_at:%Y-%m-%d %H:%M})"

# -----------------------------
# Véhicule du client
# -----------------------------
class VehiculeClient(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='vehicules')
    marque = models.CharField(max_length=50)
    modele = models.CharField(max_length=50)
    annee = models.PositiveIntegerField()
    motorisation = models.CharField(max_length=100, blank=True, default='')
    carburant = models.CharField(max_length=50, blank=True, default='')
    version = models.CharField(max_length=100, blank=True, default='')
    immatriculation = models.CharField(max_length=20, blank=True, default='')
    actif = models.BooleanField(default=False, help_text="Véhicule utilisé par défaut")
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'client_vehicule'
        ordering = ['-actif', '-date_ajout']
        verbose_name = 'Véhicule client'
        verbose_name_plural = 'Véhicules clients'

    def save(self, *args, **kwargs):
        # Un seul véhicule actif par client
        if self.actif:
            VehiculeClient.objects.filter(client=self.client, actif=True).update(actif=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.marque} {self.modele} {self.annee} — {self.client.user.email}"


# -----------------------------
# Favori
# -----------------------------
class Favori(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='favoris')
    produit = models.ForeignKey('catalog.Produit', on_delete=models.CASCADE, related_name='favoris')
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['client', 'produit']  # Un client ne peut ajouter le même produit qu'une fois
        verbose_name = 'Favori'
        verbose_name_plural = 'Favoris'
        ordering = ['-date_ajout']

    def __str__(self):
        return f"{self.client.user.email} - {self.produit.nom}"


# -----------------------------
# Sécurité du compte
# -----------------------------
class SecurityActivity(models.Model):
    ACTION_CHOICES = [
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('password_change', 'Changement de mot de passe'),
        ('password_change_failed', 'Échec changement mot de passe'),
        ('two_factor_enabled', '2FA activé'),
        ('two_factor_disabled', '2FA désactivé'),
        ('session_revoked', 'Session révoquée'),
        ('all_sessions_revoked', 'Toutes les sessions révoquées'),
        ('token_created', 'Clé API créée'),
        ('token_revoked', 'Clé API révoquée'),
        ('account_deactivated', 'Compte désactivé'),
        ('security_alert', 'Alerte sécurité'),
    ]

    user = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='security_activities')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='success', choices=[
        ('success', 'Succès'),
        ('failure', 'Échec'),
        ('info', 'Info'),
        ('warning', 'Avertissement'),
    ])
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        db_table = 'security_activity'

    def __str__(self):
        return f"{self.user.email} - {self.action} ({self.timestamp})"


class UserSession(models.Model):
    user = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='security_sessions')
    session_key = models.CharField(max_length=128, unique=True)
    device_name = models.CharField(max_length=200, blank=True)
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_active_at = models.DateTimeField(auto_now=True)
    is_current = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-last_active_at']
        db_table = 'user_session'

    def __str__(self):
        return f"{self.user.email} - {self.device_name} ({'actuel' if self.is_current else 'autre'})"


class APIToken(models.Model):
    user = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='api_tokens')
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=64, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'api_token'

    def save(self, *args, **kwargs):
        if not self.key:
            import secrets
            self.key = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.user.email}"
