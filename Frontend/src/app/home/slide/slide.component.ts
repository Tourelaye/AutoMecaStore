// slide.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef
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
  tag: string;         // tag coloré en haut
  stat: { value: string; label: string }; // stat chiffre mis en avant
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
      tag: '🔥 OFFRE DU JOUR',
      string: 'Toutes vos pièces auto & mécaniques en un seul endroit',
      subtitle: 'AutoMecaStore vous propose des pièces fiables pour automobile, moto, poids lourds et vélo.',
      features: [
        'Produits de qualité certifiée',
        'Prix compétitifs garantis',
        'Livraison rapide à Dakar'
      ],
      gradient: 'linear-gradient(135deg, #FF6B00 0%, #c0392b 50%, #FF8C00 100%)',
      accentColor: '#FF6B00',
      urgencyText: '⚡ Stock limité — Commandez maintenant',
      bgImage: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200&q=80',
      stat: { value: '10 000+', label: 'pièces disponibles' }
    },
    {
      id: 2,
      badge: 'Pièces certifiées d\'origine',
      badgeType: 'info',
      tag: '✅ CERTIFIÉ ORIGINE',
      string: 'Pièces d\'origine certifiées pour tous vos véhicules',
      subtitle: 'Découvrez notre sélection de pièces authentiques avec garantie constructeur de 2 ans.',
      features: [
        'Produits 100% authentiques',
        'Garantie 2 ans incluse',
        'Support technique gratuit'
      ],
      gradient: 'linear-gradient(135deg, #1a6fd4 0%, #0a4fa0 50%, #2196F3 100%)',
      accentColor: '#1a6fd4',
      urgencyText: '🚚 Livraison gratuite dès 50 000 FCFA',
      bgImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80',
      stat: { value: '2 ans', label: 'de garantie' }
    },
    {
      id: 3,
      badge: 'Livraison Express 24h',
      badgeType: 'urgent',
      tag: '🚀 LIVRAISON EXPRESS',
      string: 'Livraison express à Dakar et dans toutes les régions',
      subtitle: 'Commandez aujourd\'hui et recevez vos pièces demain. Service logistique fiable et sécurisé.',
      features: [
        'Livraison 24-48h garantie',
        'Suivi en temps réel',
        'Paiement à la livraison'
      ],
      gradient: 'linear-gradient(135deg, #00897B 0%, #004D40 50%, #26A69A 100%)',
      accentColor: '#00897B',
      urgencyText: '📦 Plus de 500 références disponibles',
      bgImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
      stat: { value: '24h', label: 'délai de livraison' }
    }
  ];

  currentIndex = signal<number>(0);
  isAnimating = signal<boolean>(false);
  isPlaying = signal<boolean>(true);
  direction = signal<'next' | 'prev'>('next');

  currentSlide = computed(() => this.slides[this.currentIndex()]);

  private autoplayInterval: ReturnType<typeof setInterval> | null = null;
  private touchStartX = 0;
  private readonly AUTOPLAY_DELAY = 5500;
  private readonly TRANSITION_DURATION = 700;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  // -------------------------------------------------------
  // Navigation clavier
  // -------------------------------------------------------
  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft')  this.prevSlide();
    if (e.key === 'ArrowRight') this.nextSlide();
  }

  // -------------------------------------------------------
  // Touch / swipe
  // -------------------------------------------------------
  onTouchStart(e: TouchEvent): void {
    this.touchStartX = e.touches[0].clientX;
  }

  onTouchEnd(e: TouchEvent): void {
    const diff = this.touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? this.nextSlide() : this.prevSlide();
    }
  }

  // -------------------------------------------------------
  // Slides
  // -------------------------------------------------------
  goToSlide(index: number): void {
    if (this.isAnimating() || index === this.currentIndex()) return;
    this.direction.set(index > this.currentIndex() ? 'next' : 'prev');
    this.isAnimating.set(true);
    this.currentIndex.set(index);
    setTimeout(() => this.isAnimating.set(false), this.TRANSITION_DURATION + 100);
  }

  nextSlide(): void {
    this.direction.set('next');
    const next = (this.currentIndex() + 1) % this.slides.length;
    this.goToSlide(next);
    this.resetAutoplay();
  }

  prevSlide(): void {
    this.direction.set('prev');
    const prev = (this.currentIndex() - 1 + this.slides.length) % this.slides.length;
    this.goToSlide(prev);
    this.resetAutoplay();
  }

  startAutoplay(): void {
    this.stopAutoplay();
    this.isPlaying.set(true);
    this.autoplayInterval = setInterval(() => this.nextSlide(), this.AUTOPLAY_DELAY);
  }

  stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
    this.isPlaying.set(false);
  }

  private resetAutoplay(): void {
    if (this.isPlaying()) this.startAutoplay();
  }

  getSlideNumber(): string {
    return String(this.currentIndex() + 1).padStart(2, '0');
  }

  getTotalSlides(): string {
    return String(this.slides.length).padStart(2, '0');
  }
}