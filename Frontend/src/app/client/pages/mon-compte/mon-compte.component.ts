import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService, Utilisateur } from '../../../core/services/auth.service';
import { MonCompteService, ClientInfo, CommandesResponse, FavorisResponse, Commande, LigneCommande, Favori, PanierResponse, PanierItem, AdresseClient } from '../../../core/services/mon-compte.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PanierService } from '../../../core/services/panier.service';
import { ClientNotificationsService, NotificationClient } from '../../../core/services/client-notifications.service';
import { DemandeService, Demande, Offre } from '../../../core/services/demande.service';
import { VehiculeClientService } from '../../../core/services/vehicule-client.service';
import { VehiculeClient } from '../../../models/vehicule-client.model';

type OngletType = 'accueil' | 'profil' | 'securite' | 'confidentialite' | 'commandes' | 'favoris' | 'panier' | 'adresses' | 'notifications' | 'demandes' | 'vehicules';

@Component({
  selector: 'app-mon-compte',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './mon-compte.component.html',
  styleUrls: ['./mon-compte.component.css']
})
export class MonCompteComponent implements OnInit, OnDestroy {

  utilisateur: Utilisateur | null = null;
  ongletActif: OngletType = 'accueil';

  // Données dynamiques
  clientInfo: ClientInfo | null = null;
  commandesResponse: CommandesResponse | null = null;
  favorisResponse: FavorisResponse | null = null;
  panierResponse: PanierResponse | null = null;
  adresses: AdresseClient[] = [];
  isLoadingAdresses = false;

  // États de chargement
  isLoadingClient = false;
  isLoadingCommandes = false;
  isLoadingFavoris = false;
  isLoadingPanier = false;

  // Erreurs
  clientError: string | null = null;
  commandesError: string | null = null;
  favorisError: string | null = null;
  panierError: string | null = null;
  adressesError: string | null = null;

  // Commandes - suivi
  recherche = '';
  filtreStatut = '';
  detailOvert = false;
  commandeSelectionnee: Commande | null = null;
  annulationMotif = '';
  annulationEnCours = false;

  statutsFiltres = [
    { key: '', label: 'Toutes' },
    { key: 'nouvelle_commande', label: 'Nouvelle' },
    { key: 'en_attente_confirmation', label: 'En attente' },
    { key: 'acceptee', label: 'Acceptée' },
    { key: 'en_preparation', label: 'En préparation' },
    { key: 'prete_a_retirer', label: 'Prête' },
    { key: 'en_cours_livraison', label: 'En livraison' },
    { key: 'livree', label: 'Livrée' },
    { key: 'terminee', label: 'Terminée' },
    { key: 'refusee', label: 'Refusée' },
    { key: 'annulee', label: 'Annulée' }
  ];

  // Formulaire profil
  profilForm!: FormGroup;
  profilSaving = false;
  profilSuccess = false;
  profilError = '';

  // Formulaire adresse
  adresseForm!: FormGroup;
  adresseSaving = false;
  adresseEditingId: number | null = null;
  adresseError = '';
  adresseSuccess = false;

  // Formulaire sécurité
  securiteForm!: FormGroup;
  securiteSaving = false;
  securiteSuccess = false;
  securiteError = '';
  showCurrentPwd = false;
  showNewPwd     = false;
  showConfirmPwd = false;

  // Confidentialité
  notifEmail    = true;
  notifSms      = false;
  notifPromo    = true;
  partageData   = false;
  confidSuccess = false;

  // Notifications
  notifications: NotificationClient[] = [];
  unreadNotifCount = 0;
  isLoadingNotifications = false;
  notifLimit = 50;

  // Demandes de pièces
  demandes: Demande[] = [];
  isLoadingDemandes = false;
  demandeSelectionnee: Demande | null = null;
  modeReceptionDemande = 'livraison';
  acceptingOffreId: number | null = null;

  // Véhicules
  vehicules: VehiculeClient[] = [];
  isLoadingVehicules = false;
  vehiculeForm!: FormGroup;
  vehiculeEditingId: number | null = null;
  vehiculeSaving = false;
  vehiculeError = '';
  vehiculeSuccess = false;

