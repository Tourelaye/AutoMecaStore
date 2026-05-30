import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
export class RechercheComponent implements AfterViewInit {

  recherches: RechercheItem[] = [
    { label: 'Plaquettes frein',      icon: 'bi-stop-circle-fill',    categorie: 'Freinage',     trending: true,  count: '24K', color: '#ef4444', tag: 'Populaire', tagColor: '#ef4444', route: '/produits?search=plaquettes' },
    { label: 'Batterie auto',         icon: 'bi-lightning-fill',      categorie: 'Électrique',   trending: true,  count: '18K', color: '#f59e0b', tag: 'Trending', tagColor: '#f59e0b', route: '/produits?search=batterie' },
    { label: 'Filtre à air',          icon: 'bi-wind',                categorie: 'Filtration',   trending: false, count: '15K', color: '#3b82f6', route: '/produits?search=filtre' },
    { label: 'Pneus Michelin',        icon: 'bi-circle-fill',         categorie: 'Pneumatiques', trending: true,  count: '21K', color: '#10b981', tag: 'Top', tagColor: '#10b981', route: '/produits?search=pneus' },
    { label: 'Amortisseurs',          icon: 'bi-arrows-collapse',     categorie: 'Suspension',   trending: false, count: '9K',  color: '#8b5cf6', route: '/produits?search=amortisseurs' },
    { label: 'Essuie-glaces',         icon: 'bi-moisture',            categorie: 'Visibilité',   trending: false, count: '7K',  color: '#06b6d4', route: '/produits?search=essuie-glaces' },
    { label: 'Embrayage',             icon: 'bi-gear-wide-connected', categorie: 'Transmission', trending: false, count: '11K', color: '#f97316', route: '/produits?search=embrayage' },
    { label: 'Courroie distribution', icon: 'bi-link-45deg',          categorie: 'Moteur',       trending: true,  count: '13K', color: '#d32f2f', tag: 'Urgent', tagColor: '#d32f2f', route: '/produits?search=courroie' },
  ];

  tendances: TendanceItem[] = [
    { label: 'Freinage', route: '/produits?category=freinage' },
    { label: 'Moteur', route: '/produits?category=moteur' },
    { label: 'Suspension', route: '/produits?category=suspension' },
    { label: 'Électrique', route: '/produits?category=electrique' },
  ];

  constructor(private router: Router) {}

  categorieActive = 'Tous';

  categories = [
    'Tous', 'Freinage', 'Filtration', 'Pneumatiques',
    'Suspension', 'Électrique', 'Moteur', 'Transmission', 'Visibilité'
  ];

  get recherchesFiltrees(): RechercheItem[] {
    if (this.categorieActive === 'Tous') return this.recherches;
    return this.recherches.filter(r => r.categorie === this.categorieActive);
  }

  setCategorie(cat: string): void {
    this.categorieActive = cat;
  }

  onSearch(label: string): void {
    console.log('Recherche:', label);
    // TODO: this.router.navigate(['/produits'], { queryParams: { search: label } });
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