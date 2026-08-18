from django.db import models
from django.utils import timezone
import datetime
import random
import string

from account.models import Client, Fournisseur
from catalog.models import Produit
from delivery.models import Vehicule
from orders.models import Commande


class DemandePiece(models.Model):
    """Demande d'une pièce difficile à trouver, créée par un client."""

    STATUT_CHOICES = [
        ('nouvelle', 'Nouvelle'),
        ('en_recherche', 'En recherche'),
        ('offres_recues', 'Offres reçues'),
        ('acceptee', 'Acceptée'),
        ('commande_creee', 'Commande créée'),
        ('terminee', 'Terminée'),
        ('annulee', 'Annulée'),
    ]

    reference = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True,
        editable=False,
        help_text="Référence unique REQ-AAAAMMJJ-XXXXXX"
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='demandes'
    )

    # Infos de contact (utiles si non connecté, mais pré-remplies)
    nom_contact = models.CharField(max_length=100, blank=True, default='')
    email_contact = models.EmailField(blank=True, default='')
    telephone_contact = models.CharField(max_length=30, blank=True, default='')

    # Description de la pièce
    piece_recherchee = models.CharField(max_length=200)
    reference_oem = models.CharField(max_length=100, blank=True, default='')
    quantite = models.PositiveIntegerField(default=1)
    description = models.TextField(blank=True, default='')

    # Véhicule cible
    vehicule = models.ForeignKey(
        Vehicule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='demandes'
    )
    marque_vehicule = models.CharField(max_length=50, blank=True, default='')
    modele_vehicule = models.CharField(max_length=50, blank=True, default='')
    annee_vehicule = models.IntegerField(blank=True, null=True)
    motorisation = models.CharField(max_length=100, blank=True, default='')
    version = models.CharField(max_length=100, blank=True, default='')

    # Localisation
    ville = models.CharField(max_length=100, blank=True, default='')
    quartier = models.CharField(max_length=100, blank=True, default='')
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)

    # Photos
    photo_piece = models.ImageField(upload_to='demandes/pieces/', blank=True, null=True)
    photo_vehicule = models.ImageField(upload_to='demandes/vehicules/', blank=True, null=True)

    # Statut
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='nouvelle'
    )

    date_creation = models.DateTimeField(auto_now_add=True)
    date_mise_a_jour = models.DateTimeField(auto_now=True)

    # Produit résultant (si un produit est créé ensuite)
    produit = models.ForeignKey(
        Produit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='demandes'
    )

    # Commande générée à l'acceptation d'une offre
    commande = models.ForeignKey(
        Commande,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='demande_source'
    )

    class Meta:
        ordering = ['-date_creation']

    def save(self, *args, **kwargs):
        if not self.reference:
            date_str = datetime.date.today().strftime('%Y%m%d')
            random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            self.reference = f"REQ-{date_str}-{random_str}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference or 'REQ-???'} - {self.piece_recherchee}"


class OffreFournisseur(models.Model):
    """Offre fournisseur en réponse à une demande de pièce."""

    STATUT_OFFRE = [
        ('en_attente', 'En attente'),
        ('acceptee', 'Acceptée'),
        ('rejetee', 'Rejetée'),
        ('convertie', 'Convertie en commande'),
    ]

    ETAT_PIECE = [
        ('neuf', 'Neuf'),
        ('occasion', 'Occasion'),
        ('reconditionne', 'Reconditionné'),
    ]

    DISPONIBILITE = [
        ('immediate', 'Disponible immédiatement'),
        ('sous_2_jours', 'Sous 2 jours'),
        ('sous_1_semaine', 'Sous 1 semaine'),
        ('sur_commande', 'Sur commande'),
    ]

    MODE_RECEPTION = [
        ('retrait', 'Retrait en magasin'),
        ('livraison', 'Livraison'),
        ('retrait_ou_livraison', 'Retrait ou livraison'),
    ]

    demande = models.ForeignKey(
        DemandePiece,
        on_delete=models.CASCADE,
        related_name='offres'
    )
    fournisseur = models.ForeignKey(
        Fournisseur,
        on_delete=models.CASCADE,
        related_name='offres'
    )

    prix = models.DecimalField(max_digits=10, decimal_places=2)
    etat = models.CharField(max_length=20, choices=ETAT_PIECE, default='neuf')
    garantie = models.CharField(max_length=100, blank=True, default='')
    disponibilite = models.CharField(
        max_length=20,
        choices=DISPONIBILITE,
        default='immediate'
    )
    delai = models.CharField(max_length=100, blank=True, default='')
    mode_reception = models.CharField(
        max_length=30,
        choices=MODE_RECEPTION,
        default='retrait_ou_livraison'
    )
    description = models.TextField(blank=True, default='')

    statut = models.CharField(
        max_length=20,
        choices=STATUT_OFFRE,
        default='en_attente'
    )

    commande = models.ForeignKey(
        Commande,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='offre_source'
    )

    date_creation = models.DateTimeField(auto_now_add=True)
    date_mise_a_jour = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['prix', '-date_creation']

    def __str__(self):
        return f"Offre {self.fournisseur.nom_entreprise} - {self.demande.reference}"
