import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductBadge, ProductBadgeService, BadgeableProduct, BadgeableOffer } from '../../../core/services/product-badge.service';

@Component({
  selector: 'app-product-badges',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- OVERLAY BADGES (absolute, sur l'image) -->
    <div class="badge-overlay" *ngIf="showOverlay && hasOverlayBadges">
      <div class="badge-group badge-top-left" *ngIf="topLeft.length > 0">
        <span
          *ngFor="let b of topLeft"
          class="product-badge"
          [style.background]="b.color"
        >
          <i class="bi {{ b.icon }}"></i>
          {{ b.label }}
        </span>
      </div>

      <div class="badge-group badge-top-right" *ngIf="topRight.length > 0">
        <span
          *ngFor="let b of topRight"
          class="product-badge"
          [style.background]="b.color"
        >
          <i class="bi {{ b.icon }}"></i>
          {{ b.label }}
        </span>
      </div>
    </div>

    <!-- INFO BADGES (inline, sous l'image dans le contenu) -->
    <div class="badge-info-row" *ngIf="showInfo && hasInfoBadges">
      <span
        *ngFor="let b of infoBadges"
        class="product-badge badge-info"
        [style.color]="b.color"
      >
        <i class="bi {{ b.icon }}"></i>
        {{ b.label }}
      </span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    :host[placement="overlay"] {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 5;
    }

    /* === OVERLAY (absolute sur l'image) === */
    .badge-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 5;
    }
    .badge-group {
      display: flex;
      gap: 4px;
    }
    .badge-top-left {
      position: absolute;
      top: 8px;
      left: 8px;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .badge-top-right {
      position: absolute;
      top: 8px;
      right: 8px;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    /* === INFO ROW (inline dans le contenu) === */
    .badge-info-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    /* === BADGE STYLE === */
    .product-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      color: white;
      line-height: 1.4;
      white-space: nowrap;
      animation: badge-fade-in 0.3s ease;
      pointer-events: auto;
    }
    .product-badge i {
      font-size: 11px;
    }

    /* Info badges: discret, outline style */
    .product-badge.badge-info {
      background: transparent;
      border: 1px solid;
      padding: 1px 7px;
      font-size: 9px;
      font-weight: 600;
    }

    @keyframes badge-fade-in {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }

    @media (max-width: 480px) {
      .product-badge {
        font-size: 9px;
        padding: 2px 6px;
      }
      .product-badge i {
        font-size: 10px;
      }
      .product-badge.badge-info {
        font-size: 8px;
        padding: 1px 5px;
      }
    }
  `]
})
export class ProductBadgesComponent implements OnInit {
  @Input() product!: BadgeableProduct;
  @Input() offer?: BadgeableOffer;
  @Input() allOffers?: BadgeableOffer[];
  @Input() maxBadges: number = 3;
  @Input() mode: 'product' | 'offer' = 'product';
  @Input() placement: 'overlay' | 'info' | 'all' = 'all';

  topLeft: ProductBadge[] = [];
  topRight: ProductBadge[] = [];
  infoBadges: ProductBadge[] = [];
  hasOverlayBadges = false;
  hasInfoBadges = false;
  showOverlay = false;
  showInfo = false;

  constructor(private badgeService: ProductBadgeService) {}

  ngOnInit() {
    this.showOverlay = this.placement === 'overlay' || this.placement === 'all';
    this.showInfo = this.placement === 'info' || this.placement === 'all';

    let badges: ProductBadge[] = [];

    if (this.mode === 'offer' && this.offer) {
      badges = this.badgeService.getOfferBadges(this.offer, this.allOffers, 5);
    } else if (this.product) {
      badges = this.badgeService.getProductBadges(this.product, this.maxBadges);
    }

    const positioned = this.badgeService.getBadgesByPosition(badges);
    this.topLeft = positioned.topLeft;
    this.topRight = positioned.topRight;
    this.infoBadges = [...positioned.bottomLeft, ...positioned.bottomRight];
    this.hasOverlayBadges = this.topLeft.length > 0 || this.topRight.length > 0;
    this.hasInfoBadges = this.infoBadges.length > 0;
  }
}