  private sub!: Subscription;
  private monCompteSubscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private monCompteService: MonCompteService,
    private notificationService: NotificationService,
    private panierService: PanierService,
    private clientNotificationsService: ClientNotificationsService,
    private demandeService: DemandeService,
    private vehiculeService: VehiculeClientService
  ) {}

  ngOnInit(): void {
    this.sub = this.authService.utilisateur$.subscribe(u => {
      this.utilisateur = u;
      if (u) {
        this.initProfilForm(u);
        this.initAdresseForm();
        this.initVehiculeForm();
        if (u.role === 'client') {
          this.loadClientData();
          this.monCompteService.refreshAllData();
        }
      }
    });

    // Détection de l'onglet via l'URL (ex: /mon-compte/securite, /mon-compte/adresses)
    this.route.url.subscribe(segments => {
      const last = segments[segments.length - 1]?.path;
      if (last === 'securite')       this.ongletActif = 'securite';
      else if (last === 'confidentialite') this.ongletActif = 'confidentialite';
      else if (last === 'commandes' || last === 'mes-commandes') this.ongletActif = 'commandes';
      else if (last === 'favoris' || last === 'mes-favoris') this.ongletActif = 'favoris';
      else if (last === 'panier') this.ongletActif = 'panier';
      else if (last === 'adresses' || last === 'mes-adresses') this.ongletActif = 'adresses';
      else if (last === 'notifications') {
        this.ongletActif = 'notifications';
        this.loadNotifications();
      }
      else if (last === 'demandes' || last === 'mes-demandes') {
        this.ongletActif = 'demandes';
        this.loadDemandes();
      }
      else if (last === 'vehicules' || last === 'mes-vehicules') {
        this.ongletActif = 'vehicules';
        this.loadVehicules();
      }
      else                           this.ongletActif = 'accueil';
    });

    this.initSecuriteForm();
    this.setupDataSubscriptions();
    this.clientNotificationsService.unreadCount$.subscribe(count => this.unreadNotifCount = count);
  }

  ngOnDestroy(): void { 
    this.sub?.unsubscribe();
    this.monCompteSubscriptions.forEach(sub => sub.unsubscribe());
  }

  // -------------------------------------------------------
  // Navigation onglets
  // -------------------------------------------------------
  setOnglet(onglet: OngletType): void {
    this.ongletActif = onglet;
    this.profilSuccess  = false;
    this.securiteSuccess = false;
    this.confidSuccess  = false;
    this.adresseSuccess = false;
    this.adresseError = '';
    if (onglet === 'notifications' && this.notifications.length === 0) {
      this.loadNotifications();
    }
    if (onglet === 'demandes' && this.demandes.length === 0) {
      this.loadDemandes();
    }
    if (onglet === 'vehicules' && this.vehicules.length === 0) {
      this.loadVehicules();
    }
  }

  // -------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------
  loadNotifications(): void {
    this.isLoadingNotifications = true;
    this.clientNotificationsService.getNotifications(this.notifLimit).subscribe({
      next: (res) => {
        this.notifications = res.notifications || [];
        this.isLoadingNotifications = false;
      },
      error: () => {
        this.isLoadingNotifications = false;
      }
    });
  }

  loadMoreNotifications(): void {
    this.notifLimit += 50;
    this.loadNotifications();
  }

  onNotificationClick(notif: NotificationClient): void {
    if (!notif.lu) {
      this.clientNotificationsService.marquerCommeLue(notif.id).subscribe();
    }
    notif.lu = true;
    if (notif.lien) {
      this.router.navigateByUrl(notif.lien);
    }
  }

  markAllNotificationsRead(): void {
    this.clientNotificationsService.toutMarquerCommeLu().subscribe(() => {
      this.notifications.forEach(n => n.lu = true);
    });
  }

  deleteNotification(notif: NotificationClient, event: Event): void {
    event.stopPropagation();
    this.clientNotificationsService.supprimerNotification(notif.id).subscribe(() => {
      this.notifications = this.notifications.filter(n => n.id !== notif.id);
    });
  }

  getNotifIconClass(importance: string): string {
    switch (importance) {
      case 'success': return 'bi-check-circle-fill';
      case 'warning': return 'bi-exclamation-triangle-fill';
      case 'danger': return 'bi-x-octagon-fill';
      default: return 'bi-bell-fill';
    }
  }

  getNotifIconByType(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('commande'))  return 'bi-bag-check-fill';
    if (t.includes('paiement'))  return 'bi-credit-card-fill';
    if (t.includes('livraison')) return 'bi-truck';
    if (t.includes('produit'))   return 'bi-box-seam-fill';
    if (t.includes('promotion')) return 'bi-tag-fill';
    if (t.includes('compte') || t.includes('sécurité')) return 'bi-shield-fill';
    return 'bi-bell-fill';
  }

  get notifGroups(): { label: string; notifications: NotificationClient[] }[] {
    const groups = new Map<string, NotificationClient[]>();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekAgo = today - 7 * 24 * 60 * 60 * 1000;

    for (const n of this.notifications) {
      const d = new Date(n.created_at);
      const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      let key = 'Plus anciennes';
      if (dt === today) {
        key = 'Aujourd\'hui';
      } else if (dt >= weekAgo) {
        key = 'Cette semaine';
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(n);
    }

    const order = ['Aujourd\'hui', 'Cette semaine', 'Plus anciennes'];
    return order.filter(k => groups.has(k) && groups.get(k)!.length > 0)
                .map(k => ({ label: k, notifications: groups.get(k)! }));
  }

  getNotifTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'À l\'instant';
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days} j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  // -------------------------------------------------------
  // DEMANDES DE PIÈCES
  // -------------------------------------------------------
  loadDemandes(): void {
    this.isLoadingDemandes = true;
    this.demandeService.getMesDemandes().subscribe({
      next: (data) => {
        this.demandes = data;
        this.isLoadingDemandes = false;
      },
      error: () => {
        this.notificationService.error('Impossible de charger vos demandes', 'Erreur');
        this.isLoadingDemandes = false;
      }
    });
  }

  selectDemande(d: Demande): void {
    this.demandeService.getMaDemande(d.id).subscribe({
      next: (detail) => {
        this.demandeSelectionnee = detail;
      },
      error: () => {
        this.notificationService.error('Impossible de charger le détail', 'Erreur');
      }
    });
  }

  backDemandes(): void {
    this.demandeSelectionnee = null;
    this.acceptingOffreId = null;
  }

  accepterOffreDemande(offre: Offre): void {
    if (!this.demandeSelectionnee) { return; }
    this.acceptingOffreId = offre.id;
    this.demandeService.accepterOffre(this.demandeSelectionnee.id, offre.id, this.modeReceptionDemande).subscribe({
      next: (res: any) => {
        this.notificationService.success(`Commande ${res.commande_reference} créée`, 'Offre acceptée');
        this.loadDemandes();
        this.demandeSelectionnee = null;
        this.acceptingOffreId = null;
      },
      error: (err: any) => {
        this.acceptingOffreId = null;
        this.notificationService.error(err?.error?.error || 'Erreur', 'Acceptation impossible');
      }
    });
  }

  libelleStatutDemande(statut: string): string {
    const map: Record<string, string> = {
      nouvelle: 'Nouvelle',
      en_recherche: 'En recherche',
      offres_recues: 'Offres reçues',
      acceptee: 'Acceptée',
      commande_creee: 'Commande créée',
      terminee: 'Terminée',
      annulee: 'Annulée'
    };
    return map[statut] || statut;
  }

  statutDemandeClass(statut: string): string {
    switch (statut) {
      case 'nouvelle':
      case 'en_recherche': return 'importance-info';
      case 'offres_recues': return 'importance-warning';
      case 'acceptee':
      case 'commande_creee': return 'importance-success';
      case 'annulee': return 'importance-danger';
      default: return 'importance-info';
    }
  }

  // -------------------------------------------------------
  // VÉHICULES
  // -------------------------------------------------------
  private initVehiculeForm(): void {
    this.vehiculeForm = this.fb.group({
      marque: ['', Validators.required],
      modele: ['', Validators.required],
      annee: ['', [Validators.required, Validators.min(1900), Validators.max(2100)]],
      motorisation: [''],
      carburant: [''],
      version: [''],
      immatriculation: [''],
      actif: [false]
    });
  }

  loadVehicules(): void {
    this.isLoadingVehicules = true;
    this.vehiculeService.getVehicules().subscribe({
      next: (data) => {
        this.vehicules = data;
        this.isLoadingVehicules = false;
      },
      error: () => {
        this.vehiculeError = 'Impossible de charger vos véhicules';
        this.isLoadingVehicules = false;
      }
    });
  }

  nouveauVehicule(): void {
    this.vehiculeEditingId = null;
    this.vehiculeForm.reset({ actif: false });
    this.vehiculeSuccess = false;
    this.vehiculeError = '';
  }

  editVehicule(v: VehiculeClient): void {
    this.vehiculeEditingId = v.id ?? null;
    this.vehiculeForm.patchValue(v);
    this.vehiculeSuccess = false;
    this.vehiculeError = '';
  }

  saveVehicule(): void {
    if (this.vehiculeForm.invalid) { this.vehiculeForm.markAllAsTouched(); return; }
    this.vehiculeSaving = true;
    this.vehiculeError = '';
    const data: VehiculeClient = this.vehiculeForm.value;
    const req = this.vehiculeEditingId
      ? this.vehiculeService.updateVehicule(this.vehiculeEditingId, data)
      : this.vehiculeService.createVehicule(data);

    req.subscribe({
      next: () => {
        this.vehiculeSaving = false;
        this.vehiculeSuccess = true;
        this.vehiculeEditingId = null;
        this.vehiculeForm.reset({ actif: false });
        this.loadVehicules();
        setTimeout(() => this.vehiculeSuccess = false, 3000);
      },
      error: () => {
        this.vehiculeSaving = false;
        this.vehiculeError = this.vehiculeEditingId ? 'Erreur lors de la modification' : 'Erreur lors de l\'ajout';
      }
    });
  }

  deleteVehicule(id: number | undefined): void {
    if (!id) return;
    if (!confirm('Supprimer ce véhicule ?')) return;
    this.vehiculeService.deleteVehicule(id).subscribe({
      next: () => this.loadVehicules(),
      error: () => this.notificationService.error('Impossible de supprimer le véhicule', 'Erreur')
    });
  }

  setVehiculeActif(id: number | undefined): void {
    if (!id) return;
    this.vehiculeService.setActif(id).subscribe({
      next: () => this.loadVehicules()
    });
  }

  // -------------------------------------------------------
  // Formulaire profil
  // -------------------------------------------------------
  initProfilForm(u: Utilisateur): void {
    this.profilForm = this.fb.group({
      prenom:    [u.prenom,    [Validators.required, Validators.minLength(2)]],
      nom:       [u.nom,       [Validators.required, Validators.minLength(2)]],
      email:     [u.email,     [Validators.required, Validators.email]],
      telephone: [u.telephone ?? '', [Validators.pattern(/^[+]?[0-9\s]{8,15}$/)]],
      adresse:   [u.adresse   ?? '']
    });
  }

  // -------------------------------------------------------
  // FORMULAIRE ADRESSE
  // -------------------------------------------------------
  private initAdresseForm(): void {
    this.adresseForm = this.fb.group({
      nom: ['', Validators.maxLength(40)],
      nom_destinataire: ['', [Validators.required, Validators.minLength(2)]],
      telephone: ['', Validators.pattern(/^[+]?[0-9\s]{8,15}$/)],
      ville: ['', Validators.required],
      quartier: [''],
      adresse: ['', [Validators.required, Validators.minLength(4)]],
      point_de_repere: [''],
      instructions: [''],
      est_principale: [false]
    });
  }

  nouvelleAdresse(): void {
    this.adresseEditingId = null;
    this.adresseForm.reset({ est_principale: false });
    this.adresseSuccess = false;
    this.adresseError = '';
  }

  editAdresse(a: AdresseClient): void {
    this.adresseEditingId = a.id ?? null;
    this.adresseForm.patchValue({
      nom: a.nom || '',
      nom_destinataire: a.nom_destinataire || '',
      telephone: a.telephone || '',
      ville: a.ville || '',
      quartier: a.quartier || '',
      adresse: a.adresse || '',
      point_de_repere: a.point_de_repere || '',
      instructions: a.instructions || '',
      est_principale: a.est_principale || false
    });
  }

  saveAdresse(): void {
    if (this.adresseForm.invalid) { this.adresseForm.markAllAsTouched(); return; }
    this.adresseSaving = true;
    this.adresseError = '';
    const data = this.adresseForm.value;
    const req = this.adresseEditingId
      ? this.monCompteService.modifierAdresse(this.adresseEditingId, data)
      : this.monCompteService.ajouterAdresse(data);

    req.subscribe({
      next: () => {
        this.adresseSaving = false;
        this.adresseSuccess = true;
        this.adresseEditingId = null;
        this.adresseForm.reset({ est_principale: false });
        setTimeout(() => this.adresseSuccess = false, 3000);
      },
      error: (err) => {
        this.adresseSaving = false;
        this.adresseError = err?.error?.detail || 'Erreur lors de l\'enregistrement.';
      }
    });
  }

  deleteAdresse(id: number): void {
    if (!confirm('Supprimer cette adresse ?')) return;
    this.monCompteService.supprimerAdresse(id).subscribe({
      error: () => this.notificationService.error('Impossible de supprimer l\'adresse', 'Erreur')
    });
  }

  setAdressePrincipale(id: number): void {
    this.monCompteService.definirAdressePrincipale(id).subscribe({
      error: () => this.notificationService.error('Impossible de définir l\'adresse principale', 'Erreur')
    });
  }

  // -------------------------------------------------------
  // Formulaire profil - save
  // -------------------------------------------------------
  saveProfil(): void {
    if (this.profilForm.invalid) { this.profilForm.markAllAsTouched(); return; }
    this.profilSaving = true;
    this.profilError  = '';

    this.authService.updateProfil(this.profilForm.value).subscribe({
      next: (updatedUser) => {
        this.profilSaving = false;
        this.profilSuccess = true;
        this.utilisateur = updatedUser;
        setTimeout(() => this.profilSuccess = false, 3000);
      },
      error: (err) => {
        this.profilSaving = false;
        this.profilError = 'Erreur lors de la mise à jour. Veuillez réessayer.';
        console.error('Erreur update profil:', err);
      }
    });
  }

  // -------------------------------------------------------
  // Formulaire sécurité
  // -------------------------------------------------------
  private initSecuriteForm(): void {
    this.securiteForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(8),
                             Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.pwdMatchValidator });
  }

  saveSecurite(): void {
    if (this.securiteForm.invalid) { this.securiteForm.markAllAsTouched(); return; }
    this.securiteSaving = true;
    this.securiteError  = '';
    // TODO: appel API changement de mot de passe
    setTimeout(() => {
      this.securiteSaving = false;
      this.securiteSuccess = true;
      this.securiteForm.reset();
      setTimeout(() => this.securiteSuccess = false, 3000);
    }, 1200);
  }

  private pwdMatchValidator(g: any) {
    const n = g.get('newPassword')?.value;
    const c = g.get('confirmPassword')?.value;
    return n && c && n !== c ? { mismatch: true } : null;
  }

  get pwdStrength(): number {
    const p = this.securiteForm?.get('newPassword')?.value ?? '';
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)           s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[a-z]/.test(p))         s++;
    if (/\d/.test(p))            s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  }

  get pwdStrengthLabel(): string {
    return ['', 'Faible', 'Moyen', 'Bon', 'Fort'][this.pwdStrength];
  }

  get pwdStrengthClass(): string {
    return ['', 'weak', 'medium', 'good', 'strong'][this.pwdStrength];
  }

  // -------------------------------------------------------
  // Confidentialité
  // -------------------------------------------------------
  saveConfidentialite(): void {
    // TODO: appel API paramètres confidentialité
    this.confidSuccess = true;
    setTimeout(() => this.confidSuccess = false, 3000);
  }

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------
  getInitiales(): string { return this.authService.getInitiales(); }

  getAvatarColor(): string {
    return this.utilisateur?.role === 'admin'
      ? 'linear-gradient(135deg, #7c3aed, #a78bfa)'
      : 'linear-gradient(135deg, #d32f2f, #ff5a00)';
  }

  getRoleLabel(): string {
    const r = this.utilisateur?.role ?? 'client';
    return r.charAt(0).toUpperCase() + r.slice(1);
  }

  getMemberSince(): string {
    if (!this.utilisateur?.date_joined) return '';
    const d = new Date(this.utilisateur.date_joined);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  getProfileCompleteness(): number {
    if (!this.utilisateur) return 0;
    const u = this.utilisateur;
    const fields = [
      u.prenom && u.prenom.length >= 2,
      u.nom && u.nom.length >= 2,
      u.email && /\S+@\S+\.\S+/.test(u.email),
      u.telephone && u.telephone.length >= 8,
      u.adresse && u.adresse.length >= 4
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }

  getProfileCompletenessLabel(): string {
    const pct = this.getProfileCompleteness();
    if (pct === 100) return 'Profil complet';
    if (pct >= 80) return 'Presque complet';
    if (pct >= 60) return 'Bien rempli';
    if (pct >= 40) return 'À compléter';
    return 'Profil incomplet';
  }

  // -------------------------------------------------------
  // ACTIONS FAVORIS
  // -------------------------------------------------------
  goToProduit(id: number): void {
    this.router.navigate(['/produits'], { queryParams: { id } });
  }

  ajouterAuPanierDepuisFavori(favori: Favori): void {
    // Les favoris ne stockent pas l'offre : redirige vers la fiche pour choisir le magasin
    this.goToProduit(favori.produit_id);
  }

  retirerDesFavoris(favori: Favori): void {
    this.monCompteService.retirerFavori(favori.produit_id).subscribe({
      next: () => {
        this.notificationService.warning(
          `${favori.produit_nom} a été retiré des favoris`,
          'Favori supprimé'
        );
        // Refresh the favorites list
        this.refreshFavoris();
      },
      error: () => {
        this.notificationService.error(
          'Impossible de retirer des favoris',
          'Erreur'
        );
      }
    });
  }

  // -------------------------------------------------------
  // ACTIONS PANIER
  // -------------------------------------------------------
  supprimerDuPanier(item: PanierItem): void {
    this.monCompteService.supprimerDuPanier(item.id).subscribe({
      next: () => {
        this.notificationService.warning(
          `${item.produit_nom} a été retiré du panier`,
          'Produit supprimé'
        );
        // Refresh the cart
        this.refreshPanier();
      },
      error: () => {
        this.notificationService.error(
          'Impossible de supprimer du panier',
          'Erreur'
        );
      }
    });
  }

  mettreAJourQuantite(item: PanierItem, nouvelleQuantite: number): void {
    if (nouvelleQuantite < 1) return;
    
    this.monCompteService.mettreAJourQuantite(item.id, nouvelleQuantite).subscribe({
      next: () => {
        // Refresh the cart
        this.refreshPanier();
      },
      error: () => {
        this.notificationService.error(
          'Impossible de mettre à jour la quantité',
          'Erreur'
        );
      }
    });
  }

  passerCommande(): void {
    // TODO: Implement checkout logic
    this.notificationService.info(
      'La fonctionnalité de commande sera bientôt disponible',
      'Information'
    );
  }

  // -------------------------------------------------------
  // UTILITAIRES
  // -------------------------------------------------------
  getStatutClass(statut: string): string {
    return this.monCompteService.getStatutClass(statut);
  }

  getStatutLabel(statut: string): string {
    return this.monCompteService.getStatutLabel(statut);
  }

  formatDate(dateString: string): string {
    return this.monCompteService.formatDate(dateString);
  }

  formatPrix(prix: number): string {
    return this.monCompteService.formatPrix(prix);
  }

  getCommandes(): Commande[] {
    return this.commandesResponse?.commandes || [];
  }

  getFavoris(): Favori[] {
    return this.favorisResponse?.favoris || [];
  }

  hasCommandes(): boolean {
    return this.getCommandes().length > 0;
  }

  hasFavoris(): boolean {
    return this.getFavoris().length > 0;
  }

  getFavorisTotalValue(): number {
    return this.getFavoris().reduce((sum, f) => sum + (f.prix || 0), 0);
  }

  getPanierItems(): PanierItem[] {
    return this.panierResponse?.items || [];
  }

  hasPanierItems(): boolean {
    return this.getPanierItems().length > 0;
  }

  getPanierTotal(): number {
    return this.panierResponse?.total || 0;
  }

  getPanierNombreItems(): number {
    return this.panierResponse?.nombre_items || 0;
  }

  // -------------------------------------------------------
  // COMMANDES - FILTRES, RECHERCHE, DÉTAIL, ANNULATION
  // -------------------------------------------------------
  getCommandesFiltrees(): Commande[] {
    const commandes = this.getCommandes();
    return commandes.filter(c => {
      const matchStatut = !this.filtreStatut || c.statut === this.filtreStatut;
      const q = this.recherche.trim().toLowerCase();
      const matchRecherche = !q ||
        (c.reference && c.reference.toLowerCase().includes(q)) ||
        (c.lignes || []).some(l =>
          (l.produit?.nom || '').toLowerCase().includes(q) ||
          (l.magasin?.nom_magasin || '').toLowerCase().includes(q) ||
          (l.produit?.reference || '').toLowerCase().includes(q)
        );
      return matchStatut && matchRecherche;
    });
  }

  getNombreResultats(): number {
    return this.getCommandesFiltrees().length;
  }

  ouvrirDetail(commande: Commande): void {
    this.commandeSelectionnee = commande;
    this.detailOvert = true;
    this.annulationMotif = '';
  }

  fermerDetail(): void {
    this.detailOvert = false;
    this.commandeSelectionnee = null;
    this.annulationMotif = '';
  }

  estAnnulable(statut: string): boolean {
    return ['nouvelle_commande', 'en_attente_confirmation', 'acceptee', 'en_preparation'].includes(statut);
  }

  annulerCommande(commande: Commande): void {
    if (!commande || !this.estAnnulable(commande.statut)) return;
    if (!confirm(`Annuler la commande ${commande.reference} ?`)) return;

    this.annulationEnCours = true;
    this.monCompteService.annulerCommande(commande.id, this.annulationMotif).subscribe({
      next: (cmd) => {
        this.annulationEnCours = false;
        this.notificationService.success('Commande annulée', 'Votre commande a été annulée.');
        this.detailOvert = false;
        this.commandeSelectionnee = null;
        this.refreshCommandes();
      },
      error: (err) => {
        this.annulationEnCours = false;
        this.notificationService.error(err?.error?.error || 'Impossible d\'annuler', 'Erreur');
      }
    });
  }

  refreshCommandes(): void {
    this.isLoadingCommandes = true;
    this.monCompteService.getMesCommandes().subscribe({
      next: (commandes) => {
        this.commandesResponse = commandes;
        this.isLoadingCommandes = false;
      },
      error: () => {
        this.isLoadingCommandes = false;
      }
    });
  }

  appelerMagasin(telephone: string | undefined): void {
    if (!telephone) return;
    window.location.href = `tel:${telephone}`;
  }

  voirItineraire(magasin: LigneCommande['magasin'] | undefined): void {
    if (!magasin || (!magasin.latitude && !magasin.adresse_complete)) return;
    if (magasin.latitude && magasin.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${magasin.latitude},${magasin.longitude}`, '_blank');
    } else {
      const adresse = encodeURIComponent(`${magasin.adresse_complete}, ${magasin.ville || ''}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${adresse}`, '_blank');
    }
  }

  groupesLignesParMagasin(lignes: LigneCommande[] | undefined): { magasin: LigneCommande['magasin']; lignes: LigneCommande[] }[] {
    const map = new Map<string, LigneCommande[]>();
    for (const l of (lignes || [])) {
      const key = l.magasin?.id ? String(l.magasin.id) : (l.magasin?.nom_magasin || 'auto');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return Array.from(map.entries()).map(([_, group]) => ({
      magasin: group[0].magasin,
      lignes: group
    }));
  }

  getEtapes(commande: Commande | null): { label: string; statut: string; atteint: boolean; actif: boolean }[] {
    if (!commande) return [];
    const statut = commande.statut;
    const estRetrait = commande.mode_reception === 'retrait_magasin' ||
      (commande.lignes || []).length > 0 && (commande.lignes || []).every(l => l.mode_reception === 'retrait_magasin');

    const communes = [
      { label: 'Commande confirmée', statut: 'nouvelle_commande' },
      { label: 'Commande acceptée', statut: 'acceptee' },
      { label: 'Commande préparée', statut: 'en_preparation' }
    ];

    const retrait = [
      { label: 'Prête à retirer', statut: 'prete_a_retirer' },
      { label: 'Retirée', statut: 'terminee' }
    ];

    const livraison = [
      { label: 'Livraison attribuée', statut: 'livraison_attribuee' },
      { label: 'Colis pris en charge', statut: 'prise_en_charge' },
      { label: 'En cours de livraison', statut: 'en_cours_livraison' },
      { label: 'Livrée', statut: 'livree' }
    ];

    const etapes = [...communes, ...(estRetrait ? retrait : livraison)];

    const ordre = ['nouvelle_commande', 'en_attente_confirmation', 'acceptee', 'en_preparation', 'livraison_attribuee', 'prise_en_charge', 'en_cours_livraison', 'livree', 'prete_a_retirer', 'terminee', 'annulee', 'refusee'];

    // Avancement de la livraison si des infos sont disponibles
    const statutsLivraison = (commande.livraisons || []).map(l => l.statut).filter(Boolean) as string[];
    let indexActuel = ordre.indexOf(statut);
    for (const s of statutsLivraison) {
      const i = ordre.indexOf(s);
      if (i > indexActuel) indexActuel = i;
    }

    return etapes.map((e) => {
      const indexEtape = ordre.indexOf(e.statut);
      const atteint = indexActuel >= indexEtape && indexActuel !== -1;
      const actif = statut === e.statut || statutsLivraison.includes(e.statut);
      return { ...e, atteint, actif };
    });
  }

  formatHoraires(horaires: any): string {
    if (!horaires || typeof horaires !== 'object') return '';
    return Object.entries(horaires)
      .map(([jour, plage]) => `${jour}: ${plage}`)
      .join(' — ');
  }

  private loadClientData(): void {
    if (!this.utilisateur) return;
    
    // Charger les infos client
    this.isLoadingClient = true;
    this.monCompteService.getClientInfo().subscribe({
      next: (clientInfo) => {
        this.clientInfo = clientInfo;
        this.isLoadingClient = false;
        this.clientError = null;
      },
      error: (error) => {
        this.clientError = 'Impossible de charger vos informations';
        this.isLoadingClient = false;
        console.error('Erreur client info:', error);
      }
    });

    // Charger les commandes
    this.isLoadingCommandes = true;
    this.monCompteService.getMesCommandes().subscribe({
      next: (commandes) => {
        this.commandesResponse = commandes;
        this.isLoadingCommandes = false;
        this.commandesError = null;
      },
      error: (error) => {
        this.commandesError = 'Impossible de charger vos commandes';
        this.isLoadingCommandes = false;
        console.error('Erreur commandes:', error);
      }
    });

    // Charger les favoris
    this.isLoadingFavoris = true;
    this.monCompteService.getFavoris().subscribe({
      next: (favoris) => {
        this.favorisResponse = favoris;
        this.isLoadingFavoris = false;
        this.favorisError = null;
      },
      error: (error) => {
        this.favorisError = 'Impossible de charger vos favoris';
        this.isLoadingFavoris = false;
        console.error('Erreur favoris:', error);
      }
    });

    // Charger le panier
    this.isLoadingPanier = true;
    this.monCompteService.getPanier().subscribe({
      next: (panier) => {
        this.panierResponse = panier;
        this.isLoadingPanier = false;
        this.panierError = null;
      },
      error: (error) => {
        this.panierError = 'Impossible de charger votre panier';
        this.isLoadingPanier = false;
        console.error('Erreur panier:', error);
      }
    });

    // Charger les adresses
    this.isLoadingAdresses = true;
    this.monCompteService.getAdresses().subscribe({
      next: (adresses) => {
        this.adresses = adresses;
        this.isLoadingAdresses = false;
        this.adressesError = null;
      },
      error: (error) => {
        this.adressesError = 'Impossible de charger vos adresses';
        this.isLoadingAdresses = false;
        console.error('Erreur adresses:', error);
      }
    });
  }

  private setupDataSubscriptions(): void {
    // S'abonner aux mises à jour automatiques
    const clientSub = this.monCompteService.clientInfo$.subscribe(info => {
      this.clientInfo = info;
    });

    const commandesSub = this.monCompteService.commandes$.subscribe(commandes => {
      this.commandesResponse = commandes;
    });

    const favorisSub = this.monCompteService.favoris$.subscribe(favoris => {
      this.favorisResponse = favoris;
    });

    const panierSub = this.monCompteService.panier$.subscribe(panier => {
      this.panierResponse = panier;
    });

    const adressesSub = this.monCompteService.adresses$.subscribe(adresses => {
      this.adresses = adresses;
    });

    this.monCompteSubscriptions = [clientSub, commandesSub, favorisSub, panierSub, adressesSub];
  }

  refreshData(): void {
    this.loadClientData();
  }

  refreshFavoris(): void {
    this.isLoadingFavoris = true;
    this.monCompteService.getFavoris().subscribe({
      next: (favoris) => {
        this.favorisResponse = favoris;
        this.isLoadingFavoris = false;
        this.favorisError = null;
      },
      error: (error) => {
        this.favorisError = 'Impossible de charger vos favoris';
        this.isLoadingFavoris = false;
        console.error('Erreur favoris:', error);
      }
    });
  }

  refreshPanier(): void {
    this.isLoadingPanier = true;
    this.monCompteService.getPanier().subscribe({
      next: (panier) => {
        this.panierResponse = panier;
        this.isLoadingPanier = false;
        this.panierError = null;
      },
      error: (error) => {
        this.panierError = 'Impossible de charger votre panier';
        this.isLoadingPanier = false;
        console.error('Erreur panier:', error);
      }
    });
  }

  // -------------------------------------------------------
  // DÉCONNEXION
  // -------------------------------------------------------
  deconnexion(): void {
    this.authService.logout();
    // Redirection vers la page d'accueil
    window.location.href = '/';
  }
}