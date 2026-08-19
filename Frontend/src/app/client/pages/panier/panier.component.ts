import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

import { PanierService } from '../../../core/services/panier.service';
import { CommandeClientService } from '../../../core/services/commande-client.service';
import { MonCompteService, PanierItem as BackendPanierItem } from '../../../core/services/mon-compte.service';
import { PanierItem } from '../../../models/panier.model';
import { AuthService } from '../../../core/services/auth.service';
import { PaiementClient, PaiementClientService } from '../../../core/services/paiement-client.service';

type ModeLivraison = 'standard' | 'express' | 'retrait';

@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './panier.component.html',
  styleUrls: ['./panier.component.css'],
  animations: [
    trigger('pageAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('itemAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-24px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(30px)', height: 0, margin: 0, padding: 0 }))
      ])
    ]),
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger('60ms', animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })))
        ], { optional: true })
      ])
    ])
  ]
})
export class PanierComponent implements OnInit, OnDestroy {

  items: PanierItem[] = [];
  private sub!: Subscription;

  // Code promo
  codePromo = '';
  promoAppliquee = false;
  promoErreur = false;
  remisePromo = 0;
  readonly CODES_VALIDES: Record<string, number> = {
    'AUTO10': 10,
    'MECA20': 20,
    'STORE15': 15
  };

  // Étapes du parcours : 1=panier, 2=choix magasin/mode, 3=adresse, 4=récap, 5=paiement, 6=attente/confirmation
  etapeCommande = 1;

  // Livraison (conservé pour compatibilité visuelle)
  modeLivraison: ModeLivraison = 'standard';
  optionsLivraison: { key: ModeLivraison; label: string; prix: number; delai: string }[] = [
    { key: 'standard', label: 'Livraison standard',  prix: 4.99,  delai: '3-5 jours ouvrés' },
    { key: 'express',  label: 'Livraison express',   prix: 9.99,  delai: '24-48h' },
    { key: 'retrait',  label: 'Retrait en magasin',  prix: 0,     delai: 'Disponible sous 2h' }
  ];

  // Formulaire adresse de livraison
  adresseForm = {
    nom_destinataire: '',
    telephone: '',
    adresse: '',
    ville: '',
    quartier: '',
    point_de_repere: '',
    instructions: '',
    latitude: null as number | null,
    longitude: null as number | null
  };
  geolocalisationMessage = '';

  // Suppression en cours (pour animation)
  suppressionEnCours: number | null = null;

  // État de la commande
  isCommandeEnCours = false;
  commandeErreur = '';
  commandeSucces = false;
  commandeConfirmee = false;
  commandeDetails: any = null;
  showRecap = false; // conservé pour compatibilité

  // Paiement
  moyenPaiement = '';
  paymentLoading = false;
  paymentError = '';
  paymentDetails: PaiementClient | null = null;
  moyenPaiementOptions = [
    { key: 'mobile_money', label: 'Mobile Money', icon: 'bi-phone' },
    { key: 'carte', label: 'Carte bancaire', icon: 'bi-credit-card' },
    { key: 'virement', label: 'Virement bancaire', icon: 'bi-bank' },
    { key: 'a_la_livraison', label: 'Payer à la livraison', icon: 'bi-cash' },
    { key: 'a_la_retrait', label: 'Payer au retrait', icon: 'bi-shop' },
    { key: 'especes', label: 'Espèces', icon: 'bi-cash-stack' }
  ];

