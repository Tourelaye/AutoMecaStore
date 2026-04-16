import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanierService } from '../../core/services/panier.service';
import { Produit } from '../../models/produit.model';
// import { ProduitService } from '../../../core/services/produit.service'; // ← décommenter quand Django prêt

export interface VogueProduit {
  id: number;
  nom: string;
  marque: string;
  image: string | null;
  prixNouveau: number;
  prixAncien: number | null;
  discount: number | null;       // réduction en %
  tendance: number;              // hausse des ventes en % cette semaine
  note: number;
  avis: number;
  livraison: boolean;
  badge: string;
  stock: number;
  categorie: string;
  isNew: boolean;                // nouveau produit
}

@Component({
  selector: 'app-vogue',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './vogue.component.html',
  styleUrls: ['./vogue.component.css']
})
export class VogueComponent implements OnInit, OnDestroy {

  isLoading = false;
  errorMessage = '';
  produitAjoute: number | null = null;
  activeFilter = 'tous';

  filters = [
    { key: 'tous',       label: 'Tous' },
    { key: 'auto',       label: '🚗 Automobile' },
    { key: 'moto',       label: '🏍️ Moto' },
    { key: 'poids',      label: '🚚 Poids lourds' },
    { key: 'velo',       label: '🚲 Vélo' },
  ];

  // Tous les produits
  private tousLesProduits: VogueProduit[] = [];

  // Produits filtrés (affichés)
  produits: VogueProduit[] = [];

  constructor(private panierService: PanierService) {}

  ngOnInit(): void {
    this.tousLesProduits = [
      {
        id: 1,
        nom: 'Huile moteur Castrol 5W30',
        marque: 'CASTROL',
        image: 'assets/products/filter.png',
        prixNouveau: 12.99,
        prixAncien: 18.99,
        discount: 30,
        tendance: 45,
        note: 4.8,
        avis: 312,
        livraison: true,
        badge: '🔥 Trending',
        stock: 28,
        categorie: 'auto',
        isNew: false
      },
      {
        id: 2,
        nom: 'Filtre à air Sport',
        marque: 'K&N',
        image: 'assets/products/brake.png',
        prixNouveau: 34.99,
        prixAncien: 44.99,
        discount: 22,
        tendance: 62,
        note: 4.9,
        avis: 187,
        livraison: true,
        badge: '⚡ Hot',
        stock: 4,
        categorie: 'auto',
        isNew: true
      },
      {
        id: 3,
        nom: 'Pneu moto Michelin',
        marque: 'MICHELIN',
        image: 'assets/products/shock.png',
        prixNouveau: 89.99,
        prixAncien: 119.99,
        discount: 25,
        tendance: 38,
        note: 4.7,
        avis: 94,
        livraison: false,
        badge: '🌟 Tendance',
        stock: 12,
        categorie: 'moto',
        isNew: false
      },
      {
        id: 4,
        nom: 'Kit transmission vélo',
        marque: 'SHIMANO',
        image: 'assets/products/kit.png',
        prixNouveau: 59.99,
        prixAncien: null,
        discount: null,
        tendance: 78,
        note: 4.6,
        avis: 56,
        livraison: true,
        badge: '🚀 Viral',
        stock: 7,
        categorie: 'velo',
        isNew: true
      }
    ];

    this.produits = [...this.tousLesProduits];

    // -------------------------------------------------------
    // APPEL API DJANGO — décommenter quand les produits existent
    // -------------------------------------------------------
    // this.isLoading = true;
    // this.produitService.getProduits().subscribe({
    //   next: (data: any) => {
    //     const list = Array.isArray(data) ? data : data.results;
    //     this.tousLesProduits = list.map((p: any, i: number) => ({
    //       id: p.id,
    //       nom: p.nom,
    //       marque: p.marque ?? 'AutoMecaStore',
    //       image: p.image ?? null,
    //       prixNouveau: parseFloat(p.prix_promo ?? p.prix),
    //       prixAncien: p.prix_promo ? parseFloat(p.prix) : null,
    //       discount: p.prix_promo ? Math.round((1 - p.prix_promo / p.prix) * 100) : null,
    //       tendance: Math.floor(Math.random() * 80) + 20,
    //       note: 4.5 + Math.random() * 0.5,
    //       avis: Math.floor(Math.random() * 300) + 50,
    //       livraison: true,
    //       badge: ['🔥 Trending', '⚡ Hot', '🌟 Tendance', '🚀 Viral'][i % 4],
    //       stock: p.stock,
    //       categorie: p.categorie?.nom?.toLowerCase().includes('moto') ? 'moto'
    //                : p.categorie?.nom?.toLowerCase().includes('velo') ? 'velo'
    //                : p.categorie?.nom?.toLowerCase().includes('poids') ? 'poids'
    //                : 'auto',
    //       isNew: i < 2
    //     }));
    //     this.produits = [...this.tousLesProduits];
    //     this.isLoading = false;
    //   },
    //   error: () => {
    //     this.errorMessage = 'Impossible de charger les tendances.';
    //     this.isLoading = false;
    //   }
    // });
  }

  ngOnDestroy(): void {}

  // -------------------------------------------------------
  // Filtrage par catégorie
  // -------------------------------------------------------
  setFilter(key: string): void {
    this.activeFilter = key;
    this.produits = key === 'tous'
      ? [...this.tousLesProduits]
      : this.tousLesProduits.filter(p => p.categorie === key);
  }

  // -------------------------------------------------------
  // Étoiles
  // -------------------------------------------------------
  getEtoiles(): number[] {
    return [1, 2, 3, 4, 5];
  }

  isPleine(i: number, note: number): boolean {
    return i <= Math.floor(note);
  }

  isDemi(i: number, note: number): boolean {
    return i === Math.ceil(note) && note % 1 >= 0.5;
  }

  // -------------------------------------------------------
  // Couleur de la barre de tendance
  // -------------------------------------------------------
  getTendanceColor(pct: number): string {
    if (pct >= 70) return '#16a34a';
    if (pct >= 40) return '#f97316';
    return '#3b82f6';
  }

  // -------------------------------------------------------
  // Panier
  // -------------------------------------------------------
  ajouterAuPanier(produit: VogueProduit, event: Event): void {
    event.stopPropagation();
    if (produit.stock === 0) return;

    const p: Produit & { quantite: number } = {
      id: produit.id,
      nom: produit.nom,
      description: '',
      prix: produit.prixNouveau,
      stock: produit.stock,
      image: produit.image,
      categorie: null,
      gestionnaire_stock: null,
      quantite: 1
    };
    this.panierService.ajouterProduit(p);

    this.produitAjoute = produit.id;
    setTimeout(() => {
      if (this.produitAjoute === produit.id) this.produitAjoute = null;
    }, 1500);
  }

  isStockFaible(p: VogueProduit): boolean {
    return p.stock > 0 && p.stock <= 5;
  }
}