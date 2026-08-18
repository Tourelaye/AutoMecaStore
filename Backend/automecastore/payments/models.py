from django.db import models
from account.models import Client
from orders.models import Commande, MODE_PAIEMENT
import uuid


class Paiement(models.Model):
    """
    Paiement extensible sans intégration de prestataire figée.
    - Le statut du paiement est découplé du statut de la commande.
    - Aucune donnée sensible (PIN, CVV, numéro de carte complet, etc.) n'est stockée.
    - La confirmation (réussite/échec/remboursement) ne peut venir que du backend
      (callback d'un vrai prestataire ou action administrateur).
    """

    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('en_cours', 'En cours'),
        ('reussi', 'Réussi'),
        ('echoue', 'Échoué'),
        ('annule', 'Annulé'),
        ('remboursement_demande', 'Remboursement demandé'),
        ('remboursement_en_cours', 'Remboursement en cours'),
        ('rembourse', 'Remboursé'),
        ('remboursement_refuse', 'Remboursement refusé'),
    ]

    # Aligné sur Commande.MODE_PAIEMENT pour rester cohérent
    MOYEN_CHOICES = MODE_PAIEMENT

    reference = models.CharField(
        max_length=100,
        unique=True,
        editable=False,
        null=True,
        blank=True
    )
    cle_idempotence = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        null=True,
        blank=True,
        help_text="Clé unique de l'initiation, utilisée pour éviter les doubles paiements côté serveur."
    )

    commande = models.ForeignKey(
        Commande,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='paiements'
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='paiements'
    )

    moyen = models.CharField(max_length=30, choices=MOYEN_CHOICES, default='a_la_livraison')
    statut = models.CharField(
        max_length=40,
        choices=STATUT_CHOICES,
        default='en_attente'
    )
    montant = models.DecimalField(max_digits=10, decimal_places=2)

    date_creation = models.DateTimeField(auto_now_add=True)
    date_mise_a_jour = models.DateTimeField(auto_now=True)

    # Tracabilité fournisseur (jamais de secret client)
    provider_reference = models.CharField(
        max_length=255,
        blank=True,
        help_text="Référence technique retournée par le prestataire de paiement futur."
    )
    motif_erreur = models.TextField(blank=True)
    remboursement_motif = models.TextField(blank=True)
    remboursement_montant = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Métadonnées techniques du prestataire. Ne jamais y stocker de secret."
    )

    class Meta:
        ordering = ['-date_creation']

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"PAY-{uuid.uuid4().hex[:10].upper()}"
        if not self.cle_idempotence:
            self.cle_idempotence = uuid.uuid4().hex
        super().save(*args, **kwargs)

    def peut_transitionner_vers(self, nouveau_statut):
        """Vérifie la légalité des transitions de statut."""
        transitions = {
            'en_attente': {'en_cours', 'reussi', 'echoue', 'annule'},
            'en_cours': {'reussi', 'echoue', 'annule'},
            'reussi': {'remboursement_demande'},
            'remboursement_demande': {'remboursement_en_cours', 'remboursement_refuse'},
            'remboursement_en_cours': {'rembourse', 'remboursement_refuse'},
            'echoue': set(),
            'annule': set(),
            'remboursement_refuse': set(),
            'rembourse': set(),
        }
        return nouveau_statut in transitions.get(self.statut, set())

    def __str__(self):
        return f"{self.reference or 'PAY-???'} - {self.get_moyen_display()} - {self.get_statut_display()}"