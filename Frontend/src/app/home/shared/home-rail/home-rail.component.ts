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

  @ViewChild('track', { static: true }) track!: ElementRef<HTMLElement>;

  canPrev = false;
  canNext = false;

  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    const el = this.track.nativeElement;
    // Les dimensions ne sont fiables qu'après le premier rendu des cartes projetées
    Promise.resolve().then(() => this.refresh());

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
  }

  onScroll(): void {
    this.updateArrows();
  }

  scroll(direction: -1 | 1): void {
    const el = this.track.nativeElement;
    const step = Math.max(el.clientWidth * 0.85, 240);
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  private refresh(): void {
    if (this.updateArrows()) {
      this.cdr.detectChanges();
    }
  }

  /** Retourne true si l'état des flèches a changé. */
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
}
