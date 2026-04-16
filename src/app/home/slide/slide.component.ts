// slide.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface Slide {
  id: number;
  badge: string;
  badgeType: 'promo' | 'info' | 'urgent';
  string: string;
  subtitle: string;
  features: string[];
  gradient: string;
  accentColor: string;
  urgencyText: string;
  bgImage: string;
}

@Component({
  selector: 'app-slide',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './slide.component.html',
  styleUrls: ['./slide.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlideComponent implements OnInit, OnDestroy {

  slides: Slide[] = [
    {
      id: 1,
      badge: 'Promo -20% aujourd\'hui',
      badgeType: 'promo',
      string:'Toutes vos pieces automobiles et mecaniques en un seul endroit',
      subtitle: 'AutoMecaStore vous propose des pieces fiables pour automobile, moto, poids lourds et velo.',
      features: ['Produits de qualite', 'Prix competitifs', 'Livraison rapide a Dakar'],
      gradient: 'linear-gradient(135deg, #FF6B00 0%, #FF4500 50%, #FF8C00 100%)',
      accentColor: '#FF6B00',
      urgencyText: 'Stock limite - Commandez maintenant',
      bgImage: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200&q=80'
    },
    {
      id: 2,
      badge: 'Pieces certifiees d\'origine',
      badgeType: 'info',
      string: 'Pièces d\'origine certifiées pour tous vos véhicules',  
      subtitle: 'Decouvrez notre selection de pieces authentiques avec garantie de 2 ans.',
      features: ['Produits authentiques', 'Garantie certifiee', 'Support technique gratuit'],
      gradient: 'linear-gradient(135deg, #1a6fd4 0%, #0a4fa0 50%, #2196F3 100%)',
      accentColor: '#1a6fd4',
      urgencyText: 'Livraison gratuite des 50 000 FCFA',
      bgImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80'
    },
    {
      id: 3,
      badge: 'Livraison Express 24h',
      badgeType: 'urgent',
      string:'Livraison express a Dakar et regions',
      subtitle: 'Commandez aujourd\'hui et recevez vos pieces demain. Service logistique fiable et securise.',
      features: ['Livraison 24-48h', 'Suivi en temps reel', 'Paiement a la livraison'],
      gradient: 'linear-gradient(135deg, #00897B 0%, #00695C 50%, #26A69A 100%)',
      accentColor: '#00897B',
      urgencyText: 'Plus de 500 references disponibles',
      bgImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80'
    }
  ];

  currentIndex = signal<number>(0);
  isAnimating = signal<boolean>(false);
  isPlaying = signal<boolean>(true);

  currentSlide = computed(() => this.slides[this.currentIndex()]);

  private autoplayInterval: ReturnType<typeof setInterval> | null = null;
  private readonly AUTOPLAY_DELAY = 5000;
  private readonly TRANSITION_DURATION = 700;

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  goToSlide(index: number): void {
    if (this.isAnimating() || index === this.currentIndex()) return;
    this.isAnimating.set(true);
    this.currentIndex.set(index);
    setTimeout(() => this.isAnimating.set(false), this.TRANSITION_DURATION + 100);
  }

  nextSlide(): void {
    const next = (this.currentIndex() + 1) % this.slides.length;
    this.goToSlide(next);
    this.resetAutoplay();
  }

  prevSlide(): void {
    const prev = (this.currentIndex() - 1 + this.slides.length) % this.slides.length;
    this.goToSlide(prev);
    this.resetAutoplay();
  }

  startAutoplay(): void {
    this.stopAutoplay();
    this.isPlaying.set(true);
    this.autoplayInterval = setInterval(() => {
      this.nextSlide();
    }, this.AUTOPLAY_DELAY);
  }

  stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
    this.isPlaying.set(false);
  }

  toggleAutoplay(): void {
    this.isPlaying() ? this.stopAutoplay() : this.startAutoplay();
  }

  private resetAutoplay(): void {
    if (this.isPlaying()) {
      this.startAutoplay();
    }
  }
}
