import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PanierService } from '../../../../../core/services/panier.service';
import { ProduitService } from '../../../../../core/services/produit.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { MonCompteService } from '../../../../../core/services/mon-compte.service';
import { Produit } from '../../../../../models/produit.model';

export interface VeloProduit {
  id: number;
  nom: string;
  marque: string;
  description: string;
  image: string | null;
  prixNouveau: number;
  prixAncien: number | null;
  discount: number | null;
  note: number;
  avis: number;
  stock: number;
  livraison: boolean;
  isFavori: boolean;
  isNew: boolean;
  categorie: string; // sous-catégorie velo
}

@Component({
  selector: 'app-velo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './velo-list.component.html',
  styleUrls: ['./velo-list.component.css']
})
export class VeloListComponent implements OnInit {

  showFilters = true;
  viewMode: 'grid' | 'list' = 'grid';
  isLoading = false;
  produitAjoute: number | null = null;

  // Filtres
  searchQuery = '';
  triActif = 'pertinence';
  filtrePromo = false;
  filtreLivraison = false;
  filtreNew = false;
  prixMin: number | null = null;
  prixMax: number | null = null;
  noteMin = 0;
  categorieActive = 'tous';

  sousCategoriesVelo = [
    { key: 'tous',        label: 'Toutes' },
    { key: 'freinage',    label: '🔴 Freinage' },
    { key: 'transmission',label: '⛓️ Transmission' },
    { key: 'roues',      label: '🛞 Roues' },
    { key: 'eclairage',   label: '💡 Éclairage' },
  ];

  // Tous les produits (source)
  public tousLesProduits: VeloProduit[] = [];

  // Produits affichés après filtres
  produitsFiltres: VeloProduit[] = [];

  constructor(
    private router: Router,
    private panierService: PanierService,
    private produitService: ProduitService,
    private notificationService: NotificationService,
    private monCompteService: MonCompteService
  ) {}

  ngOnInit(): void {
    // -------------------------------------------------------
    // CHARGEMENT DYNAMIQUE DES PRODUITS DEPUIS L'API
    // -------------------------------------------------------
    this.isLoading = true;
    // Filtrer par catégorie Vélo (ID: 3)
    this.produitService.getProduits({ categorie: 3 }).subscribe({
      next: (data: any) => {
        console.log('Produits chargés depuis API:', data);
        const list = Array.isArray(data) ? data : data.results || data;

        this.tousLesProduits = list.map((p: any) => ({
          id: p.id,
          nom: p.nom,
          marque: p.marque ?? 'AutoMecaStore',
          description: p.description || 'Description du produit',
          image: p.image_url || p.image_2_url || p.image_3_url || p.image_4_url || null, // Utiliser la première image disponible
          prixNouveau: parseFloat(p.prix_promo ?? p.prix),
          prixAncien: p.prix_promo ? parseFloat(p.prix) : null,
          discount: p.prix_promo ? Math.round((1 - p.prix_promo / p.prix) * 100) : null,
          note: 4.5,
          avis: 0,
          stock: p.stock || 10,
          livraison: true,
          isFavori: false,
          isNew: false,
          categorie: this.mapCategorieToVelo(p.type_piece_nom || '')
        }));

        this.appliquerFiltres();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des produits:', err);
        // En cas d'erreur, charger les données mock
        this.loadMockData();
        this.isLoading = false;
      }
    });
  }

  // Mapper la catégorie de l'API vers les sous-catégories velo
  private mapCategorieToVelo(typePieceNom: string): string {
    const mapping: { [key: string]: string } = {
      'Freinage': 'freinage',
      'Transmission': 'transmission',
      'Roues': 'roues',
      'Éclairage': 'eclairage',
      'Eclairage': 'eclairage',
      'freinage': 'freinage',
      'transmission': 'transmission',
      'roues': 'roues',
      'eclairage': 'eclairage'
    };
    return mapping[typePieceNom] || 'tous';
  }

  // Charger les données mock en cas d'erreur API
  private loadMockData(): void {
    this.tousLesProduits = [
      {
        id: 1, nom: 'Plaquettes de frein avant', marque: 'BREMBO',
        description: 'Plaquettes haute performance pour Renault Clio, Peugeot 206',
        image: 'assets/products/brake.png',
        prixNouveau: 59.99, prixAncien: 79.99, discount: 25,
        note: 4.6, avis: 234, stock: 18, livraison: true,
        isFavori: false, isNew: false, categorie: 'freinage'
      },
      {
        id: 2, nom: 'Filtre à huile Mann', marque: 'MANN-FILTER',
        description: 'Filtre à huile OEM pour BMW E90 E60',
        image: 'assets/products/filter.png',
        prixNouveau: 12.99, prixAncien: 18.99, discount: 32,
        note: 4.8, avis: 159, stock: 45, livraison: true,
        isFavori: false, isNew: false, categorie: 'filtration'
      },
      {
        id: 3, nom: 'Amortisseur avant Monroe', marque: 'MONROE',
        description: 'Amortisseur avant pour véhicules compacts',
        image: 'assets/products/shock.png',
        prixNouveau: 78.99, prixAncien: null, discount: null,
        note: 4.7, avis: 124, stock: 7, livraison: false,
        isFavori: false, isNew: true, categorie: 'suspension'
      },
      {
        id: 4, nom: 'Kit distribution Gates', marque: 'GATES',
        description: 'Kit complet courroie de distribution',
        image: 'assets/products/kit.png',
        prixNouveau: 189.99, prixAncien: 249.99, discount: 24,
        note: 4.6, avis: 89, stock: 0, livraison: true,
        isFavori: false, isNew: false, categorie: 'transmission'
      },
      {
        id: 5, nom: 'Huile moteur Castrol 5W30', marque: 'CASTROL',
        description: 'Huile moteur synthétique haute performance',
        image: 'assets/products/filter.png',
        prixNouveau: 34.99, prixAncien: 44.99, discount: 22,
        note: 4.9, avis: 412, stock: 32, livraison: true,
        isFavori: false, isNew: false, categorie: 'moteur'
      },
      {
        id: 6, nom: 'Kit ampoules LED H7', marque: 'PHILIPS',
        description: 'Kit ampoules LED H7 homologuées route',
        image: null,
        prixNouveau: 49.99, prixAncien: 64.99, discount: 23,
        note: 4.5, avis: 67, stock: 3, livraison: true,
        isFavori: false, isNew: true, categorie: 'eclairage'
      }
    ];
    
    this.appliquerFiltres();
  }

