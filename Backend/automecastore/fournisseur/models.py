from django.db import models
from catalog.models import Produit


# -----------------------------
# Transaction (pour "Mes Ventes")
# -----------------------------
class Transaction(models.Model):
    commande = models.ForeignKey('orders.Commande', on_delete=models.CASCADE, related_name='transactions')
    fournisseur = models.ForeignKey('account.Fournisseur', on_delete=models.CASCADE, related_name='transactions')
    montant_brut = models.DecimalField(max_digits=10, decimal_places=2)
    commission = models.DecimalField(max_digits=10, decimal_places=2)
    revenu_net = models.DecimalField(max_digits=10, decimal_places=2)
    statut_reversement = models.CharField(
        max_length=20,
        choices=[('paye', 'Payé'), ('en_cours', 'En cours'), ('attente', 'En attente')],
        default='attente'
    )
    date_transaction = models.DateTimeField(auto_now_add=True)
    date_versement = models.DateTimeField(blank=True, null=True)
    reference_virement = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.reference_virement or 'N/A'} - {self.revenu_net} FCFA"


# -----------------------------
# HistoriqueActivite
# -----------------------------
class HistoriqueActivite(models.Model):
    TYPE_CHOICES = [
        ('produit', 'Produit'),
        ('commande', 'Commande'),
        ('stock', 'Stock'),
        ('promotion', 'Promotion'),
        ('profil', 'Profil'),
    ]

    fournisseur = models.ForeignKey('account.Fournisseur', on_delete=models.CASCADE, related_name='historiques')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    titre = models.CharField(max_length=200)
    detail = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} - {self.titre}"


# -----------------------------
# Notification
# -----------------------------
class Notification(models.Model):
    TYPE_CHOICES = [
        ('ORDER_CREATED', 'Commande créée'),
        ('PAYMENT_SUCCESS', 'Paiement confirmé'),
        ('PAYMENT_FAILED', 'Paiement échoué'),
        ('ORDER_ACCEPTED', 'Commande acceptée'),
        ('ORDER_REFUSED', 'Commande refusée'),
        ('ORDER_PREPARING', 'Commande en préparation'),
        ('ORDER_READY', 'Commande prête'),
        ('ORDER_DELIVERING', 'Commande en livraison'),
        ('ORDER_DELIVERED', 'Commande livrée'),
        ('ORDER_CANCELLED', 'Commande annulée'),
        ('PART_REQUEST_OFFER', 'Nouvelle offre sur demande'),
        ('OFFER_ACCEPTED', 'Offre acceptée'),
        ('REVIEW_CREATED', 'Avis publié'),
        ('REVIEW_REPLIED', 'Réponse à un avis'),
        ('NEW_SUPPLIER', 'Nouveau fournisseur à valider'),
        ('ADMIN_ALERT', 'Alerte admin'),
        ('commande', 'Nouvelle commande'),
        ('stock', 'Alerte stock'),
        ('promotion', 'Promotion'),
        ('avis', 'Nouvel avis'),
        ('systeme', 'Système'),
        ('demande', 'Demande de pièce'),
        ('offre', 'Offre'),
    ]

    DESTINATAIRE_CHOICES = [
        ('client', 'Client'),
        ('fournisseur', 'Fournisseur'),
        ('admin', 'Administrateur'),
    ]

    IMPORTANCE_CHOICES = [
        ('info', 'Information'),
        ('success', 'Succès'),
        ('warning', 'Avertissement'),
        ('danger', 'Critique'),
    ]

    destinataire_id = models.IntegerField()  # ID du fournisseur, admin ou client
    destinataire_type = models.CharField(max_length=20, choices=DESTINATAIRE_CHOICES)
    type = models.CharField(max_length=40, choices=TYPE_CHOICES)
    importance = models.CharField(max_length=10, choices=IMPORTANCE_CHOICES, default='info')
    titre = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    lien = models.CharField(max_length=255, blank=True)
    objet_type = models.CharField(max_length=50, blank=True, help_text="Type de l'objet lié")
    objet_id = models.PositiveIntegerField(blank=True, null=True, help_text="ID de l'objet lié")
    lu = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'fournisseur_notification'

    def __str__(self):
        return f"{self.type} - {self.destinataire_type}"


def creer_notification_fournisseur(fournisseur_id, type_notif, titre='', message='', lien='', importance='info', objet_type='', objet_id=None):
    """Crée une notification destinée à un fournisseur."""
    if not fournisseur_id:
        return None
    return Notification.objects.create(
        destinataire_id=fournisseur_id,
        destinataire_type='fournisseur',
        type=type_notif,
        importance=importance,
        titre=titre,
        message=message,
        lien=lien,
        objet_type=objet_type,
        objet_id=objet_id
    )


def creer_notification_client(client_id, type_notif='ORDER_CREATED', titre='', message='', lien='', importance='info', objet_type='', objet_id=None):
    """Crée une notification destinée à un client."""
    if not client_id:
        return None
    return Notification.objects.create(
        destinataire_id=client_id,
        destinataire_type='client',
        type=type_notif,
        importance=importance,
        titre=titre,
        message=message,
        lien=lien,
        objet_type=objet_type,
        objet_id=objet_id
    )


def creer_notification_admin(admin_id, type_notif='ADMIN_ALERT', titre='', message='', lien='', importance='info', objet_type='', objet_id=None):
    """Crée une notification destinée à un administrateur."""
    if not admin_id:
        return None
    return Notification.objects.create(
        destinataire_id=admin_id,
        destinataire_type='admin',
        type=type_notif,
        importance=importance,
        titre=titre,
        message=message,
        lien=lien,
        objet_type=objet_type,
        objet_id=objet_id
    )


# -----------------------------
# Magasin (informations boutique)
# -----------------------------
class Magasin(models.Model):
    fournisseur = models.OneToOneField(
        'account.Fournisseur',
        on_delete=models.CASCADE,
        related_name='magasin'
    )

    nom_magasin = models.CharField(max_length=200, blank=True)
    logo = models.ImageField(upload_to='magasins/logos/', blank=True, null=True)
    photo_couverture = models.ImageField(upload_to='magasins/covers/', blank=True, null=True)
    description = models.TextField(blank=True)

    telephone = models.CharField(max_length=20, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True, null=True)

    adresse_complete = models.TextField(blank=True)
    ville = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)

    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)

    horaires_ouverture = models.JSONField(default=dict, blank=True)
    jours_ouverture = models.CharField(max_length=255, blank=True)

    livraison_disponible = models.BooleanField(default=False)
    retrait_magasin = models.BooleanField(default=False)
    rayon_livraison_km = models.PositiveIntegerField(blank=True, null=True)

    MODE_TARIF_LIVRAISON = [
        ('non_defini', 'Non défini'),
        ('fixe', 'Tarif fixe'),
        ('zone', 'Tarif par zone'),
        ('distance', 'Tarif par distance'),
    ]
    mode_tarif_livraison = models.CharField(max_length=30, choices=MODE_TARIF_LIVRAISON, default='non_defini', blank=True)
    frais_livraison = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True)
    tarif_gratuit_desous = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True, help_text="Frais de livraison offerts à partir de ce montant")
    delai_livraison_estime = models.CharField(max_length=100, blank=True, help_text="Ex: Sous 24h, 48h...")

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    # Avis
    note_moyenne = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    nombre_avis = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'fournisseur_magasin'
        verbose_name = 'Magasin'
        verbose_name_plural = 'Magasins'

    def __str__(self):
        return self.nom_magasin or f"Magasin de {self.fournisseur.nom_entreprise}"
