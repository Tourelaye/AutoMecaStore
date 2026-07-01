from django.db import models
from account.models import Client
from orders.models import Commande
import uuid


class Paiement(models.Model):

    TYPE_CHOICES = [
        ('CARTE', 'Carte bancaire'),
        ('MOBILE', 'Mobile Money'),
        ('CASH', 'Paiement à la livraison'),
    ]

    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente'),
        ('CONFIRME', 'Confirmé'),
        ('ECHOUE', 'Échoué'),
    ]

    # ✅ IMPORTANT : rendu nullable pour éviter erreur migration
    reference = models.CharField(
        max_length=100,
        unique=True,
        editable=False,
        null=True,
        blank=True
    )

    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    date_paiement = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(
        max_length=40,
        choices=STATUT_CHOICES,
        default='EN_ATTENTE'
    )

    montant = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    commande = models.OneToOneField(
        Commande,
        on_delete=models.CASCADE,
        related_name="paiement",
        null=True,
        blank=True
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"PAY-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference} - {self.statut}"