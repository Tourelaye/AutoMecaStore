from django.db import models
from account.models import Utilisateur, Client, Administrateur, Invite


# Manager personnalisé pour filtrer les produits actifs
class ProduitActifManager(models.Manager):
    def get_queryset(self):
        from django.db.models import Q
        return super().get_queryset().filter(Q(is_active=True) | Q(is_active__isnull=True))


# Manager pour tous les produits (même inactifs)
class ProduitTousManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset()


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
# SousCategorie (Type de pièce)
# -----------------------------
class SousCategorie(models.Model):
    nom = models.CharField(max_length=100)
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE, related_name='sous_categories')
    description = models.TextField(blank=True, null=True)
    datecreation = models.DateTimeField(auto_now_add=True)
    datemodification = models.DateTimeField(auto_now=True)
    etat = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.categorie.nom} - {self.nom}"

    class Meta:
        verbose_name = "Sous-catégorie"
        verbose_name_plural = "Sous-catégories"
        ordering = ['categorie', 'nom']


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
    CATEGORIE_VEHICULE_CHOICES = [
        ('automobile', 'Automobile'),
        ('moto', 'Moto'),
        ('poids_lourd', 'Poids lourd'),
        ('velo', 'Vélo'),
    ]

    nom = models.CharField(max_length=100)
    description = models.TextField()
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    seuil_critique = models.PositiveIntegerField(default=5)
    categorie = models.ForeignKey(Categorie, on_delete=models.SET_NULL, null=True, blank=True, related_name='produits')
    sous_categorie = models.ForeignKey(SousCategorie, on_delete=models.SET_NULL, null=True, blank=True, related_name='produits')
    fournisseur = models.ForeignKey('account.Fournisseur', on_delete=models.SET_NULL, null=True, blank=True, related_name='produits')
    gestionnaire_stock = models.ForeignKey(GestionnaireStock, on_delete=models.SET_NULL, null=True, blank=True)

    # Champs pour les ventes flash
    image           = models.ImageField(upload_to='produits/', blank=True, null=True)
    image_secondaire_1 = models.ImageField(upload_to='produits/', blank=True, null=True)
    image_secondaire_2 = models.ImageField(upload_to='produits/', blank=True, null=True)
    image_secondaire_3 = models.ImageField(upload_to='produits/', blank=True, null=True)
    est_en_promo    = models.BooleanField(default=False)
    prix_promo      = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    pourcentage_reduction = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    date_debut_promo = models.DateTimeField(blank=True, null=True)
    date_fin_promo  = models.DateTimeField(blank=True, null=True)
    reference       = models.CharField(max_length=50, blank=True, null=True)
    marque          = models.CharField(max_length=100, blank=True, null=True)
    categorie_vehicule = models.CharField(max_length=20, choices=CATEGORIE_VEHICULE_CHOICES, blank=True, null=True)
    type_piece      = models.CharField(max_length=100, blank=True, null=True)

    # Vente éclair
    vente_eclair    = models.BooleanField(default=False)
    heure_debut_eclair = models.TimeField(blank=True, null=True)
    heure_fin_eclair = models.TimeField(blank=True, null=True)

    # Tags admin
    est_vedette     = models.BooleanField(default=False)
    est_tendance    = models.BooleanField(default=False)
    est_recommande  = models.BooleanField(default=False)
    est_bestseller  = models.BooleanField(default=False)

    # Statut
    statut          = models.CharField(max_length=20, choices=[('actif', 'Actif'), ('inactif', 'Inactif')], default='actif')

    # Soft delete - champ pour désactiver le produit au lieu de le supprimer
    is_active       = models.BooleanField(default=True)
    date_suppression = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    # Managers
    objects = ProduitActifManager()  # Par défaut, ne retourne que les actifs
    all_objects = ProduitTousManager()  # Retourne tous les produits

    def __str__(self):
        return self.nom
    
    def soft_delete(self):
        """Désactive le produit au lieu de le supprimer physiquement"""
        from django.utils import timezone
        self.is_active = False
        self.date_suppression = timezone.now()
        self.save()
    
    def restore(self):
        """Réactive un produit supprimé"""
        self.is_active = True
        self.date_suppression = None
        self.save()


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


# -----------------------------
# Avis
# -----------------------------
class Avis(models.Model):
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, related_name='avis')
    fournisseur = models.ForeignKey('account.Fournisseur', on_delete=models.CASCADE, null=True, blank=True)
    client_nom = models.CharField(max_length=200)
    note = models.PositiveIntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    commentaire = models.TextField()
    date = models.DateTimeField(auto_now_add=True)
    reponse_fournisseur = models.TextField(blank=True, null=True)
    date_reponse = models.DateTimeField(blank=True, null=True)
    statut = models.CharField(max_length=20, choices=[('visible', 'Visible'), ('cache', 'Caché')], default='visible')

    def __str__(self):
        return f"{self.client_nom} - {self.note}/5"


# -----------------------------
# Promotion
# -----------------------------
class Promotion(models.Model):
    fournisseur = models.ForeignKey('account.Fournisseur', on_delete=models.CASCADE, related_name='promotions')
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, related_name='promotions', null=True, blank=True)
    pourcentage = models.DecimalField(max_digits=5, decimal_places=2)
    date_debut = models.DateTimeField()
    date_fin = models.DateTimeField()
    statut = models.CharField(max_length=20, choices=[('active', 'Active'), ('planifiee', 'Planifiée'), ('expiree', 'Expirée')], default='planifiee')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.pourcentage}% - {self.fournisseur.nom_entreprise}"