import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeRailComponent } from '../shared/home-rail/home-rail.component';
import { RouterModule, Router } from '@angular/router';
import { HomeService, Produit as HomeProduit } from '../../core/services/home.service';
import { ProductBadgesComponent } from '../../shared/components/product-badges/product-badges.component';

export interface RecommandeProduit {
  id: number;
  nom: string;
  marque: string;
  image: string | null;
  prixNouveau: number;
  prixAncien: number | null;
  note: number;
  avis: number;
  stock: number;
  categorie: string;
  raison: string;
  badges?: any[];
  prix?: number;
  prix_promo?: number | null;
  est_en_promo?: boolean;
  seuil_alerte?: number | null;
  date_ajout?: string;
  nombre_ventes?: number;
  vente_eclair?: boolean;
  est_recommande?: boolean;
  statut_approbation?: string;
  livraison_disponible?: boolean;
  retrait_magasin?: boolean;
}

@Component({
  selector: 'app-recommande',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductBadgesComponent, HomeRailComponent],
  templateUrl: './recommande.component.html',
  styleUrls: ['./recommande.component.css']
})
export class RecommandeComponent implements OnInit {

  isLoading = true;
  errorMessage = '';
  produits: RecommandeProduit[] = [];

  constructor(
    private homeService: HomeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRecommended();
  }

  loadRecommended(): void {
    this.homeService.getRecommended(8).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.produits = response.data.map((p: HomeProduit, i: number) => this.mapToRecommande(p, i));
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des recommandations:', err);
        this.errorMessage = 'Impossible de charger les recommandations.';
        this.isLoading = false;
      }
    });
  }

  private mapToRecommande(p: HomeProduit, index: number): RecommandeProduit {
    const prixNouveau = p.prix_promo || p.prix;
    const prixAncien = p.prix_promo ? p.prix : null;

    const raisons = [
      'Populaire cette semaine',
      'Souvent acheté ensemble',
      'Tendance montante',
      'Recommandé par nos experts',
      'Best-seller dans sa catégorie',
      'Très bien noté'
    ];

    return {
      id: p.id,
      nom: p.nom,
      marque: p.marque || 'AutoMecaStore',
      image: p.image_url || null,
      prixNouveau,
      prixAncien,
      note: p.note_moyenne ?? 0,
      avis: p.nombre_avis ?? 0,
      stock: p.stock,
      categorie: p.categorie_nom || 'Pièce',
      raison: raisons[index % raisons.length],
      badges: p.badges || [],
      prix: p.prix,
      prix_promo: p.prix_promo ?? null,
      est_en_promo: p.est_en_promo,
      seuil_alerte: p.seuil_alerte,
      date_ajout: p.date_ajout,
      nombre_ventes: p.nombre_ventes,
      vente_eclair: p.vente_eclair,
      est_recommande: p.est_recommande,
      statut_approbation: p.statut_approbation,
      livraison_disponible: p.livraison_disponible,
      retrait_magasin: p.retrait_magasin
    };
  }

  getEtoiles(): number[] {
    return [1, 2, 3, 4, 5];
  }

  isPleine(i: number, note: number): boolean {
    return i <= Math.floor(note);
  }

  isDemi(i: number, note: number): boolean {
    return i === Math.ceil(note) && note % 1 >= 0.5;
  }

  isStockFaible(p: RecommandeProduit): boolean {
    return p.stock > 0 && p.stock <= 5;
  }

  goToProduit(id: number): void {
    this.router.navigate(['/produits'], { queryParams: { id } });
  }
}
