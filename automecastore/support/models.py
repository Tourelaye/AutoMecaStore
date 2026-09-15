from django.db import models
from account.models import Administrateur, Client
from catalog.models import GestionnaireStock, Stock, Produit, Categorie
from orders.models import Commande
from delivery.models import Livreur


# -----------------------------
# Agent Support
# -----------------------------
class AgentSupportClient(models.Model):
    tickets_ouverts = models.PositiveIntegerField(default=0)
    tickets_fermes = models.PositiveIntegerField(default=0)
    note_satisfaction = models.FloatField(blank=True, null=True)
    langues_parlees = models.CharField(max_length=100)
    temps_reponse_moyen = models.TimeField(blank=True, null=True)

    def __str__(self):
        return f"Agent {self.id}"


# -----------------------------
# Ticket
# -----------------------------
class Ticket(models.Model):

    STATUT_CHOICES = [
        ('OUVERT', 'Ouvert'),
        ('EN_COURS', 'En cours'),
        ('FERME', 'Fermé'),
    ]

    PRIORITE_CHOICES = [
        ('FAIBLE', 'Faible'),
        ('MOYENNE', 'Moyenne'),
        ('URGENTE', 'Urgente'),
    ]

    objet = models.CharField(max_length=100)
    description = models.TextField()
    date_ouverture = models.DateTimeField(auto_now_add=True)
    date_fermeture = models.DateTimeField(blank=True, null=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='OUVERT')
    priorite = models.CharField(max_length=20, choices=PRIORITE_CHOICES, default='MOYENNE')

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="tickets",null=True, blank=True)
    agent_support_client = models.ForeignKey(
        AgentSupportClient,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    def __str__(self):
        return f"Ticket {self.objet}"
    
# -----------------------------
# MessageSupport
# -----------------------------

class MessageSupport(models.Model):

    STATUT_CHOICES = [
        ('ENVOYE', 'Envoyé'),
        ('LU', 'Lu'),
    ]

    objet = models.CharField(max_length=100)
    contenu = models.TextField()
    date_envoi = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ENVOYE')

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="messages", null=True, blank=True)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True)
    agent_support_client = models.ForeignKey(AgentSupportClient, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"Message {self.objet}"
    
# -----------------------------
# Reclamation
# -----------------------------
class Reclamation(models.Model):

    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente'),
        ('TRAITEE', 'Traitée'),
        ('REJETEE', 'Rejetée'),
    ]

    objet = models.CharField(max_length=100)
    description = models.TextField()
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='EN_ATTENTE')
    date_soumission = models.DateTimeField(auto_now_add=True)

    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True )
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, null=True, blank=True)
    agent_support_client = models.ForeignKey(AgentSupportClient, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Réclamation {self.objet}"
    
# -----------------------------
# Avis
# -----------------------------

class Avis(models.Model):
    note = models.PositiveIntegerField()  # 1 à 5
    commentaire = models.TextField()
    date = models.DateTimeField(auto_now_add=True)

    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True  )
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, null=True, blank=True)
    livreur = models.ForeignKey(Livreur, on_delete=models.CASCADE, null=True, blank=True)
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, null=True, blank=True, related_name='avis_commande')

    # Sous-notes
    note_qualite_produit = models.PositiveIntegerField(blank=True, null=True)
    note_delai = models.PositiveIntegerField(blank=True, null=True)
    note_communication = models.PositiveIntegerField(blank=True, null=True)
    note_livraison = models.PositiveIntegerField(blank=True, null=True)

    # Réponse du fournisseur
    reponse_fournisseur = models.TextField(blank=True, null=True)
    date_reponse = models.DateTimeField(blank=True, null=True)
    reponse_fournisseur_nom = models.CharField(max_length=200, blank=True, null=True)

    # Photos
    photos = models.JSONField(default=list, blank=True)

    # Achat vérifié
    achat_verifie = models.BooleanField(default=False)

    # Modération
    approuve = models.BooleanField(default=True)

    class Meta:
        unique_together = ('client', 'produit')

    def __str__(self):
        return f"Avis {self.note}/5"


# -----------------------------
# DemandePartenariat
# -----------------------------
class DemandePartenariat(models.Model):

    STATUT_CHOICES = [
        ('nouvelle', 'Nouvelle'),
        ('en_cours', 'En cours'),
        ('acceptee', 'Acceptée'),
        ('rejetee', 'Rejetée'),
    ]

    nom_entreprise = models.CharField(max_length=200)
    marque = models.CharField(max_length=200, blank=True, default='')
    email_contact = models.EmailField()
    telephone = models.CharField(max_length=30, blank=True, default='')
    message = models.TextField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='nouvelle')
    reponse_admin = models.TextField(blank=True, default='')
    date_soumission = models.DateTimeField(auto_now_add=True)
    date_traitement = models.DateTimeField(blank=True, null=True)
    traitee_par = models.ForeignKey(
        'account.Utilisateur',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='demandes_partenariat_traitees'
    )

    class Meta:
        ordering = ['-date_soumission']
        db_table = 'support_demande_partenariat'

    def __str__(self):
        return f"Partenariat — {self.nom_entreprise} ({self.get_statut_display()})"