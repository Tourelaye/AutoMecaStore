import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Rail horizontal (carrousel) pour les cartes produits de l'accueil.
 * Les cartes sont projetées via <ng-content> et défilent avec snap ;
 * les flèches apparaissent uniquement quand le contenu déborde.
 *
 * Améliorations :
 *  - Autoplay (défilement automatique)
 *  - Pause au survol / reprise à la sortie
 *  - Drag & swipe tactile (mouse + touch via pointer events)
 *  - Effet scale sur la carte centrée
 */
@Component({
  selector: 'app-home-rail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-rail.component.html',
  styleUrls: ['./home-rail.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class HomeRailComponent implements AfterViewInit, OnDestroy {

  @Input() ariaLabel = 'Liste de produits';
  @Input() autoplay = true;
  @Input() autoplayInterval = 3500;
  @Input() autoplayStep = 0.85;

  @ViewChild('track', { static: true }) track!: ElementRef<HTMLElement>;

  canPrev = false;
  canNext = false;
  isPaused = false;

  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  private autoplayTimer?: ReturnType<typeof setInterval>;

  // --- Drag / swipe ---
  private isDragging = false;
  private dragStartX = 0;
  private dragStartScroll = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    const el = this.track.nativeElement;
    Promise.resolve().then(() => {
      this.refresh();
      if (this.autoplay) this.startAutoplay();
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.refresh());
      this.resizeObserver.observe(el);
    }
    if (typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver(() => this.refresh());
      this.mutationObserver.observe(el, { childList: true });
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.stopAutoplay();
  }

  // ── Autoplay ──────────────────────────────────────────────

  private startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => {
      if (this.isPaused || this.isDragging) return;
      const el = this.track.nativeElement;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 4) return;

      if (el.scrollLeft >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        const step = Math.max(el.clientWidth * this.autoplayStep, 240);
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, this.autoplayInterval);
  }

  private stopAutoplay(): void {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = undefined;
    }
  }

  onMouseEnter(): void {
    this.isPaused = true;
  }

  onMouseLeave(): void {
    this.isPaused = false;
  }

  // ── Scroll & arrows ────────────────────────────────────────

  onScroll(): void {
    this.updateArrows();
  }

  scroll(direction: -1 | 1): void {
    const el = this.track.nativeElement;
    const step = Math.max(el.clientWidth * this.autoplayStep, 240);
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  private refresh(): void {
    if (this.updateArrows()) {
      this.cdr.detectChanges();
    }
  }

  private updateArrows(): boolean {
    const el = this.track.nativeElement;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const prev = el.scrollLeft > 4;
    const next = maxScroll > 4 && el.scrollLeft < maxScroll - 4;
    const changed = prev !== this.canPrev || next !== this.canNext;
    this.canPrev = prev;
    this.canNext = next;
    return changed;
  }

  // ── Drag / swipe (pointer events : mouse + touch) ──────────

  onPointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('button, a, [routerLink]')) return;

    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartScroll = this.track.nativeElement.scrollLeft;
    this.track.nativeElement.setPointerCapture?.(event.pointerId);
    this.track.nativeElement.style.cursor = 'grabbing';
    this.track.nativeElement.style.scrollSnapType = 'none';
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;
    const delta = event.clientX - this.dragStartX;
    this.track.nativeElement.scrollLeft = this.dragStartScroll - delta;
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.track.nativeElement.releasePointerCapture?.(event.pointerId);
    this.track.nativeElement.style.cursor = '';
    this.track.nativeElement.style.scrollSnapType = '';

    // Snap vers la carte la plus proche
    const el = this.track.nativeElement;
    const cards = Array.from(el.children) as HTMLElement[];
    if (cards.length === 0) return;

    const cardWidth = cards[0].offsetWidth + 22;
    const nearestIndex = Math.round(el.scrollLeft / cardWidth);
    el.scrollTo({ left: nearestIndex * cardWidth, behavior: 'smooth' });
  }
}
