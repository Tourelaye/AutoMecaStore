from django.db import models
from account.models import Client, Livreur
from orders.models import Commande


# -----------------------------
# Vehicule
# -----------------------------
class Vehicule(models.Model):
    TYPE_CHOICES = [
        ('MOTO', 'Moto'),
        ('VOITURE', 'Voiture'),
        ('CAMION', 'Camion'),
    ]

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    marque = models.CharField(max_length=50, blank=True, null=True)
    plaque = models.CharField(max_length=30, unique=True, null=True, blank=True)
    annee = models.IntegerField(blank=True, null=True)
    livreur = models.ForeignKey(Livreur, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.type} - {self.plaque}"


# -----------------------------
# Adresse
# -----------------------------
class Adresse(models.Model):
    rue = models.CharField(max_length=100)
    ville = models.CharField(max_length=50)
    code_postal = models.CharField(max_length=20)
    pays = models.CharField(max_length=50)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="adresses", null=True, blank=True)

    def __str__(self):
        return f"{self.rue}, {self.ville}"


# -----------------------------
# Livraison
# -----------------------------
class Livraison(models.Model):
    STATUT_CHOICES = [
        ('PREPAREE', 'Préparée'),
        ('EN_COURS', 'En cours'),
        ('LIVREE', 'Livrée'),
        ('ANNULEE', 'Annulée'),
    ]

    date_creation = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    date_livraison = models.DateTimeField(blank=True, null=True)
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='PREPAREE')
    frais_livraison = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    remarque = models.TextField(blank=True, null=True)

    commande = models.OneToOneField(Commande, on_delete=models.CASCADE, related_name="livraison",null=True, blank=True)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True)
    livreur = models.ForeignKey(Livreur, on_delete=models.SET_NULL, null=True, blank=True)
    vehicule = models.ForeignKey(Vehicule, on_delete=models.SET_NULL, null=True, blank=True)
    adresse = models.ForeignKey(Adresse, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Livraison {self.commande.reference}"