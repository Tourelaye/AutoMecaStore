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
    ordre = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['ordre', 'nom']

    def __str__(self):
        return self.nom


class Marque(models.Model):
    nom = models.CharField(max_length=100, unique=True)
    logo = models.ImageField(upload_to='marques/', blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    est_visible = models.BooleanField(default=True)
    ordre = models.PositiveIntegerField(default=0)
    datecreation = models.DateTimeField(auto_now_add=True)
    datemodification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['ordre', 'nom']

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
    est_meilleure_offre = models.BooleanField(default=False, help_text="Meilleure offre / bon plan")

    # Statistiques
    nombre_vues     = models.PositiveIntegerField(default=0, help_text="Nombre de vues du produit")
    nombre_favoris  = models.PositiveIntegerField(default=0, help_text="Nombre d'ajouts aux favoris")
    nombre_ventes   = models.PositiveIntegerField(default=0, help_text="Nombre de ventes totales")

    reference       = models.CharField(max_length=50, blank=True, null=True, help_text="Référence interne vendeur (SKU)")
    marque          = models.CharField(max_length=100, blank=True, null=True, help_text="Marque de la pièce")
    fabricant       = models.CharField(max_length=100, blank=True, default='', help_text="Fabricant")

    # Compatibilité véhicule
    modeles_compatibles = models.JSONField(default=list, blank=True, help_text="Liste des modèles compatibles")
    annee_debut     = models.PositiveIntegerField(blank=True, null=True, help_text="Année de début de compatibilité")
    annee_fin       = models.PositiveIntegerField(blank=True, null=True, help_text="Année de fin de compatibilité")
    compatibilites  = models.JSONField(default=list, blank=True, help_text="Liste détaillée des compatibilités (marque, modèle, version, motorisation, années)")

    # Informations techniques
    ETAT_CHOICES = [
        ('neuf', 'Neuf'),
        ('occasion', 'Occasion'),
        ('reconditionne', 'Reconditionné'),
    ]
    etat            = models.CharField(max_length=20, choices=ETAT_CHOICES, default='neuf', blank=True)

    GARANTIE_CHOICES = [
        (0, 'Sans garantie'),
        (3, '3 mois'),
        (6, '6 mois'),
        (12, '12 mois'),
        (24, '24 mois'),
    ]
    garantie_mois   = models.PositiveIntegerField(choices=GARANTIE_CHOICES, default=0, blank=True)
    garantie_disponible = models.BooleanField(default=False, help_text="Produit sous garantie")
    conditions_garantie = models.TextField(blank=True, default='', help_text="Conditions de la garantie")

    PAYS_CHOICES = [
        ('japon', 'Japon'),
        ('allemagne', 'Allemagne'),
        ('france', 'France'),
        ('coree_sud', 'Corée du Sud'),
        ('chine', 'Chine'),
        ('usa', 'États-Unis'),
        ('italie', 'Italie'),
        ('espagne', 'Espagne'),
        ('turquie', 'Turquie'),
        ('inde', 'Inde'),
    ]
    pays_origine    = models.CharField(max_length=50, choices=PAYS_CHOICES, blank=True, default='')
    reference_oem   = models.CharField(max_length=100, blank=True, default='', help_text="Référence OEM / constructeur")

    poids           = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True, help_text="Poids en kg")
    longueur        = models.DecimalField(max_digits=6, decimal_places=1, blank=True, null=True, help_text="Longueur en cm")
    largeur         = models.DecimalField(max_digits=6, decimal_places=1, blank=True, null=True, help_text="Largeur en cm")
    hauteur         = models.DecimalField(max_digits=6, decimal_places=1, blank=True, null=True, help_text="Hauteur en cm")
    matiere         = models.CharField(max_length=100, blank=True, default='', help_text="Matière / matériau")
    couleur         = models.CharField(max_length=100, blank=True, default='', help_text="Couleur")

    # Gestion du stock
    DISPONIBILITE_CHOICES = [
        ('en_stock', 'En stock'),
        ('faible_stock', 'Faible stock'),
        ('rupture', 'Rupture de stock'),
        ('precommande', 'Précommande'),
    ]
    disponibilite   = models.CharField(max_length=20, choices=DISPONIBILITE_CHOICES, default='en_stock', blank=True)
    seuil_alerte    = models.PositiveIntegerField(blank=True, null=True, help_text="Seuil d'alerte stock faible")
    quantite_min    = models.PositiveIntegerField(blank=True, null=True, help_text="Quantité minimale de commande")

    DELAI_LIVRAISON_CHOICES = [
        ('same_day', 'Livraison le jour même'),
        ('24h', '24 heures'),
        ('48h', '48 heures'),
        ('2_5j', '2 à 5 jours'),
        ('5_7j', '5 à 7 jours'),
        ('7j_plus', 'Plus de 7 jours'),
    ]
    delai_livraison = models.CharField(max_length=20, choices=DELAI_LIVRAISON_CHOICES, default='2_5j', blank=True)

    PREPARATION_CHOICES = [
        ('24h', '24 heures'),
        ('48h', '48 heures'),
        ('72h', '72 heures'),
        ('4_5j', '4 à 5 jours'),
        ('6_7j', '6 à 7 jours'),
        ('7j_plus', 'Plus de 7 jours'),
    ]
    livraison_disponible = models.BooleanField(default=False, help_text="Livraison disponible pour ce produit")
    retrait_magasin = models.BooleanField(default=False, help_text="Retrait en magasin disponible")
    delai_preparation = models.CharField(max_length=20, choices=PREPARATION_CHOICES, default='24h', blank=True, help_text="Délai de préparation avant expédition")

    # Informations complémentaires
    description_courte = models.TextField(blank=True, default='', help_text="Description courte (accroche)")
    description     = models.TextField(help_text="Description détaillée du produit")
    description_detaillee = models.TextField(blank=True, default='', help_text="Description détaillée complète")
    precautions     = models.TextField(blank=True, default='', help_text="Précautions d'usage")
    mots_cles       = models.JSONField(default=list, blank=True, help_text="Mots-clés pour la recherche")
    conseils_installation = models.TextField(blank=True, default='', help_text="Conseils d'installation")
    conditions_retour = models.TextField(blank=True, default='', help_text="Conditions de retour")

    # Images
    image_principale_index = models.PositiveIntegerField(default=1, help_text="Index de l'image principale (1 à 4)")

    # Fournisseur
    fournisseur = models.ForeignKey(
        'account.Fournisseur',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='produits'
    )

    # Avis
    note_moyenne = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    nombre_avis = models.PositiveIntegerField(default=0)

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

    # Date d'ajout du produit (utilisée pour le filtre Nouveautés)
    date_ajout      = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    # Date de dernière mise à jour du stock
    date_derniere_maj_stock = models.DateTimeField(null=True, blank=True)

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
    prix_vente = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True,
                                     help_text="Prix de vente spécifique à ce fournisseur/magasin. Si vide, le prix du produit est utilisé.")
    stock_initial = models.PositiveIntegerField(blank=True, null=True)
    stock_disponible = models.PositiveIntegerField(blank=True, null=True,
                                                  help_text="Stock spécifique à ce fournisseur/magasin. Si vide, le stock du produit est utilisé.")
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
        ('entree', 'Entrée'),
        ('sortie', 'Sortie'),
        ('retour', 'Retour'),
        ('correction', 'Correction'),
    ]
    type_mouvement = models.CharField(max_length=20, choices=TYPE_CHOICES)
    quantite = models.PositiveIntegerField()
    date_mouvement = models.DateTimeField(auto_now_add=True)
    observation = models.TextField(blank=True, default='')
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, blank=True, related_name='mouvements_stock')
    gestionnaire_stock = models.ForeignKey(GestionnaireStock, on_delete=models.SET_NULL, null=True, blank=True)
    stock = models.ForeignKey(Stock, on_delete=models.SET_NULL, null=True, blank=True)
    produit = models.ForeignKey(Produit, on_delete=models.SET_NULL, null=True, blank=True, related_name='mouvements_stock')

    class Meta:
        ordering = ['-date_mouvement']

    def __str__(self):
        return f"{self.type_mouvement} - {self.quantite} - {self.produit}"


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
    TYPE_PROMOTION = [
        ('pourcentage', 'Réduction en pourcentage'),
        ('montant_fixe', 'Réduction en montant fixe'),
        ('vente_flash', 'Vente Flash'),
        ('offre_speciale', 'Offre spéciale'),
        ('produit_vedette', 'Produit en vedette'),
        ('nouveau_produit', 'Nouveau produit'),
        ('dernieres_pieces', 'Dernières pièces disponibles'),
    ]

    STATUT_PROMOTION = [
        ('active', 'Active'),
        ('a_venir', 'À venir'),
        ('terminee', 'Terminée'),
        ('suspendue', 'Suspendue'),
    ]

    fournisseur = models.ForeignKey('account.Fournisseur', on_delete=models.CASCADE, related_name='promotions')
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, related_name='promotions', null=True, blank=True)

    nom = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    type_promotion = models.CharField(max_length=20, choices=TYPE_PROMOTION, default='pourcentage')
    pourcentage = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    valeur_reduction = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True,
                                           help_text="Montant fixe de réduction (pour montant_fixe) ou valeur selon le type")

    date_debut = models.DateTimeField()
    heure_debut = models.TimeField(blank=True, null=True)
    date_fin = models.DateTimeField()
    heure_fin = models.TimeField(blank=True, null=True)

    quantite_min = models.PositiveIntegerField(blank=True, null=True, help_text="Quantité minimale pour bénéficier de la promotion")
    nombre_max_utilisations = models.PositiveIntegerField(blank=True, null=True, help_text="Nombre maximal d'utilisations de la promotion")
    nb_utilisations = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)
    statut = models.CharField(max_length=20, choices=STATUT_PROMOTION, default='a_venir')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nom or self.type_promotion} - {self.produit.nom if self.produit else 'Sans produit'}"


