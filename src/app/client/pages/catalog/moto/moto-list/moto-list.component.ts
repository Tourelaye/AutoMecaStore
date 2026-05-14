import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Produit {
  id: number;
  nom: string;
  marque: string;
  prixNouveau: number;
  prixAncien?: number;
  image?: string;
  description?: string;
  note: number;
  avis: number;
  stock: number;
  discount?: number;
  isNew?: boolean;
  isBestseller?: boolean;
  isFavori?: boolean;
  livraison?: boolean;
}

interface SousCategorie {
  key: string;
  label: string;
  icon: string;
}

interface Marque {
  name: string;
  logo: string;
  selected: boolean;
}

@Component({
  selector: 'app-moto-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './moto-list.component.html',
  styleUrls: ['./moto-list.component.css']
})
export class MotoListComponent implements OnInit {

  showFilters = true;
  viewMode: 'grid' | 'list' = 'grid';
  isLoading = false;
  
  // Filtres
  searchQuery = '';
  triActif = 'pertinence';
  categorieActive = 'all';
  prixMin: number | null = null;
  prixMax: number | null = null;
  filtreLivraison = false;
  filtrePromo = false;
  filtreNew = false;
  filtreBestseller = false;
  noteMin = 0;
  
  // Données
  tousLesProduits: Produit[] = [];
  produitsFiltres: Produit[] = [];
  produitAjoute: number | null = null;

  // Sous-catégories moto
  sousCategoriesMoto: SousCategorie[] = [
    { key: 'all', label: 'Toutes', icon: 'bi-grid-3x3-gap' },
    { key: 'moteur', label: 'Moteur', icon: 'bi-gear' },
    { key: 'freinage', label: 'Freinage', icon: 'bi-shield-check' },
    { key: 'suspension', label: 'Suspension', icon: 'bi-arrow-up-down' },
    { key: 'transmission', label: 'Transmission', icon: 'bi-link' },
    { key: 'eclairage', label: 'Éclairage', icon: 'bi-lightbulb' },
    { key: 'carrosserie', label: 'Carrosserie', icon: 'bi-truck' },
    { key: 'accessoires', label: 'Accessoires', icon: 'bi-bag' }
  ];

  // Marques moto
  marquesMoto: Marque[] = [
    { name: 'Yamaha', logo: 'Y', selected: false },
    { name: 'Honda', logo: 'H', selected: false },
    { name: 'Suzuki', logo: 'S', selected: false },
    { name: 'Kawasaki', logo: 'K', selected: false },
    { name: 'Ducati', logo: 'D', selected: false },
    { name: 'BMW', logo: 'B', selected: false },
    { name: 'KTM', logo: 'K', selected: false },
    { name: 'Harley', logo: 'H', selected: false }
  ];

  ngOnInit(): void {
    this.chargerProduits();
  }

  // -------------------------------------------------------
  // GESTION DES VUES
  // -------------------------------------------------------
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  setGrid(): void {
    this.viewMode = 'grid';
  }

  setList(): void {
    this.viewMode = 'list';
  }

  // -------------------------------------------------------
  // GESTION DES CATÉGORIES
  // -------------------------------------------------------
  setCategorieActive(key: string): void {
    this.categorieActive = key;
    this.appliquerFiltres();
  }

  // -------------------------------------------------------
  // FILTRES
  // -------------------------------------------------------
  appliquerFiltres(): void {
    this.isLoading = true;
    
    // Simuler un chargement
    setTimeout(() => {
      this.produitsFiltres = this.filtrerProduits();
      this.isLoading = false;
    }, 300);
  }

  resetFiltres(): void {
    this.searchQuery = '';
    this.triActif = 'pertinence';
    this.categorieActive = 'all';
    this.prixMin = null;
    this.prixMax = null;
    this.filtreLivraison = false;
    this.filtrePromo = false;
    this.filtreNew = false;
    this.filtreBestseller = false;
    this.noteMin = 0;
    this.marquesMoto.forEach(m => m.selected = false);
    this.appliquerFiltres();
  }

  getNbFiltresActifs(): number {
    let count = 0;
    if (this.searchQuery) count++;
    if (this.filtreLivraison) count++;
    if (this.filtrePromo) count++;
    if (this.filtreNew) count++;
    if (this.filtreBestseller) count++;
    if (this.noteMin > 0) count++;
    if (this.prixMin !== null || this.prixMax !== null) count++;
    if (this.categorieActive !== 'all') count++;
    if (this.marquesMoto.some(m => m.selected)) count++;
    return count;
  }

