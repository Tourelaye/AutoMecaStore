import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PanierService } from '../../../core/services/panier.service';
import { ProduitService, Produit } from '../../../core/services/produit.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MonCompteService } from '../../../core/services/mon-compte.service';
import { HomeService } from '../../../core/services/home.service';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger
} from '@angular/animations';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-produits',
  standalone: true,
  imports: [CommonModule, DecimalPipe, TitleCasePipe, ScrollRevealDirective],
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

  /** Onglets disponibles */
  readonly tabs = ['description', 'caracteristiques', 'compatibilite', 'avis'] as const;

  private routeSub: Subscription | null = null;

  constructor(
    private panierService: PanierService,
    private produitService: ProduitService,
    private notificationService: NotificationService,
    private monCompteService: MonCompteService,
    private homeService: HomeService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe(params => {
      const produitId = params['id'];
      if (produitId) {
        this.loadProduit(parseInt(produitId, 10));
        this.loadAllProduits();       // charger aussi les similaires
      } else {
        this.loadAllProduits();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  // ── Chargements ───────────────────────────────────────────────────────────

  private loadProduit(id: number): void {
    this.isLoading = true;
    this.erreur = false;

    this.produitService.getProduit(id).subscribe({
      next: (produit) => {
        this.produit = produit;
        
        // Incrémenter les vues du produit
        this.homeService.incrementProductViews(id).subscribe({
          next: () => {
            console.log('Vues incrémentées pour le produit', id);
          },
          error: (err) => {
            console.error('Erreur lors de l\'incrémentation des vues:', err);
          }
        });

        // Construire la liste des images avec les URLs complètes
        this.images = [];
        if (produit.image_url) this.images.push(produit.image_url);
        if (produit.image_2_url) this.images.push(produit.image_2_url);
        if (produit.image_3_url) this.images.push(produit.image_3_url);
        if (produit.image_4_url) this.images.push(produit.image_4_url);

        // Si aucune image, utiliser une image par défaut
        if (this.images.length === 0) {
          this.images = ['https://via.placeholder.com/600x400?text=Produit'];
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

  addToCart(produit: Produit): void {
    if (!produit || produit.stock === 0) {
      this.notificationService.warning('Ce produit est en rupture de stock', 'Stock indisponible');
      return;
    }

    this.panierService.ajouterProduit({
      ...produit,
      quantite: this.quantity,
      gestionnaire_stock: 0,
      image: produit.image ?? null
    });

    this.notificationService.success(
      `${produit.nom} ajouté au panier`,
      'Succès'
    );

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
    }
  }

  nextImage(): void {
    if (this.images.length > 1) {
      this.currentImageIndex = this.currentImageIndex === this.images.length - 1 
        ? 0 
        : this.currentImageIndex + 1;
    }
  }

  setImage(index: number): void {
    this.currentImageIndex = index;
  }

  openLightbox(): void {
    this.lightboxOpen = true;
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
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