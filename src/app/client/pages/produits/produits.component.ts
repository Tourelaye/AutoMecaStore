import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PanierService } from '../../../core/services/panier.service';
import { ProduitService, Produit } from '../../../core/services/produit.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';
import {
  trigger,
  transition,
  style,
  animate
} from '@angular/animations';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-produits',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './produits.component.html',
  styleUrls: ['./produits.component.css', '../../../shared/styles/scroll-reveal.css'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(15px)' }),
        animate('300ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in',
          style({ opacity: 0, transform: 'translateY(10px)' }))
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

  private routeSub: Subscription | null = null;

  constructor(
    private panierService: PanierService,
    private produitService: ProduitService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Récupérer l'ID du produit depuis les queryParams
    this.routeSub = this.route.queryParams.subscribe(params => {
      const produitId = params['id'];
      if (produitId) {
        this.loadProduit(parseInt(produitId));
      } else {
        // Si pas d'ID, charger tous les produits
        this.loadAllProduits();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  // Charger un produit spécifique
  private loadProduit(id: number): void {
    this.isLoading = true;
    this.erreur = false;
    
    this.produitService.getProduit(id).subscribe({
      next: (produit) => {
        this.produit = produit;
        this.images = produit.image ? [produit.image] : ['https://via.placeholder.com/300'];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement du produit:', err);
        this.erreur = true;
        this.isLoading = false;
        // Charger les données mock en cas d'erreur
        this.loadMockProduit(id);
      }
    });
  }

  // Charger tous les produits (page listing)
  private loadAllProduits(): void {
    this.isLoading = true;
    this.erreur = false;
    
    this.produitService.getProduits().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : data.results || data;
        this.produits = list;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des produits:', err);
        this.erreur = true;
        this.isLoading = false;
        this.loadMockProduits();
      }
    });
  }

  // Données mock pour le produit détaillé
  private loadMockProduit(id: number): void {
    this.produit = {
      id: id,
      nom: 'Filtre à huile BMW E90',
      description: 'Filtre de haute qualité pour moteur BMW E90/E91/E92/E93. Conçu pour offrir une filtration optimale et protéger votre moteur contre les impuretés.',
      prix: 12990,
      stock: 25,
      image: 'https://via.placeholder.com/300',
      categorie: null
    };
    this.images = ['https://via.placeholder.com/300'];
  }

  // Données mock pour la liste
  private loadMockProduits(): void {
    this.produits = [
      {
        id: 1,
        nom: 'Filtre à huile BMW E90',
        description: 'Filtre de haute qualité pour moteur...',
        prix: 12990,
        stock: 25,
        image: 'https://via.placeholder.com/150',
        categorie: null
      },
      {
        id: 2,
        nom: 'Filtre à air BMW E90',
        description: 'Filtre performant',
        prix: 18990,
        stock: 20,
        image: 'https://via.placeholder.com/150',
        categorie: null
      },
      {
        id: 3,
        nom: 'Filtre habitacle BMW E90',
        description: 'Bonne qualité',
        prix: 15990,
        stock: 15,
        image: 'https://via.placeholder.com/150',
        categorie: null
      },
      {
        id: 4,
        nom: 'Filtre carburant BMW E90',
        description: 'Top qualité',
        prix: 22990,
        stock: 0,
        image: 'https://via.placeholder.com/150',
        categorie: null
      }
    ];
  }

  setTab(tab: string): void {
    this.activeTab = tab;
  }

  increase(): void {
    this.quantity++;
  }

  decrease(): void {
    if (this.quantity > 1) this.quantity--;
  }

  addToCart(produit: Produit): void {
    // Vérifier le stock
    if (produit.stock === 0) {
      this.notificationService.warning('Ce produit est en rupture de stock', 'Stock indisponible');
      return;
    }

    this.panierService.ajouterProduit({
      ...produit,
      quantite: this.quantity,
      gestionnaire_stock: 0,
      image: produit.image || null
    });
  
    // Notification de succès
    this.notificationService.success(
      `${produit.nom} a été ajouté au panier`,
      'Produit ajouté'
    );

    // Animation feedback
    this.produitAjoute = true;
    setTimeout(() => {
      this.produitAjoute = false;
    }, 1500);
  }
}