  private filtrerProduits(): Produit[] {
    let produits = [...this.tousLesProduits];

    // Filtre par recherche
    if (this.searchQuery) {
      produits = produits.filter(p => 
        p.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.marque.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    // Filtre par catégorie
    if (this.categorieActive !== 'all') {
      produits = produits.filter(p => 
        p.nom.toLowerCase().includes(this.categorieActive.toLowerCase())
      );
    }

    // Filtre par prix
    if (this.prixMin !== null) {
      produits = produits.filter(p => p.prixNouveau >= this.prixMin!);
    }
    if (this.prixMax !== null) {
      produits = produits.filter(p => p.prixNouveau <= this.prixMax!);
    }

    // Filtres rapides
    if (this.filtreLivraison) {
      produits = produits.filter(p => p.livraison);
    }
    if (this.filtrePromo) {
      produits = produits.filter(p => p.discount && p.discount > 0);
    }
    if (this.filtreNew) {
      produits = produits.filter(p => p.isNew);
    }
    if (this.filtreBestseller) {
      produits = produits.filter(p => p.isBestseller);
    }

    // Filtre par note
    if (this.noteMin > 0) {
      produits = produits.filter(p => p.note >= this.noteMin);
    }

    // Filtre par marques
    const marquesSelectionnees = this.marquesMoto.filter(m => m.selected).map(m => m.name);
    if (marquesSelectionnees.length > 0) {
      produits = produits.filter(p => marquesSelectionnees.includes(p.marque));
    }

    // Tri
    this.trierProduits(produits);

    return produits;
  }

  private trierProduits(produits: Produit[]): void {
    switch (this.triActif) {
      case 'pertinence':
        // Tri par pertinence (bestsellers d'abord)
        produits.sort((a, b) => (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0));
        break;
      case 'note':
        produits.sort((a, b) => b.note - a.note);
        break;
      case 'prix-asc':
        produits.sort((a, b) => a.prixNouveau - b.prixNouveau);
        break;
      case 'prix-desc':
        produits.sort((a, b) => b.prixNouveau - a.prixNouveau);
        break;
      case 'promo':
        produits.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        break;
    }
  }

  // -------------------------------------------------------
  // ACTIONS PRODUITS
  // -------------------------------------------------------
  goToProduit(id: number): void {
    console.log('Navigation vers produit', id);
    // TODO: Implémenter la navigation vers le détail du produit
  }

  toggleFavori(produit: Produit, event: Event): void {
    event.stopPropagation();
    produit.isFavori = !produit.isFavori;
    console.log('Favori toggled pour', produit.nom, produit.isFavori);
  }

  ajouterAuPanier(produit: Produit, event: Event): void {
    event.stopPropagation();
    if (produit.stock === 0) return;
    
    this.produitAjoute = produit.id;
    console.log('Ajout au panier', produit.nom);
    
    // Simuler l'ajout au panier
    setTimeout(() => {
      this.produitAjoute = null;
    }, 2000);
  }

  // -------------------------------------------------------
  // UTILITAIRES
  // -------------------------------------------------------
  getEtoiles(): number[] {
    return [1, 2, 3, 4, 5];
  }

  isPleine(position: number, note: number): boolean {
    return position <= Math.floor(note);
  }

  isDemi(position: number, note: number): boolean {
    return position === Math.ceil(note) && note % 1 !== 0;
  }

  isStockFaible(produit: Produit): boolean {
    return produit.stock > 0 && produit.stock <= 5;
  }

  private chargerProduits(): void {
    this.isLoading = true;
    
    // Simuler le chargement de produits avec des données réalistes
    setTimeout(() => {
      this.tousLesProduits = [
        {
          id: 1,
          nom: 'Amortisseur arrière Yamaha MT-07',
          marque: 'Yamaha',
          prixNouveau: 89999,
          prixAncien: 119999,
          note: 4.8,
          avis: 124,
          stock: 8,
          discount: 25,
          isNew: false,
          isBestseller: true,
          isFavori: false,
          livraison: true,
          description: 'Amortisseur arrière haute performance pour Yamaha MT-07'
        },
        {
          id: 2,
          nom: 'Plaquettes de frein avant Honda CBR600RR',
          marque: 'Honda',
          prixNouveau: 45999,
          prixAncien: 59999,
          note: 4.6,
          avis: 89,
          stock: 15,
          discount: 23,
          isNew: true,
          isBestseller: false,
          isFavori: false,
          livraison: true,
          description: 'Plaquettes de frein avant HH pour Honda CBR600RR'
        },
        {
          id: 3,
          nom: 'Pot d\'échappement Akrapovic Ducati Panigale',
          marque: 'Ducati',
          prixNouveau: 289999,
          prixAncien: 349999,
          note: 4.9,
          avis: 67,
          stock: 3,
          discount: 17,
          isNew: false,
          isBestseller: true,
          isFavori: true,
          livraison: true,
          description: 'Pot d\'échappement titane Akrapovic pour Ducati Panigale'
        },
        {
          id: 4,
          nom: 'Kit chaîne et pignon Kawasaki Ninja 650',
          marque: 'Kawasaki',
          prixNouveau: 35999,
          note: 4.5,
          avis: 45,
          stock: 0,
          isNew: false,
          isBestseller: false,
          isFavori: false,
          livraison: false,
          description: 'Kit chaîne et pignon JT pour Kawasaki Ninja 650'
        },
        {
          id: 5,
          nom: 'Rétroviseur BMW R1250GS',
          marque: 'BMW',
          prixNouveau: 12999,
          prixAncien: 16999,
          note: 4.3,
          avis: 28,
          stock: 12,
          discount: 24,
          isNew: true,
          isBestseller: false,
          isFavori: false,
          livraison: true,
          description: 'Rétroviseur LED BMW R1250GS avec montage facile'
        },
        {
          id: 6,
          nom: 'Pneu avant Michelin Road 5',
          marque: 'Michelin',
          prixNouveau: 78999,
          note: 4.7,
          avis: 156,
          stock: 20,
          isNew: false,
          isBestseller: true,
          isFavori: false,
          livraison: true,
          description: 'Pneu avant Michelin Road 5 120/70 ZR17'
        }
      ];
      
      this.produitsFiltres = this.filtrerProduits();
      this.isLoading = false;
    }, 800);
  }
}