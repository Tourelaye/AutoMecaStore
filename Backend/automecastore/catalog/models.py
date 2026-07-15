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
# TypePiece (Sous-catégorie)
# -----------------------------
class TypePiece(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    categorie = models.ForeignKey(
        Categorie,
        on_delete=models.CASCADE,
        related_name="types_pieces",
        null=True,
        blank=True
    )
    datecreation = models.DateTimeField(auto_now_add=True)
    datemodification = models.DateTimeField(auto_now=True)
    etat = models.BooleanField(default=True)

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
# Fournisseur (source produit)
# -----------------------------
class Fournisseur(models.Model):
    nom_entreprise = models.CharField(max_length=100)
    delai_livraison = models.DateTimeField(blank=True, null=True)
    contrat_actif = models.BooleanField(default=True)
    note_fournisseur = models.FloatField(blank=True, null=True)
    administrateur = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, blank=True, related_name='catalog_fournisseurs')

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
    type_piece = models.ForeignKey('TypePiece', on_delete=models.SET_NULL, null=True, blank=True, related_name='produits')
    gestionnaire_stock = models.ForeignKey(GestionnaireStock, on_delete=models.SET_NULL, null=True, blank=True)

    # Champs pour les ventes flash
    image           = models.ImageField(upload_to='products/', blank=True, null=True)
    image_2         = models.ImageField(upload_to='products/', blank=True, null=True)
    image_3         = models.ImageField(upload_to='products/', blank=True, null=True)
    image_4         = models.ImageField(upload_to='products/', blank=True, null=True)
    est_en_promo    = models.BooleanField(default=False)
    prix_promo      = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    pourcentage_reduction = models.PositiveIntegerField(blank=True, null=True, help_text="Pourcentage de réduction (ex: 20 pour 20%)")
    date_debut_promo = models.DateTimeField(blank=True, null=True, help_text="Date de début de la promotion")
    date_fin_promo  = models.DateTimeField(blank=True, null=True, help_text="Date de fin de la promotion")

    # Vente éclair (vente limitée dans le temps par heure)
    vente_eclair    = models.BooleanField(default=False, help_text="Produit en vente éclair")
    heure_debut_eclair = models.TimeField(blank=True, null=True, help_text="Heure de début de la vente éclair")
    heure_fin_eclair = models.TimeField(blank=True, null=True, help_text="Heure de fin de la vente éclair")

    # Tags administrateur pour les sections d'accueil
    est_vedette     = models.BooleanField(default=False, help_text="Produit vedette")
    est_tendance    = models.BooleanField(default=False, help_text="Produit tendance")
    est_recommande  = models.BooleanField(default=False, help_text="Produit recommandé")
    est_bestseller  = models.BooleanField(default=False, help_text="Bestseller")

    # Statistiques
    nombre_vues     = models.PositiveIntegerField(default=0, help_text="Nombre de vues du produit")
    nombre_favoris  = models.PositiveIntegerField(default=0, help_text="Nombre d'ajouts aux favoris")
    nombre_ventes   = models.PositiveIntegerField(default=0, help_text="Nombre de ventes totales")

    reference       = models.CharField(max_length=50, blank=True, null=True)
    marque          = models.CharField(max_length=100, blank=True, null=True)
    
    # Fournisseur
    fournisseur = models.ForeignKey(
        'account.Fournisseur',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='produits'
    )

    # Statut online (actif / inactif)
    statut = models.CharField(
        max_length=20,
        choices=[('actif', 'Actif'), ('inactif', 'Inactif')],
        default='actif'
    )

    # Approbation admin
    statut_approbation = models.CharField(
        max_length=20,
        choices=[('en_attente', 'En attente'), ('approuve', 'Approuvé'), ('rejete', 'Rejeté')],
        default='en_attente'
    )
    motif_rejet = models.TextField(blank=True, null=True)
    signale = models.BooleanField(default=False)

    # Soft delete - champ pour désactiver le produit au lieu de le supprimer
    is_active       = models.BooleanField(default=True)
    date_suppression = models.DateTimeField(null=True, blank=True)

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
# Livraison
# -----------------------------
class Livraison(models.Model):
    STATUT_CHOICES = [
        ('en_preparation', 'En préparation'),
        ('en_cours', 'En cours'),
        ('livree', 'Livrée'),
        ('annulee', 'Annulée'),
    ]

    commande_id = models.CharField(max_length=100, verbose_name="N° Commande")
    client = models.CharField(max_length=255, verbose_name="Client")
    adresse = models.TextField(verbose_name="Adresse de livraison")
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_preparation', verbose_name="Statut")
    transporteur = models.CharField(max_length=100, blank=True, null=True, verbose_name="Transporteur")
    tracking = models.CharField(max_length=100, blank=True, null=True, verbose_name="Numéro de tracking")
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    date_livraison = models.DateTimeField(blank=True, null=True, verbose_name="Date de livraison effective")

    def __str__(self):
        return f"{self.commande_id} - {self.client}"

    class Meta:
        ordering = ['-date_creation']
        verbose_name = "Livraison"
        verbose_name_plural = "Livraisons"


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