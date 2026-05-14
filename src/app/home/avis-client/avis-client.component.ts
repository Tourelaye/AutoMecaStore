import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Avis {
  id: number;
  nom: string;
  ville: string;
  initiale: string;
  note: number;
  texte: string;
  date: string;
  couleur: string;
  produit: string;
}

@Component({
  selector: 'app-avis-client',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avis-client.component.html',
  styleUrls: ['./avis-client.component.css']
})
export class AvisClientComponent implements OnInit, AfterViewInit {

  avis: Avis[] = [
    {
      id: 1,
      nom: 'Ahmed M.',
      ville: 'Dakar',
      initiale: 'A',
      note: 5,
      texte: 'Excellent service et livraison rapide. Produits de très bonne qualité, exactement ce que je cherchais !',
      date: 'Il y a 2 jours',
      couleur: '#3b82f6',
      produit: 'Pneu Michelin'
    },
    {
      id: 2,
      nom: 'Fatima B.',
      ville: 'Rufisque',
      initiale: 'F',
      note: 5,
      texte: 'Très satisfaite de ma commande. L\'équipe support est très réactive et professionnelle.',
      date: 'Il y a 5 jours',
      couleur: '#ec4899',
      produit: 'Huile moteur'
    },
    {
      id: 3,
      nom: 'Mohamed K.',
      ville: 'Kaolack',
      initiale: 'M',
      note: 4,
      texte: 'Bonne qualité et prix compétitif. Je recommande fortement AutoMecaStore à tous !',
      date: 'Il y a 1 semaine',
      couleur: '#10b981',
      produit: 'Filtre à air'
    },
    {
      id: 4,
      nom: 'Lina Z.',
      ville: 'Thiès',
      initiale: 'L',
      note: 5,
      texte: 'Service impeccable du début à la fin. Pièces originales, livraison soignée. À bientôt !',
      date: 'Il y a 2 semaines',
      couleur: '#8b5cf6',
      produit: 'Freins Brembo'
    }
  ];

  stats = [
    { valeur: '50 000+', label: 'Clients satisfaits' },
    { valeur: '4.9/5',   label: 'Note moyenne'       },
    { valeur: '98%',     label: 'Recommandent'        },
    { valeur: '24h',     label: 'Livraison rapide'    },
  ];

  getEtoiles(note: number): number[] { return [1, 2, 3, 4, 5]; }
  isPleine(i: number, note: number): boolean { return i <= note; }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Intersection Observer pour animer les cards à l'entrée du viewport
    const cards = document.querySelectorAll('.avis-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    cards.forEach(c => observer.observe(c));
  }
}