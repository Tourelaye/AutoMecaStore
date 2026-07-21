import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanierService } from '../../core/services/panier.service';
import { HomeService, Produit as HomeProduit } from '../../core/services/home.service';

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

  isLoading = true;
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

  constructor(
    private panierService: PanierService,
    private homeService: HomeService
  ) {}

  ngOnInit(): void {
    this.loadTrending();
  }

  loadTrending(): void {
    this.homeService.getTrending(8).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.tousLesProduits = response.data.map((p: HomeProduit, i: number) => this.mapToVogue(p, i));
          this.produits = [...this.tousLesProduits];
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des tendances:', err);
        this.errorMessage = 'Impossible de charger les tendances.';
        this.isLoading = false;
      }
    });
  }

  private mapToVogue(p: HomeProduit, index: number): VogueProduit {
    const prixNouveau = p.prix_promo || p.prix;
    const prixAncien = p.prix_promo ? p.prix : null;
    const discount = p.pourcentage_reduction || (p.prix_promo ? Math.round((1 - p.prix_promo / p.prix) * 100) : null);

    // Déterminer la catégorie pour le filtre
    const categorieNom = (p.categorie_nom || '').toLowerCase();
    let categorie = 'auto';
    if (categorieNom.includes('moto')) categorie = 'moto';
    else if (categorieNom.includes('velo') || categorieNom.includes('bike')) categorie = 'velo';
    else if (categorieNom.includes('poids') || categorieNom.includes('lourd')) categorie = 'poids';

    // Badge selon l'index
    const badges = ['🔥 Trending', '⚡ Hot', '🌟 Tendance', '🚀 Viral'];
    const badge = badges[index % badges.length];

    return {
      id: p.id,
      nom: p.nom,
      marque: p.marque || 'AutoMecaStore',
      image: p.image_url || null,
      prixNouveau,
      prixAncien,
      discount,
      tendance: Math.floor(Math.random() * 80) + 20, // Simulation de tendance
      note: p.note_moyenne ?? 0,
      avis: p.nombre_avis ?? 0,
      livraison: true,
      badge,
      stock: p.stock,
      categorie,
      isNew: index < 2 // Les 2 premiers sont considérés comme nouveaux
    };
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

    this.produitAjoute = produit.id;
    setTimeout(() => {
      if (this.produitAjoute === produit.id) this.produitAjoute = null;
    }, 1500);
  }

  isStockFaible(p: VogueProduit): boolean {
    return p.stock > 0 && p.stock <= 5;
  }
}