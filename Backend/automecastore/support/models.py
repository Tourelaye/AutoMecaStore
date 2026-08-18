from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
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
        ('nouveau', 'Nouveau'),
        ('en_cours_analyse', 'En cours d\'analyse'),
        ('en_attente_infos', 'En attente d\'informations'),
        ('resolu', 'Résolu'),
        ('rejete', 'Rejeté'),
        ('ferme', 'Fermé'),
    ]

    PRIORITE_CHOICES = [
        ('faible', 'Faible'),
        ('normale', 'Normale'),
        ('elevee', 'Élevée'),
        ('urgente', 'Urgente'),
    ]

    MOTIF_CHOICES = [
        ('produit_non_conforme', 'Produit non conforme'),
        ('produit_defectueux', 'Produit défectueux'),
        ('produit_manquant', 'Produit manquant'),
        ('livraison_retardee', 'Livraison retardée'),
        ('livraison_non_recue', 'Livraison non reçue'),
        ('facturation_incorrecte', 'Facturation incorrecte'),
        ('remboursement', 'Demande de remboursement'),
        ('echange', 'Demande d\'échange'),
        ('autre', 'Autre'),
    ]

    numero_dossier = models.CharField(max_length=30, unique=True, blank=True)
    objet = models.CharField(max_length=100)
    motif = models.CharField(max_length=50, choices=MOTIF_CHOICES, blank=True)
    description = models.TextField()
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='nouveau')
    priorite = models.CharField(max_length=20, choices=PRIORITE_CHOICES, default='normale')
    est_litige = models.BooleanField(default=False)

    date_soumission = models.DateTimeField(auto_now_add=True)
    date_ouverture = models.DateTimeField(blank=True, null=True)
    date_resolution = models.DateTimeField(blank=True, null=True)
    date_cloture = models.DateTimeField(blank=True, null=True)
    date_derniere_maj = models.DateTimeField(auto_now=True)

    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True, related_name='reclamations')
    fournisseur = models.ForeignKey('account.Fournisseur', on_delete=models.CASCADE, null=True, blank=True, related_name='reclamations')
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, null=True, blank=True, related_name='reclamations')
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, null=True, blank=True, related_name='reclamations')
    agent_support_client = models.ForeignKey(AgentSupportClient, on_delete=models.SET_NULL, null=True, blank=True)
    assigne_a = models.ForeignKey('account.Utilisateur', on_delete=models.SET_NULL, null=True, blank=True, related_name='reclamations_assignees')

    reponse_admin = models.TextField(blank=True)
    note_interne = models.TextField(blank=True)
    raison_rejet = models.TextField(blank=True)
    photos = models.JSONField(default=list, blank=True)
    documents = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['-date_soumission']
        db_table = 'support_reclamation'

    def save(self, *args, **kwargs):
        from django.utils import timezone
        import datetime, random, string
        if not self.numero_dossier:
            today = datetime.date.today().strftime('%Y%m%d')
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
            self.numero_dossier = f'REC-{today}-{code}'
        if self.statut == 'nouveau' and not self.date_ouverture:
            self.date_ouverture = timezone.now()
        if self.statut == 'resolu' and not self.date_resolution:
            self.date_resolution = timezone.now()
        if self.statut in ('rejete', 'ferme') and not self.date_cloture:
            self.date_cloture = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Dossier {self.numero_dossier} - {self.objet}"
    
# -----------------------------
# Avis
# -----------------------------

class Avis(models.Model):
    note = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])  # 1 à 5
    commentaire = models.TextField()
    date = models.DateTimeField(auto_now_add=True)

    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True, related_name='avis')
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, null=True, blank=True, related_name='avis')
    magasin = models.ForeignKey('fournisseur.Magasin', on_delete=models.CASCADE, null=True, blank=True, related_name='avis')
    livreur = models.ForeignKey(Livreur, on_delete=models.CASCADE, null=True, blank=True)

    commande = models.ForeignKey('orders.Commande', on_delete=models.CASCADE, null=True, blank=True, related_name='avis_commande')
    ligne_commande = models.ForeignKey('orders.LigneCommande', on_delete=models.CASCADE, null=True, blank=True, related_name='avis_ligne')

    # Sous-notes évaluation magasin
    note_qualite_produit = models.PositiveIntegerField(blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    note_delai = models.PositiveIntegerField(blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    note_communication = models.PositiveIntegerField(blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    note_livraison = models.PositiveIntegerField(blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)])

    # Réponse du fournisseur
    reponse_fournisseur = models.TextField(blank=True, null=True)
    date_reponse = models.DateTimeField(blank=True, null=True)
    reponse_fournisseur_nom = models.CharField(max_length=200, blank=True, null=True)

    # Photos attachées par le client
    photos = models.JSONField(default=list, blank=True)

    # Achat vérifié (le client a commandé le produit)
    achat_verifie = models.BooleanField(default=False)

    # Modération
    approuve = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['client', 'produit'], condition=models.Q(produit__isnull=False), name='unique_avis_client_produit'),
            models.UniqueConstraint(fields=['client', 'magasin'], condition=models.Q(magasin__isnull=False), name='unique_avis_client_magasin'),
        ]

    def _update_ratings(self):
        from django.db.models import Avg

        if self.produit_id:
            avis = Avis.objects.filter(produit_id=self.produit_id, approuve=True)
            note = avis.aggregate(avg=Avg('note'))['avg']
            self.produit.note_moyenne = round(note, 2) if note is not None else None
            self.produit.nombre_avis = avis.count()
            self.produit.save(update_fields=['note_moyenne', 'nombre_avis'])

        if self.magasin_id:
            avis = Avis.objects.filter(magasin_id=self.magasin_id, approuve=True)
            note = avis.aggregate(avg=Avg('note'))['avg']
            self.magasin.note_moyenne = round(note, 2) if note is not None else None
            self.magasin.nombre_avis = avis.count()
            self.magasin.save(update_fields=['note_moyenne', 'nombre_avis'])

            if self.magasin.fournisseur_id:
                avis_f = Avis.objects.filter(magasin__fournisseur_id=self.magasin.fournisseur_id, approuve=True)
                note_f = avis_f.aggregate(avg=Avg('note'))['avg']
                self.magasin.fournisseur.note_moyenne = round(note_f, 2) if note_f is not None else None
                self.magasin.fournisseur.nombre_avis = avis_f.count()
                self.magasin.fournisseur.save(update_fields=['note_moyenne', 'nombre_avis'])
        elif self.produit_id and self.produit.fournisseur_id:
            # Avis produit sans magasin : met à jour le fournisseur via ses avis produits
            avis_f = Avis.objects.filter(produit__fournisseur_id=self.produit.fournisseur_id, approuve=True)
            note_f = avis_f.aggregate(avg=Avg('note'))['avg']
            self.produit.fournisseur.note_moyenne = round(note_f, 2) if note_f is not None else None
            self.produit.fournisseur.nombre_avis = avis_f.count()
            self.produit.fournisseur.save(update_fields=['note_moyenne', 'nombre_avis'])

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._update_ratings()

    def __str__(self):
        return f"Avis {self.note}/5"


