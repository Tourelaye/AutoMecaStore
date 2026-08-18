from django.db import models
from django.utils import timezone
from account.models import Client, Livreur


# -----------------------------
# Partenaire de livraison (futur)
# -----------------------------
class PartenaireLivraison(models.Model):
    STATUT_CHOICES = [
        ('actif', 'Actif'),
        ('inactif', 'Inactif'),
    ]

    nom = models.CharField(max_length=200)
    identifiant = models.CharField(max_length=50, unique=True, blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, default='')
    email = models.EmailField(blank=True, null=True)
    contact_nom = models.CharField(max_length=100, blank=True, default='')
    zone_couverte = models.TextField(blank=True, default='')
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='actif')
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = 'delivery_partenaire'

    def __str__(self):
        return self.nom


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

    class Meta:
        db_table = 'delivery_vehicule'

    def __str__(self):
        return f"{self.type} - {self.plaque}"


# -----------------------------
# Adresse de livraison
# -----------------------------
class Adresse(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="adresses", null=True, blank=True)
    nom_destinataire = models.CharField(max_length=100, blank=True, default='', verbose_name="Nom du destinataire")
    telephone = models.CharField(max_length=20, blank=True, default='', verbose_name="Téléphone")
    ville = models.CharField(max_length=100, blank=True, default='')
    quartier = models.CharField(max_length=100, blank=True, default='')
    adresse = models.TextField(blank=True, default='', verbose_name="Adresse complète")
    point_de_repere = models.TextField(blank=True, default='', verbose_name="Point de repère")
    instructions = models.TextField(blank=True, default='', verbose_name="Instructions supplémentaires")
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    est_principale = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = 'delivery_adresse'
        ordering = ['-est_principale', '-created_at']

    def __str__(self):
        return f"{self.adresse}, {self.quartier}, {self.ville}"


# -----------------------------
# Livraison
# -----------------------------
class Livraison(models.Model):
    STATUT_LIVRAISON = [
        ('en_attente_attribution', 'En attente d\'attribution'),
        ('livraison_attribuee', 'Livraison attribuée'),
        ('en_preparation', 'En préparation'),
        ('prise_en_charge', 'Prise en charge'),
        ('en_cours_livraison', 'En cours de livraison'),
        ('livree', 'Livrée'),
        ('echec_livraison', 'Échec de livraison'),
        ('annulee', 'Annulée'),
    ]

    TYPE_RESPONSABLE = [
        ('non_attribue', 'Non attribué'),
        ('magasin', 'Magasin'),
        ('partenaire', 'Partenaire externe'),
        ('livreur', 'Livreur interne'),
    ]

    MODE_TARIF = [
        ('non_defini', 'Non défini'),
        ('fixe', 'Tarif fixe'),
        ('zone', 'Tarif par zone'),
        ('distance', 'Tarif par distance'),
        ('magasin', 'Tarif défini par le magasin'),
        ('partenaire', 'Tarif défini par le partenaire'),
    ]

    date_creation = models.DateTimeField(default=timezone.now, null=True, blank=True)
    date_attribution = models.DateTimeField(blank=True, null=True)
    date_livraison = models.DateTimeField(blank=True, null=True)
    delai_estime = models.DateTimeField(blank=True, null=True, verbose_name="Délai estimé")

    statut = models.CharField(max_length=30, choices=STATUT_LIVRAISON, default='en_attente_attribution')
    responsable_type = models.CharField(max_length=30, choices=TYPE_RESPONSABLE, default='non_attribue')
    mode_tarif = models.CharField(max_length=30, choices=MODE_TARIF, default='non_defini', blank=True)
    frais_livraison = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    instructions = models.TextField(blank=True, default='')
    remarque = models.TextField(blank=True, default='')

    commande = models.ForeignKey('orders.Commande', on_delete=models.CASCADE, related_name="livraisons", null=True, blank=True)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True)
    adresse = models.ForeignKey(Adresse, on_delete=models.SET_NULL, null=True, blank=True, related_name='livraisons')
    magasin = models.ForeignKey('fournisseur.Magasin', on_delete=models.SET_NULL, null=True, blank=True, related_name='livraisons')
    fournisseur = models.ForeignKey('account.Fournisseur', on_delete=models.SET_NULL, null=True, blank=True, related_name='livraisons')
    partenaire = models.ForeignKey(PartenaireLivraison, on_delete=models.SET_NULL, null=True, blank=True, related_name='livraisons')
    livreur = models.ForeignKey(Livreur, on_delete=models.SET_NULL, null=True, blank=True, related_name='livraisons')
    vehicule = models.ForeignKey(Vehicule, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'delivery_livraison'
        ordering = ['-date_creation']

    def __str__(self):
        return f"Livraison {self.commande.reference if self.commande else 'n/a'}"