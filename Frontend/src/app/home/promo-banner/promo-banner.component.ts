import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface PromoBanner {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  gradient: string;
  badge: string;
  features: string[];
}

@Component({
  selector: 'app-promo-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './promo-banner.component.html',
  styleUrls: ['./promo-banner.component.css']
})
export class PromoBannerComponent {
  banners: PromoBanner[] = [
    {
      title: 'Automobile',
      subtitle: 'Pièces auto certifiées',
      icon: 'bi-car-front-fill',
      route: '/catalog/auto',
      gradient: 'linear-gradient(135deg, #ff6b00, #c0392b)',
      badge: '🔥 Tendance',
      features: ['Freinage', 'Moteur', 'Filtration', 'Suspension']
    },
    {
      title: 'Moto',
      subtitle: 'Équipements & pièces',
      icon: 'bi-gear-fill',
      route: '/catalog/moto',
      gradient: 'linear-gradient(135deg, #1a6fd4, #0a4fa0)',
      badge: '✅ Certifié',
      features: ['Chaînes', 'Pneus', 'Freins', 'Accessoires']
    },
    {
      title: 'Poids Lourds',
      subtitle: 'Pièces industrielles',
      icon: 'bi-truck',
      route: '/catalog/poidLourds',
      gradient: 'linear-gradient(135deg, #00897b, #004d40)',
      badge: '🚚 Pro',
      features: ['Transmission', 'Hydraulique', 'Pneus', 'Cabine']
    },
    {
      title: 'Vélo',
      subtitle: 'Composants & accessoires',
      icon: 'bi-bicycle',
      route: '/catalog/velo',
      gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      badge: '🚲 Nouveau',
      features: ['Pédalier', 'Roues', 'Freins', 'Selles']
    }
  ];
}
