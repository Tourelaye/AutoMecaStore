import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategorieService } from '../../core/services/categorie.service';
import { Categorie } from '../../models/categorie.model';

// Config visuelle associée à chaque catégorie selon son nom
interface CategorieVisuelle {
  icon: string;       // Classe Font Awesome
  cssClass: string;   // Classe CSS de la card
  route: string;      // Route Angular
  sousTitre: string;  // Sous-titre affiché
  badge?: string;     // Badge optionnel
  mockCount: string;  // Compteur affiché (mock en attendant l'API)
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
      badge: '🔥 Tendance',
      mockCount: '10 500+'
    }
  },
  {
    keywords: ['moto', 'scooter', 'motocycle'],
    config: {
      icon: 'fa-solid fa-motorcycle',
      cssClass: 'moto',
      route: '/catalog/moto',
      sousTitre: 'Équipements & Pièces',
      mockCount: '3 200+'
    }
  },
  {
    keywords: ['poids', 'lourd', 'camion', 'truck'],
    config: {
      icon: 'fa-solid fa-truck',
      cssClass: 'truck',
      route: '/catalog/poidLourds',
      sousTitre: 'Pièces Industrielles',
      mockCount: '1 800+'
    }
  },
  {
    keywords: ['velo', 'vélo', 'bike', 'ebike', 'e-bike', 'bicyclette'],
    config: {
      icon: 'fa-solid fa-bicycle',
      cssClass: 'bike',
      route: '/catalog/velo',
      sousTitre: 'Composants & Accessoires',
      mockCount: '800+'
    }
  }
];

// Config par défaut si aucun mot-clé ne correspond
const VISUEL_DEFAULT: CategorieVisuelle = {
  icon: 'fa-solid fa-gears',
  cssClass: 'auto',
  route: '/produits',
  sousTitre: 'Pièces & Accessoires',
  mockCount: '500+'
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

  // -------------------------------------------------------
  // MOCK DATA — actif tant que Django n'a pas de catégories
  // -------------------------------------------------------
  private mockCategories: Categorie[] = [
    {
      id: 1,
      nom: 'Automobile',
      description: 'Toutes les pièces pour votre voiture',
      datecreation: new Date().toISOString(),
      datemodification: new Date().toISOString(),
      etat: 'true',
      categorieid: null
    },
    {
      id: 2,
      nom: 'Moto & Scooter',
      description: 'Équipements et pièces pour deux-roues',
      datecreation: new Date().toISOString(),
      datemodification: new Date().toISOString(),
      etat: 'true',
      categorieid: null
    },
    {
      id: 3,
      nom: 'Poids Lourds',
      description: 'Pièces industrielles pour poids lourds',
      datecreation: new Date().toISOString(),
      datemodification: new Date().toISOString(),
      etat: 'true',
      categorieid: null
    },
    {
      id: 4,
      nom: 'Vélo & E-bike',
      description: 'Composants et accessoires pour vélos',
      datecreation: new Date().toISOString(),
      datemodification: new Date().toISOString(),
      etat: 'true',
      categorieid: null
    }
  ];

  constructor(private categorieService: CategorieService) {}

  ngOnInit(): void {
    // -------------------------------------------------------
    // APPEL API DJANGO — décommenter quand les catégories
    // sont créées dans Django
    // -------------------------------------------------------
    // this.categorieService.getCategories().subscribe({
    //   next: (data) => {
    //     this.categories = data
    //       .filter(c => c.etat === 'true' || c.etat === true)
    //       .map(c => this.enrichirCategorie(c));
    //     this.isLoading = false;
    //   },
    //   error: () => {
    //     this.errorMessage = 'Impossible de charger les catégories.';
    //     this.isLoading = false;
    //   }
    // });

    // MOCK — retirer quand l'API est prête
    this.categories = this.mockCategories.map(c => this.enrichirCategorie(c));
    this.isLoading = false;
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