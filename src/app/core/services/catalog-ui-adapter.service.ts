import { Injectable } from '@angular/core';
import { DjangoProduitDto } from '../../models/api/django-catalog.model';
import { UiCatalogProduct, UiOffreProduct, UiPromoProduct } from '../../models/view/catalog-ui.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogUiAdapterService {
  private readonly apiBase = 'http://localhost:8000';

  toCatalogProduct(p: DjangoProduitDto): UiCatalogProduct {
    const prixNouveau = this.asNumber(p.prix_promo ?? p.prix);
    const prixAncien = p.prix_promo ? this.asNumber(p.prix) : null;
    const discount =
      prixAncien && prixAncien > 0
        ? Math.round((1 - prixNouveau / prixAncien) * 100)
        : null;

    return new UiCatalogProduct(
      p.id,
      p.nom,
      p.marque ?? 'AutoMecaStore',
      p.description ?? '',
      this.resolveImageUrl(p.image),
      prixNouveau,
      prixAncien,
      discount,
      4.5,
      0,
      p.stock ?? 0,
      true,
      false,
      false,
      this.resolveCategorieName(p)
    );
  }

  toOffreProduct(p: DjangoProduitDto): UiOffreProduct {
    const base = this.toCatalogProduct(p);
    return new UiOffreProduct(
      base.id,
      base.nom,
      base.marque,
      base.image,
      base.prixNouveau,
      base.prixAncien,
      base.discount,
      base.note,
      Math.max(base.avis, 50),
      base.livraison,
      base.stock,
      base.discount ? { label: '🔥 Promo', type: 'orange' } : null
    );
  }

  toPromoProduct(p: DjangoProduitDto, index: number): UiPromoProduct {
    const prix = this.asNumber(p.prix);
    const prixPromo = this.asNumber(p.prix_promo ?? p.prix);
    const discount =
      prix > 0 ? Math.max(0, Math.round((1 - prixPromo / prix) * 100)) : 0;

    const expiration = p.date_fin_promo
      ? new Date(p.date_fin_promo)
      : this.addHours(2 + index, 0);

    return new UiPromoProduct(
      p.id,
      p.nom,
      this.resolveImageUrl(p.image),
      prix,
      prixPromo,
      discount,
      p.stock ?? 0,
      Math.max(0, Math.floor((p.stock ?? 0) * 0.4)),
      expiration,
      this.resolveCategorieName(p)
    );
  }

  private resolveCategorieName(p: DjangoProduitDto): string {
    if (!p.categorie) return 'Pièce';
    if (typeof p.categorie === 'number') return 'Pièce';
    return p.categorie.nom ?? 'Pièce';
  }

  private resolveImageUrl(value?: string | null): string | null {
    if (!value) return null;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/')) return `${this.apiBase}${value}`;
    return `${this.apiBase}/${value}`;
  }

  private asNumber(value: number | string | null | undefined): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    return Number(value);
  }

  private addHours(hours: number, minutes: number = 0): Date {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  }
}

