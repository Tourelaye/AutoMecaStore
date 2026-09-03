import { Component, OnInit, OnDestroy } from '@angular/core';

import { CommonModule, DecimalPipe, TitleCasePipe } from '@angular/common';

import { RouterLink } from '@angular/router';

import { ActivatedRoute, Router } from '@angular/router';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { PanierService } from '../../../core/services/panier.service';

import { ProduitService, Produit, Offre, AvisProduit } from '../../../core/services/produit.service';

import { AvisClientService } from '../../../core/services/avis-client.service';

import { NotificationService } from '../../../core/services/notification.service';

import { MonCompteService } from '../../../core/services/mon-compte.service';

import { HomeService } from '../../../core/services/home.service';

import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';

import { AuthService } from '../../../core/services/auth.service';

import { Subscription } from 'rxjs';

import {

  trigger,

  transition,

  style,

  animate,

  query,

  stagger

} from '@angular/animations';



@Component({

  selector: 'app-produits',

  standalone: true,

  imports: [CommonModule, DecimalPipe, TitleCasePipe, RouterLink, ScrollRevealDirective, ReactiveFormsModule],

  templateUrl: './produits.component.html',

  styleUrls: ['./produits.component.css', '../../../shared/styles/scroll-reveal.css'],

  animations: [

    // Transition de tabs : entrée fluide par le bas

    trigger('fadeSlide', [

      transition(':enter', [

        style({ opacity: 0, transform: 'translateY(12px)' }),

        animate('320ms cubic-bezier(0.22, 1, 0.36, 1)',

          style({ opacity: 1, transform: 'translateY(0)' }))

      ]),

      transition(':leave', [

        animate('180ms ease-in',

          style({ opacity: 0, transform: 'translateY(6px)' }))

      ])

    ]),



    // Entrée de la page produit

    trigger('pageEnter', [

      transition(':enter', [

        style({ opacity: 0, transform: 'translateY(20px)' }),

        animate('500ms 100ms cubic-bezier(0.22, 1, 0.36, 1)',

          style({ opacity: 1, transform: 'translateY(0)' }))

      ])

    ]),



    // Stagger pour les cartes produits similaires

    trigger('listStagger', [

      transition('* => *', [

        query(':enter', [

          style({ opacity: 0, transform: 'translateY(20px)' }),

          stagger(80, [

            animate('400ms cubic-bezier(0.22, 1, 0.36, 1)',

              style({ opacity: 1, transform: 'translateY(0)' }))

          ])

        ], { optional: true })

      ])

    ])

  ]

})

export class ProduitsComponent implements OnInit, OnDestroy {



  produit: Produit | null = null;

  produits: Produit[] = [];

  images: string[] = [];

  quantity: number = 1;

  activeTab: string = 'description';

  isLoading = false;

  erreur = false;

  produitAjoute = false;

  currentImageIndex: number = 0;

  isWishlisted: boolean = false;

  lightboxOpen: boolean = false;

  imageLoading: boolean = true;



  /** Offres (magasins) */

  offres: Offre[] = [];

  selectedOffre: Offre | null = null;

  modeReception: 'livraison' | 'retrait_magasin' = 'livraison';



  /** Géolocalisation client */

  clientPosition: { lat: number; lng: number } | null = null;

  geoLoading = false;

  geoError: string | null = null;



  /** Formulaire avis */

  reviewForm: FormGroup;

  showReviewForm = false;

  reviewLoading = false;

  reviewError: string | null = null;

  reviewSuccess = false;



  /** Onglets disponibles */

  readonly tabs = ['description', 'caracteristiques', 'compatibilite', 'offres', 'avis'] as const;



  private routeSub: Subscription | null = null;



