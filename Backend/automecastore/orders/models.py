from django.db import models
from django.conf import settings
from account.models import Client, Administrateur, Invite
from catalog.models import Produit
from account.models import Fournisseur


# -----------------------------
# Statuts partagés
# -----------------------------
STATUT_COMMANDE = [
    ('nouvelle_commande', 'Nouvelle commande'),
    ('en_attente_paiement', 'En attente de paiement'),
    ('en_attente_confirmation', 'En attente de confirmation'),
    ('acceptee', 'Acceptée'),
    ('en_preparation', 'En préparation'),
    ('prete_a_retirer', 'Prête à être retirée'),
    ('en_cours_livraison', 'En cours de livraison'),
    ('livree', 'Livrée'),
    ('terminee', 'Terminée'),
    ('refusee', 'Refusée'),
    ('annulee', 'Annulée'),
]

MODE_PAIEMENT = [
    ('especes', 'Espèces'),
    ('carte', 'Carte bancaire'),
    ('mobile_money', 'Mobile Money'),
    ('virement', 'Virement'),
    ('a_la_livraison', 'Paiement à la livraison'),
    ('a_la_retrait', 'Paiement au retrait'),
]

MODE_RECEPTION = [
    ('livraison', 'Livraison à domicile'),
    ('retrait_magasin', 'Retrait en magasin'),
]


# -----------------------------
# Commande
# -----------------------------
class Commande(models.Model):
    date_commande = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=30, choices=STATUT_COMMANDE, default='nouvelle_commande')
    montant_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    frais_livraison = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    client = models.ForeignKey(Client, on_delete=models.SET_NULL, related_name='commandes', null=True, blank=True)
    administrateur = models.ForeignKey(Administrateur, on_delete=models.SET_NULL, null=True, blank=True)
    livreur = models.ForeignKey('account.Livreur', on_delete=models.SET_NULL, null=True, blank=True)
    reference = models.CharField(max_length=20, unique=True, blank=True, null=True)

    mode_paiement = models.CharField(max_length=30, choices=MODE_PAIEMENT, default='a_la_livraison', blank=True)
    mode_reception = models.CharField(max_length=30, choices=MODE_RECEPTION, default='livraison', blank=True)
    adresse_livraison = models.TextField(blank=True, help_text="Adresse de livraison si mode livraison")
    telephone_client = models.CharField(max_length=20, blank=True, help_text="Téléphone de contact pour cette commande")
    commentaire_fournisseur = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if not self.reference:
            # Générer référence automatique unique
            import datetime
            import random
            import string
            date_str = datetime.date.today().strftime('%Y%m%d')
            random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            self.reference = f"CMD{date_str}-{random_str}"
        super().save(*args, **kwargs)

        # Créer automatiquement les transactions fournisseur quand la commande est terminée
        if self.statut == 'terminee' and self.pk:
            from decimal import Decimal
            from django.db.models import Sum
            from fournisseur.models import Transaction
            from admin_api.models import FinanceConfig

            try:
                config = FinanceConfig.objects.first()
                taux_commission = Decimal(str(config.commission_rate)) if config else Decimal('10.00')
            except Exception:
                taux_commission = Decimal('10.00')

            fournisseurs = self.lignes.exclude(fournisseur__isnull=True).values_list('fournisseur', flat=True).distinct()
            for fournisseur_id in fournisseurs:
                total = self.lignes.filter(
                    fournisseur_id=fournisseur_id,
                    statut__in=['terminee', 'livree']
                ).aggregate(total=Sum('sous_total'))['total'] or Decimal('0')

                if total > 0:
                    commission = (total * taux_commission / Decimal('100')).quantize(Decimal('0.01'))
                    revenu_net = (total - commission).quantize(Decimal('0.01'))
                    Transaction.objects.get_or_create(
                        commande=self,
                        fournisseur_id=fournisseur_id,
                        defaults={
                            'montant_brut': total,
                            'commission': commission,
                            'revenu_net': revenu_net,
                            'statut_reversement': 'attente'
                        }
                    )

    def __str__(self):
        client_email = self.client.user.email if self.client else 'Client supprimé'
        return f"{self.reference} - {client_email}"


# -----------------------------
# LigneCommande
# -----------------------------
class LigneCommande(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, blank=True, null=True, related_name='lignes')
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, blank=True, null=True)
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.SET_NULL, null=True, blank=True, related_name='lignes_commande')
    magasin = models.ForeignKey('fournisseur.Magasin', on_delete=models.SET_NULL, null=True, blank=True, related_name='lignes_commande')
    quantite = models.PositiveIntegerField()
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sous_total = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    mode_reception = models.CharField(max_length=30, choices=MODE_RECEPTION, default='livraison', blank=True)
    statut = models.CharField(max_length=30, choices=STATUT_COMMANDE, default='nouvelle_commande', blank=True)

    def save(self, *args, **kwargs):
        if self.produit and not self.prix_unitaire:
            # Conserver le prix proposé par le magasin s'il est déjà renseigné
            self.prix_unitaire = self.produit.prix
        if self.prix_unitaire is not None and self.quantite:
            self.sous_total = self.prix_unitaire * self.quantite
        super().save(*args, **kwargs)
        # Mise à jour automatique du montant total de la commande
        if self.commande:
            total = sum((l.sous_total or 0) for l in self.commande.lignes.all())
            self.commande.montant_total = total
            self.commande.save()

    def __str__(self):
        return f"{self.quantite} x {self.produit.nom if self.produit else 'Produit'}"


# -----------------------------
# Historique des statuts
# -----------------------------
class HistoriqueCommande(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='historique')
    ligne = models.ForeignKey(LigneCommande, on_delete=models.CASCADE, null=True, blank=True, related_name='historique')
    statut = models.CharField(max_length=30, choices=STATUT_COMMANDE, blank=True)
    commentaire = models.TextField(blank=True)
    motif = models.TextField(blank=True)
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    utilisateur_nom = models.CharField(max_length=100, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.commande.reference} - {self.statut} - {self.date.strftime('%d/%m/%Y %H:%M')}"


# -----------------------------
# Panier
# -----------------------------
class Panier(models.Model):
    nom_panier = models.CharField(max_length=100, default="Panier")
    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True)
    invite = models.ForeignKey(Invite, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.nom_panier} - {self.client.user.email if self.client else 'Invite'}"


class PanierItem(models.Model):
    panier = models.ForeignKey(Panier, on_delete=models.CASCADE, related_name='items')
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE)
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.SET_NULL, null=True, blank=True, related_name='panier_items')
    magasin = models.ForeignKey('fournisseur.Magasin', on_delete=models.SET_NULL, null=True, blank=True, related_name='panier_items')
    quantite = models.PositiveIntegerField(default=1)
    mode_reception = models.CharField(max_length=30, choices=MODE_RECEPTION, default='livraison', blank=True)

    def __str__(self):
        return f"{self.quantite} x {self.produit.nom}"