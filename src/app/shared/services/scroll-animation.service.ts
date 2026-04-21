import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScrollAnimationService {
  
  /**
   * Crée un IntersectionObserver avec des options personnalisées
   */
  createIntersectionObserver(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver {
    const defaultOptions: IntersectionObserverInit = {
      threshold: 0.15,
      rootMargin: '0px 0px -8% 0px',
      ...options
    };

    return new IntersectionObserver(callback, defaultOptions);
  }

  /**
   * Génère un délai d'animation basé sur l'index pour l'effet stagger
   */
  getStaggerDelay(index: number, baseDelay: number = 150): number {
    return index * baseDelay;
  }

  /**
   * Ajoute les classes CSS d'animation à un élément
   */
  addAnimationClasses(
    element: HTMLElement, 
    animationType: 'fade-up' | 'fade-left' | 'fade-right' | 'scale-up' = 'fade-up',
    isStagger: boolean = false
  ): void {
    element.classList.add('scroll-reveal');
    
    if (isStagger) {
      element.classList.add('stagger-item');
    }

    switch (animationType) {
      case 'fade-left':
        element.classList.add('slide-left');
        break;
      case 'fade-right':
        element.classList.add('slide-right');
        break;
      case 'scale-up':
        element.classList.add('scale-up');
        break;
    }
  }

  /**
   * Configure l'animation sur un groupe d'éléments
   */
  setupStaggeredAnimation(
    elements: HTMLElement[],
    animationType: 'fade-up' | 'fade-left' | 'fade-right' | 'scale-up' = 'fade-up',
    baseDelay: number = 150
  ): void {
    elements.forEach((element, index) => {
      this.addAnimationClasses(element, animationType, true);
      element.style.setProperty('--reveal-delay', `${this.getStaggerDelay(index, baseDelay)}ms`);
    });
  }

  /**
   * Vérifie si IntersectionObserver est supporté
   */
  isIntersectionObserverSupported(): boolean {
    return typeof IntersectionObserver !== 'undefined';
  }
}