  constructor(

    private panierService: PanierService,

    private produitService: ProduitService,

    private avisClientService: AvisClientService,

    private notificationService: NotificationService,

    private monCompteService: MonCompteService,

    private homeService: HomeService,

    private authService: AuthService,

    private route: ActivatedRoute,

    private router: Router,

    private sanitizer: DomSanitizer,

    private fb: FormBuilder

  ) {

    this.reviewForm = this.fb.group({

      note: [5, [Validators.required, Validators.min(1), Validators.max(5)]],

      commentaire: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]]

    });

  }



  ngOnInit(): void {

    this.routeSub = this.route.queryParams.subscribe(params => {

      const produitId = params['id'];

      if (produitId) {

        const id = parseInt(produitId, 10);

        this.loadProduit(id);

        this.loadAllProduits();

        this.requestClientLocation(id);

      } else {

        this.loadAllProduits();

      }

    });

  }



  ngOnDestroy(): void {

    this.routeSub?.unsubscribe();

  }



  // ── Chargements ───────────────────────────────────────────────────────────



  private loadProduit(id: number, lat?: number, lng?: number, skipLoading: boolean = false): void {

    if (!skipLoading) {

      this.isLoading = true;

      this.erreur = false;

    }



    this.produitService.getProduit(id, lat, lng).subscribe({

      next: (produit) => {

        this.produit = produit;

        

        // Incrémenter les vues du produit (uniquement au premier chargement)

        if (!skipLoading) {

          this.homeService.incrementProductViews(id).subscribe({

            next: () => {

              console.log('Vues incrémentées pour le produit', id);

            },

            error: (err) => {

              console.error('Erreur lors de l\'incrémentation des vues:', err);

            }

          });

        }



        // Construire la liste des images avec les URLs complètes (uniquement au premier chargement)

        if (!skipLoading) {

          const allImages = [];

          if (produit.image_url) allImages.push(produit.image_url);

          if (produit.image_2_url) allImages.push(produit.image_2_url);

          if (produit.image_3_url) allImages.push(produit.image_3_url);

          if (produit.image_4_url) allImages.push(produit.image_4_url);

          // Placer l'image principale sélectionnée en premier

          const mainIndex = (produit.image_principale_index || 1) - 1;

          if (allImages.length > 0 && mainIndex >= 0 && mainIndex < allImages.length) {

            this.images = [

              allImages[mainIndex],

              ...allImages.slice(0, mainIndex),

              ...allImages.slice(mainIndex + 1)

            ];

          } else {

            this.images = allImages;

          }

        }



        // Construire la liste des offres et etiqueter les meilleures

        this.offres = this.tagOffres(this.buildOffres(produit));



        // Préserver la sélection d'offre lors d'un rechargement géolocalisé

        if (skipLoading && this.selectedOffre) {

          const preserved = this.offres.find(o =>
            o.fournisseur?.id === this.selectedOffre?.fournisseur?.id &&
            o.magasin?.id === this.selectedOffre?.magasin?.id
          );
          if (preserved) { this.selectedOffre = preserved; }
        } else {
          this.selectedOffre = this.offres.length === 1 ? this.offres[0] : null;
        }



        // Mode de réception par défaut adapté à l'offre

        if (this.selectedOffre) {

          this.modeReception = this.selectedOffre.livraison_disponible

            ? 'livraison'

            : (this.selectedOffre.retrait_magasin ? 'retrait_magasin' : 'livraison');

        }



        // Si aucune image, utiliser une image par défaut

        if (this.images.length === 0) {

          const svg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(

            '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">' +

            '<rect width="600" height="400" fill="#f1f5f9"/>' +

            '<circle cx="300" cy="160" r="50" fill="#cbd5e1"/>' +

            '<text x="300" y="250" font-size="20" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">Aucune image</text>' +

            '<text x="300" y="280" font-size="14" fill="#cbd5e1" text-anchor="middle" font-family="sans-serif">AutoMecaStore</text>' +

            '</svg>'

          );

          this.images = [svg];

        }



        this.isLoading = false;

      },

      error: (err) => {

        console.error('Erreur produit:', err);

        this.erreur = true;

        this.isLoading = false;

        this.loadMockProduit(id);

      }

    });

  }



  private loadAllProduits(): void {

    this.produitService.getProduits().subscribe({

      next: (data) => {

        const list = Array.isArray(data) ? data : (data as any).results ?? data;

        // Filtrer les produits similaires par catégorie ou type de pièce

        if (this.produit) {

          this.produits = list.filter((p: Produit) =>

            p.id !== this.produit!.id && // Exclure le produit actuel

            (p.categorie === this.produit!.categorie || p.type_piece === this.produit!.type_piece)

          );

        } else {

          this.produits = list;

        }

        // Si aucun produit unique sélectionné, activer le loading ici

        if (!this.produit) this.isLoading = false;

      },

      error: (err) => {

        console.error('Erreur liste:', err);

        this.loadMockProduits();

        if (!this.produit) this.isLoading = false;

      }

    });

  }



  // ── Mock data ─────────────────────────────────────────────────────────────



  private loadMockProduit(id: number): void {

    this.produit = {

      id,

      nom: 'Filtre à huile BMW E90',

      description:

        'Filtre de haute qualité conçu spécialement pour les moteurs BMW série 3 (E90/E91/E92/E93). ' +

        'Il assure une filtration optimale des impuretés et particules métalliques présentes dans l\'huile moteur. ' +

        'Compatible avec les vidanges longue durée jusqu\'à 30 000 km.',

      prix: 12990,

      stock: 25,

      image: 'https://via.placeholder.com/600x400?text=Filtre+Huile',

      categorie: null

    };

    this.images = [this.produit.image as string];

  }



  private loadMockProduits(): void {

    this.produits = [

      { id: 1, nom: 'Filtre à huile BMW E90',      description: 'Haute filtration',      prix: 12990, stock: 25, image: 'https://via.placeholder.com/400x300?text=Filtre+Huile',     categorie: null },

      { id: 2, nom: 'Filtre à air BMW E90',         description: 'Filtre performant',      prix: 18990, stock: 20, image: 'https://via.placeholder.com/400x300?text=Filtre+Air',       categorie: null },

      { id: 3, nom: 'Filtre habitacle BMW E90',     description: 'Qualité OEM',            prix: 15990, stock: 15, image: 'https://via.placeholder.com/400x300?text=Filtre+Habitacle', categorie: null },

      { id: 4, nom: 'Filtre carburant BMW E90',     description: 'Top qualité',            prix: 22990, stock: 0,  image: 'https://via.placeholder.com/400x300?text=Filtre+Carburant', categorie: null }

    ];

  }



  // ── Actions ───────────────────────────────────────────────────────────────



  setTab(tab: string): void {

    this.activeTab = tab;

  }



  increase(): void {

    if (this.produit && this.quantity < this.produit.stock) {

      this.quantity++;

    }

  }



  decrease(): void {

    if (this.quantity > 1) this.quantity--;

  }



  addToCart(produit: Produit, utiliserOffre: boolean = false): void {

    if (!produit || produit.stock === 0) {

      this.notificationService.warning('Ce produit est en rupture de stock', 'Stock indisponible');

      return;

    }



    // Pour la fiche produit : quantité choisie / sinon 1

    const qte = utiliserOffre ? Math.max(this.quantity, produit.quantite_min || 1) : 1;



    const offre = utiliserOffre ? this.selectedOffre : null;



    // Si plusieurs offres existent sur la fiche et qu'aucune n'est selectionnee

    if (utiliserOffre && !offre && this.offres.length > 1) {

      this.notificationService.warning('Veuillez sélectionner un magasin.', 'Magasin requis');

      this.activeTab = 'offres';

      return;

    }



    if (offre && this.modeReception === 'retrait_magasin' && !offre.retrait_magasin) {

      this.notificationService.warning('Le retrait en magasin n\'est pas proposé par ce vendeur.', 'Option indisponible');

      return;

    }

    if (offre && this.modeReception === 'livraison' && !offre.livraison_disponible) {

      this.notificationService.warning('La livraison n\'est pas proposée par ce vendeur.', 'Option indisponible');

      return;

    }



    this.panierService.ajouterProduit({

      ...produit,

      quantite: qte,

      gestionnaire_stock: 0,

      image: produit.image ?? produit.image_url ?? null,

      fournisseur_id: offre?.fournisseur?.id,

      fournisseur_nom: offre?.fournisseur?.nom_entreprise,

      magasin_id: offre?.magasin?.id,

      magasin_nom: offre?.magasin?.nom_magasin,

      prix: offre ? offre.prix : (produit.prix_promo ?? produit.prix),

      mode_reception: utiliserOffre ? this.modeReception : 'livraison',

      magasin: offre?.magasin

    });



    // Animation bouton

    this.produitAjoute = true;

    setTimeout(() => { this.produitAjoute = false; }, 1800);

  }



  naviguerVersProduit(id: number): void {

    this.router.navigate([], { queryParams: { id } });

  }



  // ── Image Gallery ───────────────────────────────────────────────────────────



  prevImage(): void {

    if (this.images.length > 1) {

      this.currentImageIndex = this.currentImageIndex === 0 

        ? this.images.length - 1 

        : this.currentImageIndex - 1;

      this.imageLoading = true;

    }

  }



  nextImage(): void {

    if (this.images.length > 1) {

      this.currentImageIndex = this.currentImageIndex === this.images.length - 1 

        ? 0 

        : this.currentImageIndex + 1;

      this.imageLoading = true;

    }

  }



  setImage(index: number): void {

    if (this.currentImageIndex !== index) {

      this.currentImageIndex = index;

      this.imageLoading = true;

    }

  }



  onImageLoad(): void {

    this.imageLoading = false;

  }



  onImageError(event: Event): void {

    const img = event.target as HTMLImageElement;

    if (img) {

      img.onerror = null;

      const svg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(

        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">' +

        '<rect width="600" height="400" fill="#f1f5f9"/>' +

        '<text x="300" y="180" font-size="48" fill="#cbd5e1" text-anchor="middle" font-family="sans-serif">Image indisponible</text>' +

        '<text x="300" y="220" font-size="16" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">AutoMecaStore</text>' +

        '</svg>'

      );

      img.src = svg;

      this.imageLoading = false;

    }

  }



  openLightbox(): void {

    this.lightboxOpen = true;

  }



  closeLightbox(): void {

    this.lightboxOpen = false;

  }



  // ── Calculs ───────────────────────────────────────────────────────────────



  calculerPourcentageReduction(): number {

    if (!this.produit || !this.produit.prix_promo || !this.produit.prix) {

      return 0;

    }

    return Math.round((1 - this.produit.prix_promo / this.produit.prix) * 100);

  }



  getNoteMoyenne(): number {

    return this.produit?.note_moyenne ?? 0;

  }



  getNombreAvis(): number {

    return this.produit?.nombre_avis ?? 0;

  }



  // ── Géolocalisation ───────────────────────────────────────────────────────



  requestClientLocation(id: number): void {

    if (!('geolocation' in navigator)) {

      this.geoError = 'Géolocalisation non supportée';

      return;

    }

    this.geoLoading = true;

    navigator.geolocation.getCurrentPosition(

      (pos) => {

        this.clientPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        this.geoLoading = false;

        // Recharger le produit avec les coordonnées pour obtenir les distances

        if (this.produit) {

          this.loadProduit(this.produit.id, this.clientPosition.lat, this.clientPosition.lng, true);

        } else {

          this.loadProduit(id, this.clientPosition.lat, this.clientPosition.lng, true);

        }

      },

      (err) => {

        this.geoLoading = false;

        this.geoError = err.code === 1 ? 'Géolocalisation refusée' : 'Position indisponible';

        console.warn('Geolocation error:', err.message);

      }

    );

  }



  // ── Offres & magasins ─────────────────────────────────────────────────────



  buildOffres(produit: Produit): Offre[] {

    if (produit.offres && produit.offres.length > 0) {

      return produit.offres;

    }

    // Fallback : construire une offre à partir du fournisseur/magasin principal

    const offre: Offre = {

      fournisseur: produit.fournisseur_detail ?? { id: 0, nom_entreprise: 'AutoMecaStore' },

      magasin: produit.magasin_detail,

      prix: produit.prix_promo || produit.prix,

      stock: produit.stock,

      livraison_disponible: produit.livraison_disponible ?? false,

      retrait_magasin: produit.retrait_magasin ?? false,

      delai_livraison: produit.delai_livraison || '2_5j',

      distance_km: null,

      badge: 'principal'

    };

    return [offre];

  }



  tagOffres(offres: Offre[]): Offre[] {

    if (offres.length <= 1) { return offres; }



    const minPrix = Math.min(...offres.map(o => o.prix));

    const prixWinners = offres.filter(o => o.prix === minPrix).length;



    const withDistance = offres.filter(o => o.distance_km != null && o.distance_km >= 0);

    const minDist = withDistance.length

      ? Math.min(...withDistance.map(o => o.distance_km as number))

      : null;

    const distWinners = minDist != null

      ? offres.filter(o => o.distance_km === minDist).length

      : 0;



    return offres.map(o => {

      const badges: string[] = [];

      if (o.prix === minPrix && prixWinners === 1) { badges.push('meilleur_prix'); }

      if (minDist != null && o.distance_km === minDist && distWinners === 1) { badges.push('plus_proche'); }

      if (o.livraison_disponible) { badges.push('livraison'); }

      if (o.retrait_magasin) { badges.push('retrait'); }

      return { ...o, badges };

    });

  }



  selectBestOffre(offres: Offre[]): Offre | null {

    // Ne plus selectionner automatiquement la meilleure offre

    return null;

  }



  onSelectOffre(offre: Offre): void {

    this.selectedOffre = offre;

    // Adapter le mode de réception aux capacités du magasin

    if (this.modeReception === 'retrait_magasin' && !offre.retrait_magasin) {

      this.modeReception = offre.livraison_disponible ? 'livraison' : 'livraison';

    } else if (this.modeReception === 'livraison' && !offre.livraison_disponible) {

      this.modeReception = offre.retrait_magasin ? 'retrait_magasin' : 'livraison';

    }

  }



  getPrixDisplay(offre?: Offre): number {

    if (offre) { return offre.prix; }

    if (this.produit?.est_en_promo && this.produit.prix_promo) { return this.produit.prix_promo; }

    return this.produit?.prix ?? 0;

  }



  badgeLabel(badge: string): string {

    const labels: { [k: string]: string } = {

      meilleur_prix: 'Meilleur prix',

      plus_proche: 'Plus proche',

      mieux_note: 'Mieux noté',

      principal: 'Principal',

      partenaire: 'Partenaire',

      recommande: 'Recommandé'

    };

    return labels[badge] || badge;

  }



  badgeClass(badge: string): string {

    switch (badge) {

      case 'meilleur_prix': return 'badge-prix';

      case 'plus_proche': return 'badge-proche';

      case 'mieux_note': return 'badge-note';

      case 'principal': return 'badge-principal';

      case 'partenaire': return 'badge-partenaire';

      default: return 'badge-default';

    }

  }



  isOffreRecommandee(offre: Offre): boolean {

    if (!this.selectedOffre) { return false; }

    if (offre === this.selectedOffre) { return true; }

    // Tag "Offre recommandée" si c'est celle au meilleur prix parmi celles comparables

    const minPrix = Math.min(...this.offres.map(o => o.prix));

    return offre.prix === minPrix && this.offres.filter(o => o.prix === minPrix).length === 1;

  }



  getDistanceLabel(offre: Offre): string {

    if (offre.distance_km !== null && offre.distance_km !== undefined) {

      return `${offre.distance_km} km`;

    }

    if (offre.magasin?.ville) {

      return offre.magasin.ville;

    }

    return 'Distance non calculée';

  }



  getMapUrl(offre: Offre): SafeResourceUrl | null {

    const lat = offre.magasin?.latitude;

    const lng = offre.magasin?.longitude;

    if (!lat || !lng) { return null; }

    const url = `https://www.google.com/maps?q=${lat},${lng}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);

  }



  getItineraireUrl(offre: Offre): SafeResourceUrl | null {

    const destLat = offre.magasin?.latitude;

    const destLng = offre.magasin?.longitude;

    if (!destLat || !destLng) { return null; }



    const client = this.clientPosition;

    const url = client

      ? `https://www.google.com/maps/dir/?api=1&origin=${client.lat},${client.lng}&destination=${destLat},${destLng}&travelmode=driving`

      : `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);

  }



  openItineraire(offre: Offre): void {

    const destLat = offre.magasin?.latitude;

    const destLng = offre.magasin?.longitude;

    if (!destLat || !destLng) { return; }

    const client = this.clientPosition;

    const url = client

      ? `https://www.google.com/maps/dir/?api=1&origin=${client.lat},${client.lng}&destination=${destLat},${destLng}&travelmode=driving`

      : `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;

    window.open(url, '_blank', 'noopener,noreferrer');

  }



  callMagasin(offre: Offre): void {

    const tel = offre.magasin?.telephone;

    if (tel) {

      window.location.href = `tel:${tel}`;

    }

  }



  isMagasinOuvert(offre: Offre): boolean {

    const magasin = offre.magasin;

    if (!magasin?.horaires_ouverture || !magasin?.jours_ouverture) {

      return false;

    }

    const now = new Date();

    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

    const jour = jours[now.getDay()];

    const ouverts = this.getHorairesJours(magasin.jours_ouverture).map(j => j.toLowerCase());

    if (!ouverts.includes(jour)) {

      return false;

    }

    const plages = magasin.horaires_ouverture?.[jour];

    if (!plages) {

      return false;

    }

    const minutes = now.getHours() * 60 + now.getMinutes();

    for (const plage of (Array.isArray(plages) ? plages : [plages])) {

      const [ouv, fer] = plage.split('-');

      if (ouv && fer) {

        const [oh, om] = ouv.split(':').map((x: string) => parseInt(x, 10) || 0);

        const [fh, fm] = fer.split(':').map((x: string) => parseInt(x, 10) || 0);

        const debut = oh * 60 + om;

        const fin = fh * 60 + fm;

        if (minutes >= debut && minutes < fin) {

          return true;

        }

      }

    }

    return false;

  }



  getHorairesJours(jours?: string): string[] {

    if (!jours) { return []; }

    return jours.split(',').map(j => j.trim()).filter(Boolean);

  }



  setModeReception(mode: 'livraison' | 'retrait_magasin'): void {

    if (mode === 'retrait_magasin' && this.selectedOffre && !this.selectedOffre.retrait_magasin) {

      this.notificationService.warning('Ce magasin ne propose pas le retrait.', 'Indisponible');

      return;

    }

    if (mode === 'livraison' && this.selectedOffre && !this.selectedOffre.livraison_disponible) {

      this.notificationService.warning('Ce magasin ne propose pas la livraison.', 'Indisponible');

      return;

    }

    this.modeReception = mode;

  }



  // ── Avis ─────────────────────────────────────────────────────────────────



  getAvisList(): AvisProduit[] {

    return this.produit?.avis || [];

  }



  openReviewForm(): void {

    if (!this.authService.isAuthenticated()) {

      this.notificationService.warning('Connectez-vous pour laisser un avis.', 'Connexion requise');

      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });

      return;

    }

    this.showReviewForm = true;

    this.reviewError = null;

    this.reviewSuccess = false;

  }



  closeReviewForm(): void {

    this.showReviewForm = false;

    this.reviewForm.reset({ note: 5, commentaire: '' });

  }



  submitReview(): void {

    if (this.reviewForm.invalid || !this.produit) {

      return;

    }

    this.reviewLoading = true;

    this.reviewError = null;

    this.avisClientService.createAvis({

      ...this.reviewForm.value,

      produit: this.produit.id

    }).subscribe({

      next: (avis) => {

        this.produit!.avis = [avis, ...(this.produit!.avis || [])];

        this.produit!.nombre_avis = (this.produit!.nombre_avis || 0) + 1;

        this.reviewSuccess = true;

        this.reviewLoading = false;

        this.notificationService.success('Avis enregistré. Merci pour votre retour !', 'Avis envoyé');

        setTimeout(() => { this.closeReviewForm(); this.reviewSuccess = false; }, 1500);

      },

      error: (err) => {

        this.reviewLoading = false;

        this.reviewError = err.error?.error || err.error?.detail || 'Impossible d\'envoyer l\'avis.';

      }

    });

  }



  getDistribution(): { [note: string]: { count: number; pct: number } } {

    return this.produit?.distribution_etoiles || {

      '1': { count: 0, pct: 0 },

      '2': { count: 0, pct: 0 },

      '3': { count: 0, pct: 0 },

      '4': { count: 0, pct: 0 },

      '5': { count: 0, pct: 0 }

    };

  }



  formatDate(d?: string): string {

    if (!d) { return ''; }

    const date = new Date(d);

    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  }



  getEtoiles(): number[] {

    return [1, 2, 3, 4, 5];

  }



  isPleine(i: number, note: number): boolean {

    return i <= Math.floor(note || 0);

  }



  isDemi(i: number, note: number): boolean {

    const n = note || 0;

    return i === Math.ceil(n) && (n % 1) >= 0.5;

  }



  getEtatLabel(etat?: string): string {

    const map: any = { neuf: 'Neuf', occasion: 'Occasion', reconditionne: 'Reconditionné' };

    return map[etat || ''] || 'Non spécifié';

  }



  getDisponibiliteLabel(dispo?: string): string {

    const map: any = {

      en_stock: 'En stock',

      faible_stock: 'Faible stock',

      rupture: 'Rupture de stock',

      precommande: 'Précommande'

    };

    return map[dispo || ''] || 'Non spécifié';

  }



  getDelaiLivraisonLabel(delai?: string): string {

    const map: any = {

      same_day: 'Livraison le jour même',

      '24h': '24 heures',

      '48h': '48 heures',

      '2_5j': '2 à 5 jours',

      '5_7j': '5 à 7 jours',

      '7j_plus': 'Plus de 7 jours'

    };

    return map[delai || ''] || 'Non spécifié';

  }



  getPaysLabel(pays?: string): string {

    const map: any = {

      japon: 'Japon', allemagne: 'Allemagne', france: 'France',

      coree_sud: 'Corée du Sud', chine: 'Chine', usa: 'États-Unis',

      italie: 'Italie', espagne: 'Espagne', turquie: 'Turquie', inde: 'Inde'

    };

    return map[pays || ''] || 'Non spécifié';

  }



  getGarantieLabel(mois?: number): string {

    return mois ? `${mois} mois` : 'Sans garantie';

  }



  // ── Wishlist ───────────────────────────────────────────────────────────────



  toggleWishlist(): void {

    if (!this.produit) {

      this.notificationService.warning('Aucun produit sélectionné', 'Erreur');

      return;

    }



    if (this.isWishlisted) {

      // Retirer des favoris

      this.monCompteService.retirerFavori(this.produit.id).subscribe({

        next: () => {

          this.isWishlisted = false;

          this.notificationService.info(

            `${this.produit!.nom} retiré des favoris`,

            'Favoris'

          );

        },

        error: (err) => {

          console.error('Erreur lors du retrait des favoris:', err);

          this.notificationService.error('Erreur lors du retrait des favoris', 'Erreur');

        }

      });

    } else {

      // Ajouter aux favoris

      this.monCompteService.ajouterFavori(this.produit.id).subscribe({

        next: () => {

          this.isWishlisted = true;

          this.notificationService.success(

            `${this.produit!.nom} ajouté aux favoris`,

            'Favoris'

          );

        },

        error: (err) => {

          console.error('Erreur lors de l\'ajout aux favoris:', err);

          if (err.error?.error === 'Produit déjà dans les favoris') {

            this.isWishlisted = true;

            this.notificationService.warning('Ce produit est déjà dans vos favoris', 'Favoris');

          } else {

            this.notificationService.error('Erreur lors de l\'ajout aux favoris', 'Erreur');

          }

        }

      });

    }

  }

}