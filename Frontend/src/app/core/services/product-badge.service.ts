import { Injectable } from '@angular/core';

export interface ProductBadge {
  type: string;
  label: string;
  icon: string;
  priority: number;
  color: string;
  position?: string;
}

export interface BadgeableProduct {
  id: number;
  nom: string;
  prix?: number;
  prix_promo?: number | null;
  est_en_promo?: boolean;
  pourcentage_reduction?: number | null;
  stock: number;
  seuil_alerte?: number | null;
  date_ajout?: string;
  nombre_ventes?: number;
  vente_eclair?: boolean;
  est_recommande?: boolean;
  est_bestseller?: boolean;
  statut_approbation?: string;
  livraison_disponible?: boolean;
  retrait_magasin?: boolean;
  badges?: ProductBadge[];
  is_new?: boolean;
  discount?: number | null;
}

export interface BadgeableOffer {
  prix: number;
  stock: number;
  livraison_disponible?: boolean;
  retrait_magasin?: boolean;
  offer_badges?: ProductBadge[];
  badges?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductBadgeService {

  /**
   * Récupère les badges depuis l'API (champ `badges` calculé côté backend).
   * Si l'API ne fournit pas de badges, les calcule côté frontend.
   */
  getProductBadges(product: BadgeableProduct, maxBadges: number = 3): ProductBadge[] {
    let badges: ProductBadge[] = [];

    if (product.badges && product.badges.length > 0) {
      badges = [...product.badges];
    } else {
      badges = this.computeProductBadges(product);
    }

    // Split overlay (top_left/top_right) vs info (bottom_*) badges
    const overlayBadges = badges.filter(b => b.position === 'top_left' || b.position === 'top_right');
    const infoBadges = badges.filter(b => b.position === 'bottom_left' || b.position === 'bottom_right');

    // Sort each by priority
    overlayBadges.sort((a, b) => a.priority - b.priority);
    infoBadges.sort((a, b) => a.priority - b.priority);

    // Limit overlay to max 2, info to max 3
    const maxOverlay = Math.min(2, maxBadges);
    const maxInfo = Math.min(3, Math.max(0, maxBadges - maxOverlay));

    return [...overlayBadges.slice(0, maxOverlay), ...infoBadges.slice(0, maxInfo)];
  }

  /**
   * Récupère les badges d'une offre spécifique (magasin).
   */
  getOfferBadges(offer: BadgeableOffer, allOffers?: BadgeableOffer[], maxBadges: number = 4): ProductBadge[] {
    let badges: ProductBadge[] = [];

    if (offer.offer_badges && offer.offer_badges.length > 0) {
      badges = [...offer.offer_badges];
    } else {
      badges = this.computeOfferBadges(offer, allOffers);
    }

    badges.sort((a, b) => a.priority - b.priority);
    return badges.slice(0, maxBadges);
  }

  /**
   * Calcule les badges d'un produit côté frontend (fallback si l'API ne fournit pas le champ `badges`).
   */
  private computeProductBadges(product: BadgeableProduct): ProductBadge[] {
    const badges: ProductBadge[] = [];
    const stock = product.stock || 0;
    const seuil = product.seuil_alerte ?? 5;

    // 1. RUPTURE
    if (stock === 0) {
      badges.push({ type: 'out_of_stock', label: 'Rupture', icon: 'bi-x-circle-fill', priority: 1, color: '#dc2626', position: 'top_right' });
    }

    // 2. PROMO
    if (product.est_en_promo && product.prix_promo && product.prix && product.prix_promo < product.prix) {
      let pct = product.pourcentage_reduction ?? 0;
      if (!pct) {
        pct = Math.round((1 - product.prix_promo / product.prix) * 100);
      }
      badges.push({ type: 'promo', label: `-${pct}%`, icon: 'bi-fire', priority: 2, color: '#ff5a00', position: 'top_left' });
    }

    // 3. NOUVEAU — 72 heures
    if (product.date_ajout) {
      const added = new Date(product.date_ajout);
      const now = new Date();
      const diffHours = (now.getTime() - added.getTime()) / (1000 * 60 * 60);
      if (diffHours <= 72) {
        badges.push({ type: 'new', label: 'Nouveau', icon: 'bi-stars', priority: 3, color: '#1d4ed8', position: 'top_left' });
      }
    }

    // 4. DERNIÈRES PIÈCES / STOCK LIMITÉ
    if (stock > 0 && stock <= 5) {
      badges.push({ type: 'last_items', label: `Plus que ${stock}`, icon: 'bi-fire', priority: 4, color: '#f59e0b', position: 'top_right' });
    } else if (stock > 0 && stock <= seuil) {
      badges.push({ type: 'low_stock', label: 'Stock limité', icon: 'bi-exclamation-triangle-fill', priority: 4, color: '#f59e0b', position: 'top_right' });
    }

    // 5. OFFRE SPÉCIALE / VENTE ÉCLAIR
    if (product.vente_eclair) {
      badges.push({ type: 'special_offer', label: 'Offre spéciale', icon: 'bi-lightning-charge-fill', priority: 5, color: '#f59e0b', position: 'top_left' });
    }

    // 6. PLUS VENDU
    const ventes = product.nombre_ventes ?? 0;
    if (ventes >= 10) {
      badges.push({ type: 'best_seller', label: 'Plus vendu', icon: 'bi-trophy-fill', priority: 6, color: '#7c3aed', position: 'bottom_left' });
    }

    // 7. RECOMMANDÉ
    if (product.est_recommande) {
      badges.push({ type: 'recommended', label: 'Recommandé', icon: 'bi-hand-thumbs-up-fill', priority: 6, color: '#059669', position: 'bottom_left' });
    }

    // 8. LIVRAISON
    if (product.livraison_disponible) {
      badges.push({ type: 'delivery', label: 'Livraison', icon: 'bi-truck', priority: 7, color: '#059669', position: 'bottom_right' });
    }

    // 9. RETRAIT
    if (product.retrait_magasin) {
      badges.push({ type: 'pickup', label: 'Retrait', icon: 'bi-shop', priority: 7, color: '#1d4ed8', position: 'bottom_right' });
    }

    // 10. VÉRIFIÉ
    if (product.statut_approbation === 'approuve') {
      badges.push({ type: 'verified', label: 'Vérifié', icon: 'bi-patch-check-fill', priority: 8, color: '#059669', position: 'bottom_right' });
    }

    return badges;
  }

  /**
   * Calcule les badges d'une offre côté frontend (fallback).
   */
  private computeOfferBadges(offer: BadgeableOffer, allOffers?: BadgeableOffer[]): ProductBadge[] {
    const badges: ProductBadge[] = [];
    const stock = offer.stock || 0;

    // 1. RUPTURE
    if (stock === 0) {
      badges.push({ type: 'out_of_stock', label: 'Rupture', icon: 'bi-x-circle-fill', priority: 1, color: '#dc2626' });
    }

    // 2. DERNIÈRES PIÈCES / STOCK LIMITÉ
    if (stock > 0 && stock <= 5) {
      badges.push({ type: 'last_items', label: `Plus que ${stock}`, icon: 'bi-fire', priority: 4, color: '#f59e0b' });
    } else if (stock > 0 && stock <= 10) {
      badges.push({ type: 'low_stock', label: 'Stock limité', icon: 'bi-exclamation-triangle-fill', priority: 4, color: '#f59e0b' });
    }

    // 3. MEILLEUR PRIX
    if (allOffers && allOffers.length > 1) {
      const minPrice = Math.min(...allOffers.map(o => o.prix));
      if (offer.prix === minPrice) {
        badges.push({ type: 'best_price', label: 'Meilleur prix', icon: 'bi-cash-coin', priority: 5, color: '#059669' });
      }
    }

    // 4. LIVRAISON
    if (offer.livraison_disponible) {
      badges.push({ type: 'delivery', label: 'Livraison', icon: 'bi-truck', priority: 7, color: '#059669' });
    }

    // 5. RETRAIT
    if (offer.retrait_magasin) {
      badges.push({ type: 'pickup', label: 'Retrait', icon: 'bi-shop', priority: 7, color: '#1d4ed8' });
    }

    return badges;
  }

  /**
   * Sépare les badges par position pour l'affichage sur la carte produit.
   */
  getBadgesByPosition(badges: ProductBadge[]): { topLeft: ProductBadge[]; topRight: ProductBadge[]; bottomLeft: ProductBadge[]; bottomRight: ProductBadge[] } {
    return {
      topLeft: badges.filter(b => b.position === 'top_left'),
      topRight: badges.filter(b => b.position === 'top_right'),
      bottomLeft: badges.filter(b => b.position === 'bottom_left'),
      bottomRight: badges.filter(b => b.position === 'bottom_right'),
    };
  }
}
