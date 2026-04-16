import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanierService } from '../../core/services/panier.service';
import { Produit } from '../../models/produit.model';
// import { ProduitService } from '../../../core/services/produit.service'; // ← décommenter quand Django prêt

export interface OffreProduit {
  id: number;
  nom: string;
  marque: string;
  image: string | null;
  prixNouveau: number;
  prixAncien: number | null;
  discount: number | null;
  note: number;
  avis: number;
  livraison: boolean;
  badge: { label: string; type: 'orange' | 'green' | 'blue' } | null;
  stock: number;
}

@Component({
  selector: 'app-offre',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './offre.component.html',
  styleUrls: ['./offre.component.css']
})
export class OffreComponent implements OnInit {

  isLoading = false;
  errorMessage = '';
  produitAjoute: number | null = null; // ID du produit récemment ajouté

  // -------------------------------------------------------
  // MOCK DATA — remplacer par appel API quand Django prêt
  // -------------------------------------------------------
  produits: OffreProduit[] = [
    {
      id: 1,
      nom: 'Filtre à huile BMW',
      marque: 'MANN-FILTER',
      image: 'assets/products/filter.png',
      prixNouveau: 12.99,
      prixAncien: 18.99,
      discount: 32,
      note: 4.8,
      avis: 159,
      livraison: true,
      badge: { label: '🔥 Bestseller', type: 'orange' },
      stock: 45
    },
    {
      id: 2,
      nom: 'Plaquettes frein avant',
      marque: 'BREMBO',
      image: 'assets/products/brake.png',
      prixNouveau: 49.99,
      prixAncien: 69.99,
      discount: 29,
      note: 4.9,
      avis: 234,
      livraison: true,
      badge: { label: '⭐ Choice', type: 'orange' },
      stock: 18
    },
    {
      id: 3,
      nom: 'Amortisseur arrière',
      marque: 'MONROE',
      image: 'assets/products/shock.png',
      prixNouveau: 78.99,
      prixAncien: null,
      discount: null,
      note: 4.7,
      avis: 124,
      livraison: false,
      badge: null,
      stock: 7
    },
    {
      id: 4,
      nom: 'Kit distribution',
      marque: 'GATES',
      image: 'assets/products/kit.png',
      prixNouveau: 189.99,
      prixAncien: 249.99,
      discount: 24,
      note: 4.6,
      avis: 89,
      livraison: true,
      badge: { label: '💰 Best Price', type: 'green' },
      stock: 3
    }
  ];

  constructor(private panierService: PanierService) {}

  ngOnInit(): void {
    // -------------------------------------------------------
    // APPEL API DJANGO — décommenter quand les produits existent
    // -------------------------------------------------------
    // this.isLoading = true;
    // this.produitService.getProduits().subscribe({
    //   next: (data: any) => {
    //     const produits = Array.isArray(data) ? data : data.results;
    //     this.produits = produits.slice(0, 8).map((p: any) => ({
    //       id: p.id,
    //       nom: p.nom,
    //       marque: p.marque ?? 'AutoMecaStore',
    //       image: p.image ?? null,
    //       prixNouveau: parseFloat(p.prix_promo ?? p.prix),
    //       prixAncien: p.prix_promo ? parseFloat(p.prix) : null,
    //       discount: p.prix_promo
    //         ? Math.round((1 - p.prix_promo / p.prix) * 100)
    //         : null,
    //       note: 4.5,
    //       avis: Math.floor(Math.random() * 200) + 50,
    //       livraison: true,
    //       badge: p.est_en_promo ? { label: '🔥 Promo', type: 'orange' } : null,
    //       stock: p.stock
    //     }));
    //     this.isLoading = false;
    //   },
    //   error: () => {
    //     this.errorMessage = 'Impossible de charger les offres.';
    //     this.isLoading = false;
    //   }
    // });
  }

  // -------------------------------------------------------
  // Génère un tableau [1..n] pour afficher les étoiles
  // -------------------------------------------------------
  getEtoiles(note: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  isEtoilePleine(index: number, note: number): boolean {
    return index <= Math.floor(note);
  }

  isEtoileDemi(index: number, note: number): boolean {
    return index === Math.ceil(note) && note % 1 >= 0.5;
  }

  // -------------------------------------------------------
  // Ajouter au panier
  // -------------------------------------------------------
  ajouterAuPanier(produit: OffreProduit, event: Event): void {
    event.stopPropagation(); // empêche la navigation vers la fiche produit

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

    // Animation feedback
    this.produitAjoute = produit.id;
    setTimeout(() => {
      if (this.produitAjoute === produit.id) {
        this.produitAjoute = null;
      }
    }, 1500);
  }

  // -------------------------------------------------------
  // Stock faible (≤ 5)
  // -------------------------------------------------------
  isStockFaible(produit: OffreProduit): boolean {
    return produit.stock > 0 && produit.stock <= 5;
  }
}