# -----------------------------
# MessageReclamation
# -----------------------------
class MessageReclamation(models.Model):

    AUTEUR_CHOICES = [
        ('client', 'Client'),
        ('fournisseur', 'Fournisseur'),
        ('admin', 'Administrateur'),
        ('systeme', 'Système'),
    ]

    reclamation = models.ForeignKey(Reclamation, on_delete=models.CASCADE, related_name='messages')
    auteur_type = models.CharField(max_length=20, choices=AUTEUR_CHOICES)
    auteur = models.ForeignKey('account.Utilisateur', on_delete=models.CASCADE, null=True, blank=True)
    auteur_nom = models.CharField(max_length=100, blank=True)
    contenu = models.TextField()
    est_note_interne = models.BooleanField(default=False)
    est_visible_client = models.BooleanField(default=True)
    est_visible_fournisseur = models.BooleanField(default=True)
    lu_par_client = models.BooleanField(default=False)
    lu_par_fournisseur = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']
        db_table = 'support_message_reclamation'

    def __str__(self):
        return f"Message {self.id} - {self.reclamation.numero_dossier}"


# -----------------------------
# PieceJointeReclamation
# -----------------------------
class PieceJointeReclamation(models.Model):

    TYPE_CHOICES = [
        ('photo', 'Photo'),
        ('pdf', 'PDF'),
        ('facture', 'Facture'),
        ('capture', 'Capture d\'écran'),
        ('autre', 'Autre'),
    ]

    reclamation = models.ForeignKey(Reclamation, on_delete=models.CASCADE, related_name='pieces_jointes')
    message = models.ForeignKey(MessageReclamation, on_delete=models.CASCADE, null=True, blank=True, related_name='pieces_jointes')
    fichier = models.FileField(upload_to='reclamations/%Y/%m/')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='autre')
    nom = models.CharField(max_length=255, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'support_piecejointe_reclamation'

    def __str__(self):
        return self.nom or f"Pièce jointe {self.id}"


# -----------------------------
# HistoriqueReclamation
# -----------------------------
class HistoriqueReclamation(models.Model):

    ACTION_CHOICES = [
        ('creation', 'Création du dossier'),
        ('ouverture', 'Ouverture du dossier'),
        ('reponse', 'Réponse ajoutée'),
        ('demande_infos', 'Demande d\'informations'),
        ('changement_priorite', 'Changement de priorité'),
        ('changement_statut', 'Changement de statut'),
        ('assignation', 'Assignation'),
        ('note_interne', 'Note interne'),
        ('resolution', 'Résolution'),
        ('rejet', 'Rejet'),
        ('fermeture', 'Fermeture'),
        ('modification', 'Modification'),
    ]

    reclamation = models.ForeignKey(Reclamation, on_delete=models.CASCADE, related_name='historique')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    statut = models.CharField(max_length=30, blank=True)
    priorite = models.CharField(max_length=20, blank=True)
    auteur = models.ForeignKey('account.Utilisateur', on_delete=models.SET_NULL, null=True, blank=True)
    auteur_nom = models.CharField(max_length=100, blank=True)
    auteur_type = models.CharField(max_length=20, blank=True)
    commentaire = models.TextField(blank=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        db_table = 'support_historique_reclamation'

    def __str__(self):
        return f"{self.action} - {self.reclamation.numero_dossier}"


class SignalementAvis(models.Model):
    MOTIF_CHOICES = [
        ('faux', 'Faux avis'),
        ('inapproprie', 'Contenu inapproprié'),
        ('offensant', 'Langage offensant / insulte'),
        ('insulte', 'Insulte'),
        ('spam', 'Spam'),
        ('informations_fausses', 'Informations fausses'),
        ('autre', 'Autre'),
    ]

    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('traite', 'Traité'),
        ('rejete', 'Rejeté'),
    ]

    avis = models.ForeignKey(Avis, on_delete=models.CASCADE, related_name='signalements')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True, related_name='signalements_avis')
    fournisseur = models.ForeignKey('account.Fournisseur', on_delete=models.CASCADE, null=True, blank=True, related_name='avis_signalements')
    motif = models.CharField(max_length=50, choices=MOTIF_CHOICES)
    commentaire = models.TextField(blank=True, default='')
    date = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')

    def __str__(self):
        return f"Signalement {self.motif} sur avis {self.avis_id}"