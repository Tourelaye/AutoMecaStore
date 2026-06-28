import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService, Categorie } from '../../core/services/home.service';

// Config visuelle associée à chaque catégorie selon son nom
interface CategorieVisuelle {
  icon: string;       // Classe Font Awesome
  cssClass: string;   // Classe CSS de la card
  route: string;      // Route Angular
  sousTitre: string;  // Sous-titre affiché
  badge?: string;     // Badge optionnel
}

// Correspondance nom de catégorie → config visuelle
const VISUEL_MAP: { keywords: string[]; config: CategorieVisuelle }[] = [
  {
    keywords: ['auto', 'automobile', 'voiture'],
    config: {
      icon: 'fa-solid fa-car',
      cssClass: 'auto',
      route: '/catalog/auto',
      sousTitre: 'Pièces & Accessoires',
      badge: '🔥 Tendance'
    }
  },
  {
    keywords: ['moto', 'scooter', 'motocycle'],
    config: {
      icon: 'fa-solid fa-motorcycle',
      cssClass: 'moto',
      route: '/catalog/moto',
      sousTitre: 'Équipements & Pièces'
    }
  },
  {
    keywords: ['poids', 'lourd', 'camion', 'truck'],
    config: {
      icon: 'fa-solid fa-truck',
      cssClass: 'truck',
      route: '/catalog/poidLourds',
      sousTitre: 'Pièces Industrielles'
    }
  },
  {
    keywords: ['velo', 'vélo', 'bike', 'ebike', 'e-bike', 'bicyclette'],
    config: {
      icon: 'fa-solid fa-bicycle',
      cssClass: 'bike',
      route: '/catalog/velo',
      sousTitre: 'Composants & Accessoires'
    }
  }
];

// Config par défaut si aucun mot-clé ne correspond
const VISUEL_DEFAULT: CategorieVisuelle = {
  icon: 'fa-solid fa-gears',
  cssClass: 'auto',
  route: '/produits',
  sousTitre: 'Pièces & Accessoires'
};

export interface CategorieAffichee extends Categorie {
  visuel: CategorieVisuelle;
}

@Component({
  selector: 'app-categorie',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './categorie.component.html',
  styleUrls: ['./categorie.component.css']
})
export class CategorieComponent implements OnInit {

  categories: CategorieAffichee[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(private homeService: HomeService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.homeService.getCategories().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categories = response.data.map(c => this.enrichirCategorie(c));
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des catégories:', err);
        this.errorMessage = 'Impossible de charger les catégories.';
        this.isLoading = false;
      }
    });
  }

  // -------------------------------------------------------
  // Associe la config visuelle à une catégorie Django
  // -------------------------------------------------------
  private enrichirCategorie(cat: Categorie): CategorieAffichee {
    const nomLower = cat.nom.toLowerCase();

    const match = VISUEL_MAP.find(entry =>
      entry.keywords.some(kw => nomLower.includes(kw))
    );

    return {
      ...cat,
      visuel: match ? match.config : VISUEL_DEFAULT
    };
  }
}