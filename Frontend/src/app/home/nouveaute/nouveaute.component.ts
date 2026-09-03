import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HomeService, Produit as HomeProduit } from '../../core/services/home.service';

export interface NouveauteProduit {
  id: number;
  nom: string;
  marque: string;
  image: string | null;
  prixNouveau: number;
  note: number;
  avis: number;
  stock: number;
  categorie: string;
  joursDepuisAjout: number;
}

@Component({
  selector: 'app-nouveaute',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nouveaute.component.html',
  styleUrls: ['./nouveaute.component.css']
})
export class NouveauteComponent implements OnInit {

  isLoading = true;
  errorMessage = '';
  produits: NouveauteProduit[] = [];

  constructor(
    private homeService: HomeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNouveautes();
  }

  loadNouveautes(): void {
    this.homeService.getTrending(8).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.produits = response.data.map((p: HomeProduit, i: number) => this.mapToNouveaute(p, i));
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des nouveautés:', err);
        this.errorMessage = 'Impossible de charger les nouveautés.';
        this.isLoading = false;
      }
    });
  }

  private mapToNouveaute(p: HomeProduit, index: number): NouveauteProduit {
    return {
      id: p.id,
      nom: p.nom,
      marque: p.marque || 'AutoMecaStore',
      image: p.image_url || null,
      prixNouveau: p.prix_promo || p.prix,
      note: p.note_moyenne ?? 0,
      avis: p.nombre_avis ?? 0,
      stock: p.stock,
      categorie: p.categorie_nom || 'Pièce',
      joursDepuisAjout: (index + 1) * 2
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

  isStockFaible(p: NouveauteProduit): boolean {
    return p.stock > 0 && p.stock <= 5;
  }

  getNouveauteLabel(jours: number): string {
    if (jours <= 1) return 'Aujourd\'hui';
    if (jours <= 7) return `Il y a ${jours} jours`;
    if (jours <= 14) return 'Cette semaine';
    return 'Récent';
  }

  goToProduit(id: number): void {
    this.router.navigate(['/produits'], { queryParams: { id } });
  }
}