  // -------------------------------------------------------
  // Filtres & Tri
  // -------------------------------------------------------
  appliquerFiltres(): void {
    let result = [...this.tousLesProduits];

    // Recherche
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.nom.toLowerCase().includes(q) ||
        p.marque.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    // Sous-catégorie
    if (this.categorieActive !== 'tous') {
      result = result.filter(p => p.categorie === this.categorieActive);
    }

    // Filtres rapides
    if (this.filtrePromo)     result = result.filter(p => p.discount !== null);
    if (this.filtreLivraison) result = result.filter(p => p.livraison);
    if (this.filtreNew)       result = result.filter(p => p.isNew);

    // Prix
    if (this.prixMin !== null) result = result.filter(p => p.prixNouveau >= this.prixMin!);
    if (this.prixMax !== null) result = result.filter(p => p.prixNouveau <= this.prixMax!);

    // Note minimale
    if (this.noteMin > 0) result = result.filter(p => p.note >= this.noteMin);

    // Tri
    switch (this.triActif) {
      case 'prix-asc':  result.sort((a, b) => a.prixNouveau - b.prixNouveau); break;
      case 'prix-desc': result.sort((a, b) => b.prixNouveau - a.prixNouveau); break;
      case 'note':      result.sort((a, b) => b.note - a.note); break;
      case 'promo':     result.sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0)); break;
    }

    this.produitsFiltres = result;
  }

  resetFiltres(): void {
    this.searchQuery = '';
    this.filtrePromo = false;
    this.filtreLivraison = false;
    this.filtreNew = false;
    this.prixMin = null;
    this.prixMax = null;
    this.noteMin = 0;
    this.categorieActive = 'tous';
    this.triActif = 'pertinence';
    this.appliquerFiltres();
  }

  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------
  toggleFilters(): void { this.showFilters = !this.showFilters; }
  setGrid(): void { this.viewMode = 'grid'; }
  setList(): void { this.viewMode = 'list'; }

  setCategorieActive(key: string): void {
    this.categorieActive = key;
    this.appliquerFiltres();
  }

  toggleFavori(produit: VeloProduit, event: Event): void {
    event.stopPropagation();
    
    if (produit.isFavori) {
      // Retirer des favoris
      this.monCompteService.retirerFavori(produit.id).subscribe({
        next: () => {
          produit.isFavori = false;
          this.notificationService.info(
            `${produit.nom} retiré des favoris`,
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
      this.monCompteService.ajouterFavori(produit.id).subscribe({
        next: () => {
          produit.isFavori = true;
          this.notificationService.success(
            `${produit.nom} ajouté aux favoris`,
            'Favoris'
          );
        },
        error: (err) => {
          console.error('Erreur lors de l\'ajout aux favoris:', err);
          this.notificationService.error('Erreur lors de l\'ajout aux favoris', 'Erreur');
        }
      });
    }
  }

  goToProduit(id: number): void {
    this.router.navigate(['/produits'], { queryParams: { id } });
  }

  // -------------------------------------------------------
  // Panier
  // -------------------------------------------------------
  ajouterAuPanier(produit: VeloProduit, event: Event): void {
    event.stopPropagation();
    
    // Vérifier le stock
    if (produit.stock === 0) {
      this.notificationService.warning('Ce produit est en rupture de stock', 'Stock indisponible');
      return;
    }
  
    this.panierService.ajouterAuPanier({
      produit: {
        id: produit.id,
        nom: produit.nom,
        prix: produit.prixNouveau,
        image: produit.image ?? undefined,
        description: produit.description,
        stock: produit.stock,
        categorie: 0,
        gestionnaire_stock: 0
      } as any,
      nom: produit.nom,
      prix: produit.prixNouveau,
      quantite: 1,
      image: produit.image ?? undefined
    });
  
    // Notification de succès
    this.notificationService.success(
      `${produit.nom} a été ajouté au panier`,
      'Produit ajouté'
    );
  
    // Animation feedback
    this.produitAjoute = produit.id;
    setTimeout(() => {
      if (this.produitAjoute === produit.id) this.produitAjoute = null;
    }, 1500);
  }

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------
  getEtoiles(): number[] { return [1, 2, 3, 4, 5]; }

  isPleine(i: number, note: number): boolean { return i <= Math.floor(note); }

  isDemi(i: number, note: number): boolean {
    return i === Math.ceil(note) && note % 1 >= 0.5;
  }

  isStockFaible(p: VeloProduit): boolean { return p.stock > 0 && p.stock <= 5; }

  getNbFiltresActifs(): number {
    let n = 0;
    if (this.filtrePromo) n++;
    if (this.filtreLivraison) n++;
    if (this.filtreNew) n++;
    if (this.prixMin !== null) n++;
    if (this.prixMax !== null) n++;
    if (this.noteMin > 0) n++;
    if (this.categorieActive !== 'tous') n++;
    return n;
  }
}
