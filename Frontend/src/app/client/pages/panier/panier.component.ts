import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

import { PanierService } from '../../../core/services/panier.service';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';
import { CommandeClientService } from '../../../core/services/commande-client.service';
import { MonCompteService, PanierItem as BackendPanierItem } from '../../../core/services/mon-compte.service';
import { PanierItem } from '../../../models/panier.model';
import { AuthService } from '../../../core/services/auth.service';
import { PaiementClient, PaiementClientService } from '../../../core/services/paiement-client.service';

type ModeLivraison = 'standard' | 'express' | 'retrait';

@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ScrollRevealDirective],
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

  // Coordonnées de l'invité (commande sans compte)
  inviteForm = {
    prenom: '',
    nom: '',
    email: '',
    telephone: ''
  };
  inviteMoyenPaiement = '';

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
  geoLoading = false;
  geoSuccess = false;
  geoError = false;
  geoPrecision: number | null = null;
  geoTimestamp: string | null = null;
  geoMapUrl: string | null = null;

  // Suppression en cours (pour animation)
  suppressionEnCours: number | null = null;

  // État de la commande
  isCommandeEnCours = false;
  commandeErreur = '';
  commandeSucces = false;
  commandeConfirmee = false;
  commandeDetails: any = null;

  /** Détecte si l'erreur est un avertissement (magasin/mode) ou une erreur critique */
  get isWarningErreur(): boolean {
    const e = this.commandeErreur.toLowerCase();
    return e.includes('ne propose pas') ||
           e.includes('livraison') && e.includes('magasin') ||
           e.includes('retrait') && e.includes('magasin') ||
           e.includes('indisponible') ||
           e.includes('non disponible');
  }
  showRecap = false; // conservé pour compatibilité

  // Paiement
  moyenPaiement = '';
  paymentLoading = false;
  paymentError = '';
  paymentDetails: PaiementClient | null = null;
  showOrderSuccess = false;
  successCountdown = 5;
  private successTimer: any = null;
  moyenPaiementOptions = [
    { key: 'mobile_money', label: 'Mobile Money', icon: 'bi-phone', desc: 'Orange Money, Wave, Free Money', badge: 'Instantané', requiresRedirect: true },
    { key: 'carte', label: 'Carte bancaire', icon: 'bi-credit-card', desc: 'Visa, Mastercard', badge: 'Sécurisé', requiresRedirect: true },
    { key: 'virement', label: 'Virement bancaire', icon: 'bi-bank', desc: 'Transfert bancaire direct', badge: '1-3 jours', requiresRedirect: false },
    { key: 'a_la_livraison', label: 'Payer à la livraison', icon: 'bi-cash-coin', desc: 'Espèces à la réception', badge: 'À la livraison', requiresRedirect: false, livraisonOnly: true },
    { key: 'a_la_retrait', label: 'Payer au retrait', icon: 'bi-shop', desc: 'Espèces au magasin', badge: 'Au retrait', requiresRedirect: false, retraitOnly: true },
    { key: 'especes', label: 'Espèces', icon: 'bi-cash-stack', desc: 'Paiement en espèces', badge: 'Direct', requiresRedirect: false }
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
    // For logged-in users, refresh the backend cart first.
    // PanierService constructor already syncs monCompteService.panier$ → itemsSubject,
    // so items$ will reflect the backend state.
    if (this.authService.isLoggedIn()) {
      this.monCompteService.getPanier().subscribe({
        next: () => {},
        error: (err) => console.error('[PANIER BACKEND] Erreur:', err)
      });
    }

    // Single source of truth: panierService.items$
    // - Logged-in users: synced from backend via PanierService constructor subscription
    // - Non-logged-in users: synced from localStorage
    // - Fallback: if backend add fails, localStorage fallback still populates items$
    this.sub = this.panierService.items$.subscribe(items => {
      this.items = items;
      this.prefillAdresse();
    });
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
      this.geoError = true;
      this.geoSuccess = false;
      this.geoLoading = false;
      this.geolocalisationMessage = 'Géolocalisation non supportée par votre navigateur.';
      return;
    }

    this.geoLoading = true;
    this.geoSuccess = false;
    this.geoError = false;
    this.geolocalisationMessage = '';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.geoLoading = false;
        this.geoSuccess = true;
        this.geoError = false;
        this.adresseForm.latitude = pos.coords.latitude;
        this.adresseForm.longitude = pos.coords.longitude;
        this.geoPrecision = Math.round(pos.coords.accuracy || 0);
        this.geoTimestamp = new Date().toLocaleTimeString('fr-FR');
        this.geoMapUrl = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        this.geolocalisationMessage = `Position captée avec une précision de ${this.geoPrecision} m.`;

        // Auto-remplir l'adresse si vide, via reverse geocoding léger (Nominatim)
        if (!this.adresseForm.adresse || !this.adresseForm.ville) {
          this.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => {
        this.geoLoading = false;
        this.geoSuccess = false;
        this.geoError = true;
        if (err.code === err.PERMISSION_DENIED) {
          this.geolocalisationMessage = 'Géolocalisation refusée. Vous pouvez saisir l\'adresse manuellement.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          this.geolocalisationMessage = 'Position indisponible. Vérifiez votre GPS ou saisissez l\'adresse manuellement.';
        } else if (err.code === err.TIMEOUT) {
          this.geolocalisationMessage = 'Délai dépassé pour la géolocalisation. Réessayez ou saisissez l\'adresse manuellement.';
        } else {
          this.geolocalisationMessage = 'Erreur de géolocalisation. Saisissez l\'adresse manuellement.';
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  private reverseGeocode(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    fetch(url, { headers: { 'Accept-Language': 'fr' } })
      .then(res => res.json())
      .then(data => {
        const a = data.address || {};
        if (!this.adresseForm.adresse) {
          const road = [a.road, a.house_number].filter(Boolean).join(' ');
          this.adresseForm.adresse = road || a.neighbourhood || a.suburb || '';
        }
        if (!this.adresseForm.ville) {
          this.adresseForm.ville = a.city || a.town || a.village || a.county || '';
        }
        if (!this.adresseForm.quartier) {
          this.adresseForm.quartier = a.neighbourhood || a.suburb || a.quarter || '';
        }
        this.geolocalisationMessage = `Position captée et adresse pré-remplie (précision ${this.geoPrecision} m).`;
      })
      .catch(() => {
        // Silencieux : on garde juste les coordonnées GPS
      });
  }

  effacerLocalisation(): void {
    this.adresseForm.latitude = null;
    this.adresseForm.longitude = null;
    this.geoSuccess = false;
    this.geoError = false;
    this.geoLoading = false;
    this.geoPrecision = null;
    this.geoTimestamp = null;
    this.geoMapUrl = null;
    this.geolocalisationMessage = '';
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.successTimer) {
      clearInterval(this.successTimer);
    }
  }

  // -------------------------------------------------------
  // Calculs
  // -------------------------------------------------------
  get isInvite(): boolean {
    return !this.authService.isLoggedIn();
  }

  // L'étape 3 (informations/adresse) est visible si une livraison est prévue
  // ou pour tout invité (ses coordonnées sont toujours requises).
  get etape3Visible(): boolean {
    return this.aLivraison || this.isInvite;
  }

  get sousTotal(): number {
    return this.items.reduce((sum, item) => sum + item.prix * item.quantite, 0);
  }

  get montantRemise(): number {
    return this.sousTotal * (this.remisePromo / 100);
  }

  get aLivraison(): boolean {
    return this.items.some(i => i.mode_reception === 'livraison');
  }

  get aRetrait(): boolean {
    return this.items.some(i => i.mode_reception === 'retrait_magasin');
  }

  get paiementOptionsFiltrees() {
    return this.moyenPaiementOptions.filter(opt => {
      if (opt.livraisonOnly && !this.aLivraison) return false;
      if (opt.retraitOnly && !this.aRetrait) return false;
      return true;
    });
  }

  // Invité : paiement différé uniquement (à la livraison ou au retrait),
  // cohérent avec le mode de réception choisi.
  get paiementOptionsInvite() {
    return this.moyenPaiementOptions.filter(opt => {
      if (opt.key === 'a_la_livraison') return this.aLivraison;
      if (opt.key === 'a_la_retrait') return !this.aLivraison;
      return false;
    });
  }

  // Moyen de paiement invité effectif : la sélection est recalée sur les
  // options réellement disponibles si le mode de réception a changé.
  get inviteMoyenPaiementEffectif(): 'a_la_livraison' | 'a_la_retrait' {
    const keys = this.paiementOptionsInvite.map(o => o.key);
    return (keys.includes(this.inviteMoyenPaiement)
      ? this.inviteMoyenPaiement
      : keys[0]) as 'a_la_livraison' | 'a_la_retrait';
  }

  get selectedOptionRequiresRedirect(): boolean {
    if (!this.moyenPaiement) return false;
    const opt = this.moyenPaiementOptions.find(o => o.key === this.moyenPaiement);
    return !!opt?.requiresRedirect;
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

  sousTotalMagasin(g: any): number {
    return g.items.reduce((sum: number, i: any) => sum + (i.sous_total || i.prix * i.quantite), 0);
  }

  adresseValide(): boolean {
    const f = this.adresseForm;
    // Invité : le nom et le téléphone peuvent être repris du bloc coordonnées
    const nom = f.nom_destinataire?.trim() || `${this.inviteForm.prenom} ${this.inviteForm.nom}`.trim();
    const tel = f.telephone?.trim() || (this.isInvite ? this.inviteForm.telephone?.trim() : '');
    return !!(
      nom &&
      tel &&
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
    // Réinitialiser l'état d'une éventuelle commande précédente
    this.commandeConfirmee = false;
    this.commandeDetails = null;
    this.commandeSucces = false;
    this.showOrderSuccess = false;
    this.paymentDetails = null;
    this.paymentError = '';
    this.moyenPaiement = '';
    // Invité : pré-sélectionner le seul moyen de paiement différé applicable
    this.inviteMoyenPaiement = this.isInvite
      ? (this.aLivraison ? 'a_la_livraison' : 'a_la_retrait')
      : '';
    if (this.successTimer) {
      clearInterval(this.successTimer);
      this.successTimer = null;
    }
    this.etapeCommande = 2;
    this.showRecap = true;
    this.commandeErreur = '';
  }

  afficherRecap(): void {
    this.demarrerCommande();
  }

  retourEtape(): void {
    if (this.etapeCommande > 1) {
      this.etapeCommande--;
      // Sauter l'étape adresse (3) si elle n'est pas affichée
      if (this.etapeCommande === 3 && !this.etape3Visible) {
        this.etapeCommande = 2;
      }
    }
  }

  annulerCommande(): void {
    this.etapeCommande = 1;
    this.showRecap = false;
    this.commandeErreur = '';
    this.commandeConfirmee = false;
    this.commandeDetails = null;
    this.commandeSucces = false;
    this.showOrderSuccess = false;
    this.paymentDetails = null;
    this.paymentError = '';
    this.moyenPaiement = '';
    if (this.successTimer) {
      clearInterval(this.successTimer);
      this.successTimer = null;
    }
  }

  continuerModeVersAdresse(): void {
    this.etapeCommande = this.etape3Visible ? 3 : 4;
  }

  inviteValide(): boolean {
    const f = this.inviteForm;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((f.email || '').trim());
    const telOk = (f.telephone || '').replace(/\D/g, '').length >= 8;
    return !!(
      f.prenom?.trim() &&
      f.nom?.trim() &&
      emailOk &&
      telOk
    );
  }

  continuerAdresseVersRecap(): void {
    // Invité : coordonnées obligatoires (même sans livraison)
    if (this.isInvite && !this.inviteValide()) {
      this.commandeErreur = 'Veuillez renseigner votre prénom, nom, e-mail et numéro de téléphone.';
      return;
    }
    if (this.aLivraison && !this.adresseValide()) {
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
  passerAuPaiementMaintenant(): void {
    if (this.successTimer) {
      clearInterval(this.successTimer);
      this.successTimer = null;
    }
    this.showOrderSuccess = false;
    this.etapeCommande = 5;
    this.showRecap = false;
  }

  passerCommande(): void {
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

    // ---------- PARCOURS INVITÉ ----------
    if (this.isInvite) {
      if (!this.inviteValide()) {
        this.commandeErreur = 'Veuillez renseigner vos informations (prénom, nom, e-mail, téléphone).';
        this.isCommandeEnCours = false;
        return;
      }

      const payload = {
        invite: {
          prenom: this.inviteForm.prenom.trim(),
          nom: this.inviteForm.nom.trim(),
          email: this.inviteForm.email.trim(),
          telephone: this.inviteForm.telephone.trim()
        },
        items: this.items.map(i => ({
          produit_id: i.produit.id,
          quantite: i.quantite,
          fournisseur_id: i.fournisseur_id,
          magasin_id: i.magasin_id,
          mode_reception: (i.mode_reception === 'retrait_magasin' ? 'retrait_magasin' : 'livraison') as 'livraison' | 'retrait_magasin'
        })),
        adresse: this.aLivraison ? {
          ...this.adresseForm,
          nom_destinataire: this.adresseForm.nom_destinataire || `${this.inviteForm.prenom} ${this.inviteForm.nom}`.trim(),
          telephone: this.adresseForm.telephone || this.inviteForm.telephone
        } : undefined,
        mode_paiement: this.inviteMoyenPaiementEffectif
      };

      this.commandeService.creerCommandeInvitee(payload).subscribe({
        next: (commande) => {
          this.commandeSucces = true;
          this.isCommandeEnCours = false;
          this.commandeDetails = commande;
          this.panierService.viderPanier();
          // Pas d'étape paiement en ligne pour les invités : confirmation directe
          this.commandeConfirmee = true;
          this.etapeCommande = 1;
          this.showRecap = false;
        },
        error: (err) => {
          console.error('❌ Erreur commande invité:', err);
          const errors = err?.error?.errors;
          this.commandeErreur = err?.error?.error
            || (errors ? Object.values(errors).join(' ') : 'Erreur lors de la création de la commande. Veuillez réessayer.');
          this.isCommandeEnCours = false;
        }
      });
      return;
    }

    const options = this.aLivraison
      ? { adresse: this.adresseForm, adresse_livraison: this.adresseLivraison, telephone_client: this.telephoneClient }
      : { adresse: undefined, adresse_livraison: undefined, telephone_client: undefined };

    this.commandeService.creerCommandeDepuisPanier(this.items, options).subscribe({
      next: (commande) => {
        this.commandeSucces = true;
        this.isCommandeEnCours = false;
        this.commandeConfirmee = false;
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

        // Afficher l'écran de succès pendant 5s
        this.showOrderSuccess = true;
        this.successCountdown = 5;
        this.successTimer = setInterval(() => {
          this.successCountdown--;
          if (this.successCountdown <= 0) {
            clearInterval(this.successTimer);
            this.successTimer = null;
            this.showOrderSuccess = false;
            this.etapeCommande = 5;
            this.showRecap = false;
          }
        }, 1000);
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

  // Invité : proposition facultative de création de compte pré-remplie
  creerCompteDepuisInvite(): void {
    this.router.navigate(['/register'], {
      queryParams: {
        prenom: this.inviteForm.prenom,
        nom: this.inviteForm.nom,
        email: this.inviteForm.email,
        telephone: this.inviteForm.telephone
      }
    });
  }

  continuerSansCompte(): void {
    this.commandeConfirmee = false;
    this.commandeDetails = null;
    this.etapeCommande = 1;
    this.showRecap = false;
    this.router.navigate(['/']);
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

  // -------------------------------------------------------
  // Horaires magasin
  // -------------------------------------------------------
  hasHoraires(magasin: any): boolean {
    if (!magasin) return false;
    const horaires = magasin.horaires_ouverture;
    const hasPlages = !!horaires && typeof horaires === 'object' && Object.keys(horaires).length > 0;
    return hasPlages || !!(magasin.jours_ouverture || '').trim();
  }

  isMagasinOuvert(magasin: any): boolean {
    if (!magasin?.horaires_ouverture || !magasin?.jours_ouverture) return false;
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const now = new Date();
    const jour = jours[now.getDay()];
    const ouverts = this.getHorairesJours(magasin.jours_ouverture).map(j => j.toLowerCase());
    if (!ouverts.includes(jour)) return false;
    const plages = magasin.horaires_ouverture?.[jour];
    if (!plages) return false;
    const heureActuelle = now.getHours() * 60 + now.getMinutes();

    // Format objet: { ouvert: true, debut: "08:00", fin: "18:00" }
    if (typeof plages === 'object' && !Array.isArray(plages)) {
      if (!plages.ouvert) return false;
      const [oh, om] = (plages.debut || '').split(':').map((x: string) => parseInt(x, 10) || 0);
      const [fh, fm] = (plages.fin || '').split(':').map((x: string) => parseInt(x, 10) || 0);
      return heureActuelle >= oh * 60 + om && heureActuelle < fh * 60 + fm;
    }

    // Format chaîne: "08:00-18:00"
    for (const plage of (Array.isArray(plages) ? plages : [plages])) {
      if (typeof plage !== 'string') continue;
      const match = plage.match(/(\d{1,2}):(\d{0,2})?\s*[-–à]\s*(\d{1,2}):(\d{0,2})?/);
      if (match) {
        const hDebut = parseInt(match[1]) * 60 + (parseInt(match[2]) || 0);
        const hFin = parseInt(match[3]) * 60 + (parseInt(match[4]) || 0);
        if (heureActuelle >= hDebut && heureActuelle <= hFin) return true;
      }
    }
    return false;
  }

  getHorairesJours(jours?: string): string[] {
    if (!jours) return [];
    return jours.split(/[,;]/).map(j => j.trim()).filter(j => j);
  }
}