import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanierService } from '../../core/services/panier.service';
import { HomeService, Produit as HomeProduit } from '../../core/services/home.service';

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

  isLoading = true;
  errorMessage = '';
  produitAjoute: number | null = null; // ID du produit récemment ajouté

  produits: OffreProduit[] = [];

  constructor(
    private panierService: PanierService,
    private homeService: HomeService
  ) {}

  ngOnInit(): void {
    this.loadOffers();
  }

  loadOffers(): void {
    this.homeService.getRecommended(8).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.produits = response.data.map((p: HomeProduit) => this.mapToOffre(p));
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des offres:', err);
        this.errorMessage = 'Impossible de charger les offres.';
        this.isLoading = false;
      }
    });
  }

  private mapToOffre(p: HomeProduit): OffreProduit {
    const prixNouveau = p.prix_promo || p.prix;
    const prixAncien = p.prix_promo ? p.prix : null;
    const discount = p.pourcentage_reduction || (p.prix_promo ? Math.round((1 - p.prix_promo / p.prix) * 100) : null);

    // Déterminer le badge selon les tags
    let badge = null;
    if (p.est_bestseller) {
      badge = { label: '🏆 Bestseller', type: 'orange' as const };
    } else if (p.est_vedette) {
      badge = { label: '⭐ Choice', type: 'orange' as const };
    } else if (p.est_en_promo && discount && discount >= 30) {
      badge = { label: '💰 Best Price', type: 'green' as const };
    }

    return {
      id: p.id,
      nom: p.nom,
      marque: p.marque || 'AutoMecaStore',
      image: p.image_url || null,
      prixNouveau,
      prixAncien,
      discount,
      note: 4.5 + Math.random() * 0.5, // Simulation de note
      avis: Math.floor(Math.random() * 200) + 50, // Simulation d'avis
      livraison: true,
      badge,
      stock: p.stock
    };
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

    const p = {
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
    this.panierService.ajouterProduit(p as any);

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