# -----------------------------
# DemandePiece (demande client pour pièce introuvable)
# -----------------------------
class DemandePiece(models.Model):
    STATUT_CHOICES = [
        ('nouvelle', 'Nouvelle'),
        ('en_cours', 'En cours de traitement'),
        ('traitee', 'Traitée'),
        ('cloturee', 'Clôturée'),
    ]

    piece_recherchee = models.CharField(max_length=200, help_text="Nom ou description de la pièce recherchée")
    marque_vehicule = models.CharField(max_length=100, blank=True, default='')
    modele_vehicule = models.CharField(max_length=100, blank=True, default='')
    annee_vehicule = models.CharField(max_length=20, blank=True, default='')
    reference = models.CharField(max_length=100, blank=True, default='', help_text="Référence éventuelle")
    description = models.TextField(blank=True, default='', help_text="Description complémentaire")
    photo = models.ImageField(upload_to='demandes-pieces/', blank=True, null=True)

    # Client (si connecté)
    client = models.ForeignKey('account.Client', on_delete=models.SET_NULL, null=True, blank=True)
    nom_client = models.CharField(max_length=100, blank=True, default='')
    email_client = models.EmailField(blank=True, default='')
    telephone_client = models.CharField(max_length=20, blank=True, default='')

    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='nouvelle')
    date_creation = models.DateTimeField(auto_now_add=True)
    date_traitement = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_creation']
        db_table = 'catalog_demande_piece'

    def __str__(self):
        return f"Demande: {self.piece_recherchee} - {self.nom_client or 'Anonyme'}"