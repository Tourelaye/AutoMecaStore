from django.db import models
from account.models import Client, Administrateur, Invite
from delivery.models import Livreur
from catalog.models import Produit

# -----------------------------
# Commande
# -----------------------------
class Commande(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('validee', 'Validée'),
        ('expediee', 'Expédiée'),
        ('livree', 'Livrée'),
        ('annulee', 'Annulée'),
    ]

    date_commande = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='en_attente')
    montant_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    client = models.ForeignKey(Client, on_delete=models.SET_NULL, related_name='commandes', null=True, blank=True)
    administrateur = models.ForeignKey(Administrateur, on_delete=models.SET_NULL, null=True, blank=True)
    livreur = models.ForeignKey(Livreur, on_delete=models.SET_NULL, null=True, blank=True)
    reference = models.CharField(max_length=20, unique=True, blank=True, null=True)

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

    def __str__(self):
        client_email = self.client.user.email if self.client else 'Client supprimé'
        return f"{self.reference} - {client_email}"


# -----------------------------
# LigneCommande
# -----------------------------
class LigneCommande(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE,blank=True, null=True, related_name='lignes')
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE,blank=True, null=True)
    quantite = models.PositiveIntegerField()
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sous_total = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    def save(self, *args, **kwargs):
        self.prix_unitaire = self.produit.prix
        self.sous_total = self.prix_unitaire * self.quantite
        super().save(*args, **kwargs)
        # Mise à jour automatique du montant total de la commande
        total = sum(l.sous_total for l in self.commande.lignes.all())
        self.commande.montant_total = total
        self.commande.save()

    def __str__(self):
        return f"{self.quantite} x {self.produit.nom}"


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
    quantite = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.quantite} x {self.produit.nom}"


#         export interface Panier {
#   id?: number;
#   items: PanierItem[];
# }

# export interface PanierItem {
#   id?: number;
#   produit: Produit;
#   nom: string;
#   prix: number;
#   quantite: number;
#   image?: string;
#   favori?: boolean;
# }