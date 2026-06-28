import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Partenaire {
  nom: string;
  initiale: string;
  couleur: string;
  textColor: string;
  description: string;
  depuis: string;
}

export interface Stat {
  valeur: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-partenaire',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './partenaire.component.html',
  styleUrl: './partenaire.component.css'
})
export class PartenaireComponent implements AfterViewInit {

  partenaires: Partenaire[] = [
    { nom: 'Bosch',       initiale: 'B', couleur: '#dc2626', textColor: '#fff', description: 'Équipementier mondial',  depuis: 'Depuis 2022' },
    { nom: 'Michelin',    initiale: 'M', couleur: '#2563eb', textColor: '#fff', description: 'Leader pneumatiques',    depuis: 'Depuis 2022' },
    { nom: 'Brembo',      initiale: 'B', couleur: '#b91c1c', textColor: '#fff', description: 'Systèmes de freinage',   depuis: 'Depuis 2023' },
    { nom: 'Varta',       initiale: 'V', couleur: '#0369a1', textColor: '#fff', description: 'Batteries automobiles',  depuis: 'Depuis 2023' },
    { nom: 'Mann-Filter', initiale: 'M', couleur: '#ca8a04', textColor: '#fff', description: 'Filtration de précision', depuis: 'Depuis 2022' },
    { nom: 'Gates',       initiale: 'G', couleur: '#7c3aed', textColor: '#fff', description: 'Transmission & distribution', depuis: 'Depuis 2024' },
  ];

  stats: Stat[] = [
    { valeur: '50+',   label: 'Marques partenaires',  icon: 'bi-award-fill'        },
    { valeur: '10K+',  label: 'Produits certifiés',   icon: 'bi-patch-check-fill'  },
    { valeur: '99.8%', label: 'Taux de satisfaction', icon: 'bi-star-fill'         },
    { valeur: '3+',    label: 'Années de confiance',  icon: 'bi-calendar-check-fill' },
  ];

  ngAfterViewInit(): void {
    const els = document.querySelectorAll('.brand-card, .stat-card, .cta-block');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
  }
}