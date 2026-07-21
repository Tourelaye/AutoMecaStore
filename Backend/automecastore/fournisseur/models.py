from django.db import models
from catalog.models import Produit
from orders.models import Commande


# -----------------------------
# Transaction (pour "Mes Ventes")
# -----------------------------
class Transaction(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='transactions')
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
        ('commande', 'Nouvelle commande'),
        ('stock', 'Alerte stock'),
        ('promotion', 'Promotion'),
        ('avis', 'Nouvel avis'),
        ('systeme', 'Système'),
    ]

    destinataire_id = models.IntegerField()  # ID du fournisseur ou admin
    destinataire_type = models.CharField(max_length=20, choices=[('fournisseur', 'Fournisseur'), ('admin', 'Admin')])
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    titre = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    lien = models.CharField(max_length=255, blank=True)
    lu = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'fournisseur_notification'

    def __str__(self):
        return f"{self.type} - {self.destinataire_type}"


def creer_notification_fournisseur(fournisseur_id, type_notif, titre='', message='', lien=''):
    """Crée une notification destinée à un fournisseur."""
    if not fournisseur_id:
        return None
    return Notification.objects.create(
        destinataire_id=fournisseur_id,
        destinataire_type='fournisseur',
        type=type_notif,
        titre=titre,
        message=message,
        lien=lien
    )