  constructor(
    private panierService: PanierService,
    private commandeService: CommandeClientService,
    private paiementService: PaiementClientService,
    private router: Router,
    private authService: AuthService,
    private monCompteService: MonCompteService
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      // Use backend cart when authenticated
      this.monCompteService.getPanier().subscribe();
      this.sub = this.monCompteService.panier$.subscribe(panierResponse => {
        if (panierResponse) {
          this.items = panierResponse.items.map(item => ({
            id: item.id,
            produit: {
              id: item.produit_id,
              nom: item.produit_nom,
              prix: item.prix,
              image: item.image,
              reference: (item as any).produit?.reference || ''
            } as any,
            nom: item.produit_nom,
            prix: item.prix,
            quantite: item.quantite,
            stock: (item as any).stock,
            sous_total: (item as any).sous_total,
            favori: false,
            fournisseur_id: item.fournisseur_id,
            fournisseur_nom: item.fournisseur_nom,
            magasin_id: item.magasin_id,
            magasin_nom: item.magasin_nom,
            magasin: (item as any).magasin || undefined,
            mode_reception: (item.mode_reception as 'livraison' | 'retrait_magasin') || 'livraison'
          }));
          this.prefillAdresse();
        } else {
          this.items = [];
        }
      });
    } else {
      // Use localStorage when not authenticated
      this.sub = this.panierService.items$.subscribe(items => {
        this.items = items;
        this.prefillAdresse();
      });
    }
  }

  prefillAdresse(): void {
    const u = this.authService.getCurrentUser();
    if (u) {
      this.adresseForm.nom_destinataire = `${u.prenom || ''} ${u.nom || ''}`.trim();
      this.adresseForm.telephone = u.telephone || '';
      this.adresseForm.adresse = u.adresse || '';
    }
  }

  localiser(): void {
    if (!navigator.geolocation) {
      this.geolocalisationMessage = 'Géolocalisation non supportée.';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.adresseForm.latitude = pos.coords.latitude;
        this.adresseForm.longitude = pos.coords.longitude;
        this.geolocalisationMessage = 'Position enregistrée.';
      },
      () => {
        this.geolocalisationMessage = 'Position refusée. L\'adresse textuelle suffit.';
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // -------------------------------------------------------
  // Calculs
  // -------------------------------------------------------
  get sousTotal(): number {
    return this.items.reduce((sum, item) => sum + item.prix * item.quantite, 0);
  }

  get montantRemise(): number {
    return this.sousTotal * (this.remisePromo / 100);
  }

  get aLivraison(): boolean {
    return this.items.some(i => i.mode_reception === 'livraison');
  }

  get fraisLivraison(): number {
    let total = 0;
    for (const g of this.groupesMagasins) {
      if (g.items[0]?.mode_reception === 'livraison' && g.magasin?.frais_livraison != null) {
        total += Number(g.magasin.frais_livraison);
      }
    }
    return total;
  }

  get total(): number {
    return Math.max(0, this.sousTotal - this.montantRemise + this.fraisLivraison);
  }

  get nbArticles(): number {
    return this.items.reduce((sum, i) => sum + i.quantite, 0);
  }

  get delaiLivraison(): string {
    return this.optionsLivraison.find(o => o.key === this.modeLivraison)?.delai ?? '';
  }

  get livraisonGratuite(): boolean {
    return this.sousTotal >= 100;
  }

  get progressLivraisonGratuite(): number {
    return Math.min(100, (this.sousTotal / 100) * 100);
  }

  get adresseLivraison(): string {
    const f = this.adresseForm;
    const parts = [
      f.adresse,
      f.quartier,
      f.ville,
      f.point_de_repere ? `Repère : ${f.point_de_repere}` : '',
      f.instructions ? `Instructions : ${f.instructions}` : ''
    ].filter(Boolean);
    return parts.join(', ');
  }

  get telephoneClient(): string {
    return this.adresseForm.telephone;
  }

  get etapesParcours(): { etape: number; label: string; icon: string }[] {
    const etapes = [
      { etape: 2, label: 'Réception', icon: 'bi-shop' },
      ...(this.aLivraison ? [{ etape: 3, label: 'Adresse', icon: 'bi-geo-alt' }] : []),
      { etape: 4, label: 'Récapitulatif', icon: 'bi-receipt' },
      { etape: 5, label: 'Paiement', icon: 'bi-credit-card' },
      { etape: 6, label: 'Confirmation', icon: 'bi-check-circle' }
    ];
    return etapes;
  }

  adresseValide(): boolean {
    const f = this.adresseForm;
    return !!(
      f.nom_destinataire?.trim() &&
      f.telephone?.trim() &&
      f.ville?.trim() &&
      f.quartier?.trim() &&
      f.adresse?.trim()
    );
  }

  get groupesMagasins(): { key: string; magasin_id?: number; magasin_nom?: string; magasin?: any; fournisseur_id?: number; fournisseur_nom?: string; items: PanierItem[] }[] {
    const map = new Map<string, PanierItem[]>();
    for (const item of this.items) {
      const key = `${item.magasin_id ?? 'auto'}-${item.fournisseur_id ?? 'auto'}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      magasin_id: items[0].magasin_id,
      magasin_nom: items[0].magasin_nom,
      magasin: items[0].magasin,
      fournisseur_id: items[0].fournisseur_id,
      fournisseur_nom: items[0].fournisseur_nom,
      items
    }));
  }

  voirItineraireMagasin(g: any): void {
    const m = g.magasin;
    if (!m) return;
    const hasCoords = m.latitude != null && m.longitude != null;
    const destLabel = (m.adresse_complete || m.adresse || '') + ' ' + (m.ville || '') + (m.region ? ' ' + m.region : '');
    let url = '';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (hasCoords) {
      const coords = `${m.latitude},${m.longitude}`;
      url = isMobile ? `geo:${coords}?q=${coords}` : `https://www.google.com/maps/search/?api=1&query=${coords}`;
    } else if (destLabel.trim()) {
      const q = encodeURIComponent(destLabel.trim());
      url = isMobile ? `geo:0,0?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    if (url) window.open(url, '_blank');
  }

  // -------------------------------------------------------
  // Quantités
  // -------------------------------------------------------
  increaseQty(item: PanierItem): void {
    if (this.authService.isLoggedIn()) {
      // Use backend when authenticated
      if (item.id !== undefined) {
        this.monCompteService.mettreAJourQuantite(item.id, item.quantite + 1).subscribe();
      }
    } else {
      // Use localStorage when not authenticated
      this.panierService.augmenterQuantite(item);
    }
  }

  decreaseQty(item: PanierItem): void {
    if (this.authService.isLoggedIn()) {
      // Use backend when authenticated
      if (item.id !== undefined && item.quantite > 1) {
        this.monCompteService.mettreAJourQuantite(item.id, item.quantite - 1).subscribe();
      }
    } else {
      // Use localStorage when not authenticated
      if (item.quantite <= 1) return;
      this.panierService.diminuerQuantite(item);
    }
  }

  // -------------------------------------------------------
  // Suppression
  // -------------------------------------------------------
  removeItem(item: PanierItem): void {
    this.suppressionEnCours = item.produit.id;
    setTimeout(() => {
      if (this.authService.isLoggedIn()) {
        // Use backend when authenticated
        if (item.id !== undefined) {
          this.monCompteService.supprimerDuPanier(item.id).subscribe();
        }
      } else {
        // Use localStorage when not authenticated
        this.panierService.supprimerLigne(item);
      }
      this.suppressionEnCours = null;
    }, 200);
  }

  viderPanier(): void {
    if (confirm('Vider tout le panier ?')) {
      if (this.authService.isLoggedIn()) {
        // For authenticated users, we need to delete all items one by one
        // or implement a bulk delete endpoint
        this.monCompteService.getPanier().subscribe(panier => {
          panier.items.forEach(item => {
            this.monCompteService.supprimerDuPanier(item.id).subscribe();
          });
        });
      } else {
        // Use localStorage when not authenticated
        this.panierService.viderPanier();
      }
    }
  }

  // -------------------------------------------------------
  // Favoris
  // -------------------------------------------------------
  toggleFavorite(item: PanierItem): void {
    this.panierService.toggleFavori(item);
  }

  // -------------------------------------------------------
  // Code promo
  // -------------------------------------------------------
  appliquerPromo(): void {
    const code = this.codePromo.trim().toUpperCase();
    if (this.CODES_VALIDES[code]) {
      this.remisePromo = this.CODES_VALIDES[code];
      this.promoAppliquee = true;
      this.promoErreur = false;
    } else {
      this.promoErreur = true;
      this.promoAppliquee = false;
      this.remisePromo = 0;
    }
  }

  retirerPromo(): void {
    this.codePromo = '';
    this.promoAppliquee = false;
    this.promoErreur = false;
    this.remisePromo = 0;
  }

  // -------------------------------------------------------
  // Parcours commande
  // -------------------------------------------------------
  demarrerCommande(): void {
    if (this.items.length === 0) {
      this.commandeErreur = 'Votre panier est vide';
      return;
    }
    this.etapeCommande = 2;
    this.showRecap = true;
    this.commandeErreur = '';
  }

  afficherRecap(): void {
    this.demarrerCommande();
  }

  retourEtape(): void {
    if (this.etapeCommande > 1) this.etapeCommande--;
  }

  annulerCommande(): void {
    this.etapeCommande = 1;
    this.showRecap = false;
    this.commandeErreur = '';
  }

  continuerModeVersAdresse(): void {
    this.etapeCommande = this.aLivraison ? 3 : 4;
  }

  continuerAdresseVersRecap(): void {
    if (!this.aLivraison) {
      this.etapeCommande = 4;
      this.commandeErreur = '';
      return;
    }
    if (!this.adresseValide()) {
      this.commandeErreur = 'Veuillez renseigner votre adresse de livraison (nom, téléphone, ville, quartier et adresse).';
      return;
    }
    this.commandeErreur = '';
    this.etapeCommande = 4;
  }

  setModePourMagasin(key: string, mode: 'livraison' | 'retrait_magasin'): void {
    for (const item of this.items) {
      const itemKey = `${item.magasin_id ?? 'auto'}-${item.fournisseur_id ?? 'auto'}`;
      if (itemKey === key) item.mode_reception = mode;
    }
  }

  // -------------------------------------------------------
  // Commande
  // -------------------------------------------------------
  passerCommande(): void {
    console.log('🔍 passerCommande appelé');
    console.log('📦 Items:', this.items);
    console.log('🔐 Authentifié:', this.authService.isLoggedIn());

    if (this.items.length === 0) {
      this.commandeErreur = 'Votre panier est vide';
      return;
    }

    this.isCommandeEnCours = true;
    this.commandeErreur = '';
    this.commandeSucces = false;

    if (this.aLivraison && !this.adresseValide()) {
      this.commandeErreur = 'Veuillez renseigner votre adresse de livraison.';
      this.isCommandeEnCours = false;
      return;
    }

    const options = this.aLivraison
      ? { adresse: this.adresseForm, adresse_livraison: this.adresseLivraison, telephone_client: this.telephoneClient }
      : { adresse: undefined, adresse_livraison: undefined, telephone_client: undefined };

    this.commandeService.creerCommandeDepuisPanier(this.items, options).subscribe({
      next: (commande) => {
        console.log('✅ Commande créée avec succès:', commande);
        this.commandeSucces = true;
        this.isCommandeEnCours = false;
        this.commandeConfirmee = false;
        this.etapeCommande = 5;
        this.showRecap = false;
        this.commandeDetails = commande;
        this.moyenPaiement = '';
        this.paymentDetails = null;
        this.paymentError = '';

        // Vider le panier après commande réussie
        if (this.authService.isLoggedIn()) {
          this.monCompteService.getPanier().subscribe(panier => {
            panier.items.forEach(item => {
              this.monCompteService.supprimerDuPanier(item.id).subscribe();
            });
          });
        } else {
          this.panierService.viderPanier();
        }
      },
      error: (err) => {
        console.error('❌ Erreur lors de la création de la commande:', err);
        this.commandeErreur = err?.error?.error || 'Erreur lors de la création de la commande. Veuillez réessayer.';
        this.isCommandeEnCours = false;
      }
    });
  }

  continuerAchats(): void {
    this.commandeConfirmee = false;
    this.commandeDetails = null;
    this.paymentDetails = null;
    this.moyenPaiement = '';
    this.etapeCommande = 1;
    this.showRecap = false;
    this.router.navigate(['/catalogue']);
  }

  voirMesCommandes(): void {
    this.commandeConfirmee = false;
    this.commandeDetails = null;
    this.paymentDetails = null;
    this.moyenPaiement = '';
    this.etapeCommande = 1;
    this.showRecap = false;
    this.router.navigate(['/mon-compte'], { fragment: 'commandes' });
  }

  retourPanier(): void {
    this.annulerCommande();
  }

  // -------------------------------------------------------
  // Paiement
  // -------------------------------------------------------
  estPaiementDiffere(moyen?: string): boolean {
    return moyen === 'a_la_livraison' || moyen === 'a_la_retrait';
  }

  private genererIdempotenceKey(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2);
    return `pay-${ts}-${rand}`;
  }

  initierPaiement(): void {
    if (!this.moyenPaiement || !this.commandeDetails?.id) { return; }

    this.paymentLoading = true;
    this.paymentError = '';

    this.paiementService.initierPaiement({
      commande: this.commandeDetails.id,
      moyen: this.moyenPaiement,
      idempotence_key: this.genererIdempotenceKey()
    }).subscribe({
      next: (paiement) => {
        this.paymentLoading = false;
        this.paymentDetails = paiement;

        if (this.estPaiementDiffere(paiement.moyen)) {
          this.commandeConfirmee = true;
          this.etapeCommande = 1;
        } else {
          this.commandeConfirmee = false;
          this.etapeCommande = 6;
        }
      },
      error: (err) => {
        this.paymentLoading = false;
        this.paymentError = err?.error?.error || 'Erreur lors de l\'initiation du paiement.';
      }
    });
  }

  actualiserStatutPaiement(): void {
    if (!this.paymentDetails?.id) { return; }
    this.paymentLoading = true;
    this.paiementService.getPaiement(this.paymentDetails.id).subscribe({
      next: (paiement) => {
        this.paymentLoading = false;
        this.paymentDetails = paiement;
        if (paiement.statut === 'reussi') {
          this.commandeConfirmee = true;
          this.etapeCommande = 1;
        } else if (['echoue', 'annule', 'remboursement_refuse'].includes(paiement.statut)) {
          this.etapeCommande = 5;
          this.moyenPaiement = '';
        }
      },
      error: (err) => {
        this.paymentLoading = false;
        this.paymentError = err?.error?.error || 'Impossible d\'actualiser le statut.';
      }
    });
  }

  annulerPaiementClient(): void {
    if (!this.paymentDetails?.id) { return; }
    this.paymentLoading = true;
    this.paiementService.annulerPaiement(this.paymentDetails.id).subscribe({
      next: () => {
        this.paymentLoading = false;
        this.etapeCommande = 5;
        this.moyenPaiement = '';
        this.paymentDetails = null;
        this.paymentError = 'Paiement annulé. Vous pouvez choisir un autre moyen de paiement.';
      },
      error: (err) => {
        this.paymentLoading = false;
        this.paymentError = err?.error?.error || 'Impossible d\'annuler le paiement.';
      }
    });
  }

  retourRecap(): void {
    this.etapeCommande = 4;
    this.paymentError = '';
    this.moyenPaiement = '';
  }

  // -------------------------------------------------------
  // Track
  // -------------------------------------------------------
  trackById(index: number, item: PanierItem): number {
    return item.produit.id;
  }
}