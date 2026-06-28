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
    ]
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='client')

    # Champs pour Django
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # Pour accéder à l’admin
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

