import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HomeService, Produit as HomeProduit } from '../../core/services/home.service';

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
}

@Component({
  selector: 'app-recommande',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
      raison: raisons[index % raisons.length]
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
