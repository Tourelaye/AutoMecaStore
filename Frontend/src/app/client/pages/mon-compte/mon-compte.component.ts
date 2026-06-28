import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService, Utilisateur } from '../../../core/services/auth.service';
import { MonCompteService, ClientInfo, CommandesResponse, FavorisResponse, Commande, Favori, PanierResponse, PanierItem } from '../../../core/services/mon-compte.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PanierService } from '../../../core/services/panier.service';

type OngletType = 'profil' | 'securite' | 'confidentialite' | 'commandes' | 'favoris' | 'panier';

@Component({
  selector: 'app-mon-compte',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './mon-compte.component.html',
  styleUrls: ['./mon-compte.component.css']
})
export class MonCompteComponent implements OnInit, OnDestroy {

  utilisateur: Utilisateur | null = null;
  ongletActif: OngletType = 'profil';

  // Données dynamiques
  clientInfo: ClientInfo | null = null;
  commandesResponse: CommandesResponse | null = null;
  favorisResponse: FavorisResponse | null = null;
  panierResponse: PanierResponse | null = null;
  
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

  // Formulaire profil
  profilForm!: FormGroup;
  profilSaving = false;
  profilSuccess = false;
  profilError = '';

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

  private sub!: Subscription;
  private monCompteSubscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private monCompteService: MonCompteService,
    private notificationService: NotificationService,
    private panierService: PanierService
  ) {}

  ngOnInit(): void {
    console.log('🚀 MON COMPTE COMPONENT INIT');
    this.sub = this.authService.utilisateur$.subscribe(u => {
      this.utilisateur = u;
      if (u) {
        console.log('👤 Utilisateur disponible:', u);
        this.initProfilForm(u);
        this.loadClientData();
        // Also refresh all data from MonCompteService to ensure synchronization
        this.monCompteService.refreshAllData();
      }
    });

    // Détection de l'onglet via l'URL (ex: /mon-compte/securite)
    this.route.url.subscribe(segments => {
      const last = segments[segments.length - 1]?.path;
      if (last === 'securite')       this.ongletActif = 'securite';
      else if (last === 'confidentialite') this.ongletActif = 'confidentialite';
      else if (last === 'commandes') this.ongletActif = 'commandes';
      else if (last === 'favoris') this.ongletActif = 'favoris';
      else if (last === 'panier') this.ongletActif = 'panier';
      else                           this.ongletActif = 'profil';
    });

    this.initSecuriteForm();
    this.setupDataSubscriptions();
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
  }

  // -------------------------------------------------------
  // Formulaire profil
  // -------------------------------------------------------
  private initProfilForm(u: Utilisateur): void {
    this.profilForm = this.fb.group({
      prenom:    [u.prenom,    [Validators.required, Validators.minLength(2)]],
      nom:       [u.nom,       [Validators.required, Validators.minLength(2)]],
      email:     [u.email,     [Validators.required, Validators.email]],
      telephone: [u.telephone ?? ''],
      adresse:   [u.adresse   ?? '']
    });
  }

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

  // -------------------------------------------------------
  // ACTIONS FAVORIS
  // -------------------------------------------------------
  ajouterAuPanierDepuisFavori(favori: Favori): void {
    this.panierService.ajouterProduit({
      id: favori.produit_id,
      nom: favori.produit_nom,
      prix: favori.prix,
      quantite: 1
    } as any);
    
    this.notificationService.success(
      `${favori.produit_nom} a été ajouté au panier`,
      'Ajouté au panier'
    );
    
    // Refresh cart data
    this.refreshPanier();
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
  }

  private setupDataSubscriptions(): void {
    console.log('🔧 SETUP DATA SUBSCRIPTIONS APPELE');
    
    // S'abonner aux mises à jour automatiques
    const clientSub = this.monCompteService.clientInfo$.subscribe(info => {
      console.log('👤 CLIENT INFO UPDATE:', info);
      this.clientInfo = info;
    });

    const commandesSub = this.monCompteService.commandes$.subscribe(commandes => {
      console.log('📦 COMMANDES UPDATE:', commandes);
      this.commandesResponse = commandes;
    });

    const favorisSub = this.monCompteService.favoris$.subscribe(favoris => {
      console.log('❤️ FAVORIS UPDATE:', favoris);
      this.favorisResponse = favoris;
    });

    const panierSub = this.monCompteService.panier$.subscribe(panier => {
      console.log('🛒 PANIER UPDATE:', panier);
      this.panierResponse = panier;
    });

    this.monCompteSubscriptions = [clientSub, commandesSub, favorisSub, panierSub];
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