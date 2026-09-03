import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService, Categorie } from '../../core/services/home.service';

export interface CategoriePopulaire {
  id: number;
  nom: string;
  description: string;
  nombre_produits: number;
  icon: string;
  color: string;
  gradient: string;
  routerLink: string;
}

@Component({
  selector: 'app-categories-populaires',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './categories-populaires.component.html',
  styleUrls: ['./categories-populaires.component.css']
})
export class CategoriesPopulairesComponent implements OnInit {

  isLoading = true;
  errorMessage = '';
  categories: CategoriePopulaire[] = [];

  constructor(private homeService: HomeService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.homeService.getCategories().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.categories = response.data.map((c: Categorie, i: number) => this.mapToCategoriePopulaire(c, i));
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des catégories:', err);
        this.errorMessage = 'Impossible de charger les catégories.';
        this.isLoading = false;
      }
    });
  }

  private mapToCategoriePopulaire(c: Categorie, index: number): CategoriePopulaire {
    const configs = [
      { icon: 'bi-car-front', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', routerLink: '/catalog/auto' },
      { icon: 'bi-bicycle', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)', routerLink: '/catalog/moto' },
      { icon: 'bi-truck', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', routerLink: '/catalog/poidLourds' },
      { icon: 'bi-bicycle', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', routerLink: '/catalog/velo' },
    ];

    const config = configs[index % configs.length];

    return {
      id: c.id,
      nom: c.nom,
      description: c.description,
      nombre_produits: c.nombre_produits,
      icon: config.icon,
      color: config.color,
      gradient: config.gradient,
      routerLink: config.routerLink
    };
  }
}
