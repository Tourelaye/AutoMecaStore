import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HomeService, Produit as HomeProduit } from '../../core/services/home.service';

export interface VedetteProduit {
  id: number;
  nom: string;
  marque: string;
  image: string | null;
  prixNouveau: number;
  prixAncien: number | null;
  note: number;
  avis: number;
  stock: number;
  livraison: boolean;
  categorie: string;
}

@Component({
  selector: 'app-vedette',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './vedette.component.html',
  styleUrls: ['./vedette.component.css']
})
export class VedetteComponent implements OnInit {

  isLoading = true;
  errorMessage = '';
  produits: VedetteProduit[] = [];

  constructor(
    private homeService: HomeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFeatured();
  }

  loadFeatured(): void {
    this.homeService.getFeatured(8).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.produits = response.data.map((p: HomeProduit) => this.mapToVedette(p));
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des produits vedettes:', err);
        this.errorMessage = 'Impossible de charger les coups de cœur.';
        this.isLoading = false;
      }
    });
  }

  private mapToVedette(p: HomeProduit): VedetteProduit {
    const prixNouveau = p.prix_promo || p.prix;
    const prixAncien = p.prix_promo ? p.prix : null;
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
      livraison: true,
      categorie: p.categorie_nom || 'Pièce'
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

  isStockFaible(p: VedetteProduit): boolean {
    return p.stock > 0 && p.stock <= 5;
  }

  goToProduit(id: number): void {
    this.router.navigate(['/produits'], { queryParams: { id } });
  }
}
