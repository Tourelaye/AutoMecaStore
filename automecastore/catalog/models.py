from django.db import models
from account.models import Utilisateur, Client, Administrateur, Invite

# -----------------------------
# Categorie
# -----------------------------
class Categorie(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField()
    datecreation = models.DateTimeField(auto_now_add=True)
    datemodification = models.DateTimeField(auto_now=True)
    etat = models.BooleanField(default=True)
    categorieid = models.IntegerField(blank=True, null=True)

    def __str__(self):
        return self.nom


# -----------------------------
# GestionnaireStock
# -----------------------------
class GestionnaireStock(models.Model):
    date_dernier_inventaire = models.DateField(blank=True, null=True)
    niveau_access_stock = models.CharField(max_length=10)

    def __str__(self):
        return f"GestionnaireStock {self.id}"


# -----------------------------
# Fournisseur
# -----------------------------
class Fournisseur(models.Model):
    nom_entreprise = models.CharField(max_length=100)
    delai_livraison = models.DateTimeField(blank=True, null=True)
    contrat_actif = models.BooleanField(default=True)
    note_fournisseur = models.FloatField(blank=True, null=True)
    administrateur = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.nom_entreprise


# -----------------------------
# Produit
# -----------------------------
class Produit(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField()
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    categorie = models.ForeignKey(Categorie, on_delete=models.SET_NULL, null=True, blank=True, related_name='produits')
    gestionnaire_stock = models.ForeignKey(GestionnaireStock, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.nom


# -----------------------------
# ProduitFavoris
# -----------------------------
class ProduitFavoris(models.Model):
    date_ajout = models.DateTimeField(auto_now_add=True)
    client = models.ForeignKey(Client, on_delete=models.CASCADE,null=True, blank=True)
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE,null=True, blank=True)

    class Meta:
        unique_together = ('client', 'produit')

    def __str__(self):
        return f"{self.client.user.email} - {self.produit.nom}"


# -----------------------------
# FournisseurProduit
# -----------------------------
class FournisseurProduit(models.Model):
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.CASCADE,null=True, blank=True)
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE,null=True, blank=True)
    prix_achat = models.DecimalField(max_digits=10, decimal_places=2)
    stock_initial = models.PositiveIntegerField(blank=True, null=True)
    date_livraison = models.DateTimeField(blank=True, null=True)


# -----------------------------
# Stock & Entrepot
# -----------------------------
class Entrepot(models.Model):
    nom = models.CharField(max_length=100)
    adresse = models.TextField()
    capacite_max = models.PositiveIntegerField(blank=True, null=True)
    gestionnaire_stock = models.OneToOneField(GestionnaireStock, on_delete=models.SET_NULL, blank=True, null=True)

    def __str__(self):
        return self.nom


class Stock(models.Model):
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, related_name='stocks',null=True, blank=True)
    entrepot = models.ForeignKey(Entrepot, on_delete=models.CASCADE,null=True, blank=True)
    quantite_actuelle = models.PositiveIntegerField()
    seuil_critique = models.PositiveIntegerField()
    date_derniere_maj = models.DateTimeField(auto_now=True,null=True, blank=True)
    gestionnaire_stock = models.ForeignKey(GestionnaireStock, on_delete=models.SET_NULL, null=True, blank=True)


# -----------------------------
# MouvementStock
# -----------------------------
class MouvementStock(models.Model):
    TYPE_CHOICES = [
        ('ENTREE', 'Entrée'),
        ('SORTIE', 'Sortie'),
    ]
    type_mouvement = models.CharField(max_length=10, choices=TYPE_CHOICES)
    quantite = models.PositiveIntegerField()
    date_mouvement = models.DateTimeField(auto_now_add=True)
    motif = models.TextField()
    gestionnaire_stock = models.ForeignKey(GestionnaireStock, on_delete=models.SET_NULL, null=True, blank=True)
    stock = models.ForeignKey(Stock, on_delete=models.SET_NULL, null=True, blank=True)
    produit = models.ForeignKey(Produit, on_delete=models.SET_NULL, null=True, blank=True)