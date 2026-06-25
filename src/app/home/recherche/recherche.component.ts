import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HomeService } from '../../core/services/home.service';

export interface RechercheItem {
  label: string;
  icon: string;
  categorie: string;
  trending: boolean;
  count: string;
  color: string;
  tag?: string;
  tagColor?: string;
  route?: string;
}

export interface TendanceItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-recherche',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recherche.component.html',
  styleUrl: './recherche.component.css'
})
export class RechercheComponent implements AfterViewInit, OnInit {

  isLoading = true;
  errorMessage = '';

  recherches: RechercheItem[] = [];
  tendances: TendanceItem[] = [];

  constructor(
    private router: Router,
    private homeService: HomeService
  ) {}

  ngOnInit(): void {
    this.loadPopularSearches();
  }

  loadPopularSearches(): void {
    this.homeService.getPopularSearches().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.recherches = response.data.searches || [];
          this.tendances = response.data.trends || [];
          
          // Extraire les catégories uniques pour le filtre
          const categoriesSet = new Set(this.recherches.map(r => r.categorie));
          this.categories = ['Tous', ...Array.from(categoriesSet)];
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des recherches populaires:', err);
        this.errorMessage = 'Impossible de charger les recherches populaires.';
        this.isLoading = false;
      }
    });
  }

  categorieActive = 'Tous';

  categories: string[] = ['Tous'];

  get recherchesFiltrees(): RechercheItem[] {
    if (this.categorieActive === 'Tous') return this.recherches;
    return this.recherches.filter(r => r.categorie === this.categorieActive);
  }

  setCategorie(cat: string): void {
    this.categorieActive = cat;
  }

  onSearch(label: string): void {
    console.log('Recherche:', label);
    this.router.navigate(['/produits'], { queryParams: { search: label } });
  }

  goTo(r: RechercheItem): void {
    if (r.route) {
      this.router.navigate([r.route]);
    }
  }

  goToCat(route: string): void {
    this.router.navigate([route]);
  }

  ngAfterViewInit(): void {
    const trigger = () => {
      document.querySelectorAll('.search-card').forEach((el, i) => {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
          });
        }, { threshold: 0.1 });
        obs.observe(el);
      });
    };
    setTimeout(trigger, 100);
  }
}