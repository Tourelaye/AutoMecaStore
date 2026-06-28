import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Feature {
  icon: string;
  iconLib: 'bi' | 'fa';
  titre: string;
  desc: string;
  detail: string;
  couleur: string;
  bgColor: string;
}

interface Stat {
  valeur: number;
  suffix: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-chooce',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chooce.component.html',
  styleUrls: ['./chooce.component.css']
})
export class ChooceComponent implements AfterViewInit {

  features: Feature[] = [
    {
      icon: 'bi-shield-fill-check',
      iconLib: 'bi',
      titre: 'Paiement Sécurisé',
      desc: '100% protégé',
      detail: 'SSL, Mobile Money & carte bancaire acceptés',
      couleur: '#16a34a',
      bgColor: '#dcfce7'
    },
    {
      icon: 'bi-truck-front-fill',
      iconLib: 'bi',
      titre: 'Livraison Express',
      desc: '24 à 48h',
      detail: 'Partout au Sénégal, suivi en temps réel',
      couleur: '#2563eb',
      bgColor: '#dbeafe'
    },
    {
      icon: 'bi-headset',
      iconLib: 'bi',
      titre: 'Support 24/7',
      desc: 'Service client',
      detail: 'Réponse garantie en moins de 2 heures',
      couleur: '#ea580c',
      bgColor: '#ffedd5'
    },
    {
      icon: 'bi-patch-check-fill',
      iconLib: 'bi',
      titre: 'Garantie Qualité',
      desc: 'Pièces d\'origine',
      detail: 'Certifiées OEM, garantie constructeur 2 ans',
      couleur: '#9333ea',
      bgColor: '#f3e8ff'
    }
  ];

  stats: Stat[] = [
    { valeur: 50000, suffix: '+', label: 'Clients satisfaits', icon: 'bi-people-fill'       },
    { valeur: 10000, suffix: '+', label: 'Références en stock', icon: 'bi-box-seam-fill'     },
    { valeur: 98,    suffix: '%', label: 'Taux de satisfaction', icon: 'bi-star-fill'        },
    { valeur: 3,     suffix: '+', label: 'Ans d\'expérience',    icon: 'bi-calendar2-check-fill' },
  ];

  ngAfterViewInit(): void {
    // Animate cards on scroll
    const cards = document.querySelectorAll('.feature-card, .stat-item');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    cards.forEach(c => obs.observe(c));

    // Animate counters
    const counters = document.querySelectorAll<HTMLElement>('.counter');
    const cObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement;
          const target = parseInt(el.dataset['target'] ?? '0', 10);
          this.animateCounter(el, target);
          cObs.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => cObs.observe(c));
  }

  private animateCounter(el: HTMLElement, target: number): void {
    const duration = 1800;
    const startTime = performance.now();
    const step = (currentTime: number) => {
      const elapsed  = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      el.textContent = Math.floor(eased * target).toLocaleString('fr-FR');
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString('fr-FR');
    };
    requestAnimationFrame(step);
  }
}