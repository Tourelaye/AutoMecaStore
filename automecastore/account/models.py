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
    is_staff = models.BooleanField(default=False)  # Pour accéder à l'admin
    date_joined = models.DateTimeField(auto_now_add=True)  # Optionnel mais pratique

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

    # class Meta:
    #     managed = False
    #     db_table = 'client'

# -----------------------------
# FournisseurProfile
# -----------------------------
class FournisseurProfile(models.Model):
    """Profil étendu pour les utilisateurs ayant le rôle fournisseur"""
    user = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, primary_key=True, related_name='fournisseur_profile')
    nom_entreprise = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    siret = models.CharField(max_length=20, blank=True, null=True)
    logo = models.ImageField(upload_to='fournisseurs/logos/', blank=True, null=True)
    date_inscription = models.DateTimeField(auto_now_add=True)
    
    # Statut du fournisseur géré par l'admin
    STATUT_CHOICES = [
        ('en_attente', 'En attente de validation'),
        ('actif', 'Actif'),
        ('suspendu', 'Suspendu'),
    ]
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    date_validation = models.DateTimeField(blank=True, null=True)
    valide_par = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, blank=True, related_name='fournisseurs_valides')
    
    # Statistiques
    note_moyenne = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)
    nombre_avis = models.PositiveIntegerField(default=0)
    nombre_produits = models.PositiveIntegerField(default=0)
    nombre_ventes = models.PositiveIntegerField(default=0)
    chiffre_affaires = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = 'fournisseur_profile'
        verbose_name = 'Profil Fournisseur'
        verbose_name_plural = 'Profils Fournisseurs'

    def __str__(self):
        return self.nom_entreprise or f"{self.user.nom} {self.user.prenom}"

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
# Journal d'activité (pour l'admin)
# -----------------------------
class JournalActivite(models.Model):
    """Journal de toutes les actions importantes pour l'admin"""
    CATEGORIE_CHOICES = [
        ('securite', 'Sécurité'),
        ('finances', 'Finances'),
        ('vendeurs', 'Vendeurs'),
        ('produits', 'Produits'),
        ('categories', 'Catégories'),
        ('systeme', 'Système'),
    ]
    
    ACTION_CHOICES = [
        ('creation', 'Création'),
        ('modification', 'Modification'),
        ('suppression', 'Suppression'),
        ('validation', 'Validation'),
        ('suspension', 'Suspension'),
        ('connexion', 'Connexion'),
        ('autre', 'Autre'),
    ]
    
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, blank=True)
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'journal_activite'
        verbose_name = 'Entrée du journal'
        verbose_name_plural = 'Journal d\'activité'
        ordering = ['-date_creation']

    def __str__(self):
        return f"[{self.get_categorie_display()}] {self.get_action_display()} - {self.date_creation.strftime('%d/%m/%Y %H:%M')}"