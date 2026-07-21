import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type ProduitState = 'en_ligne' | 'desactive' | 'attente_validation';

export interface ProductSections {
  bestOffer: boolean;
  flashSale: boolean;
  bestSeller: boolean;
  trending: boolean;
  lightningSale: boolean;
}

export interface Produit {
  id: number;
  ref: string;
  name: string;
  category: string;
  vendor: string;
  image: string | null;
  price: number;
  stock: number;
  sales: number;
  state: ProduitState;
  signale: boolean;
  signalReason?: string;
  sections: ProductSections;
}

const LOW_STOCK_THRESHOLD = 5;

@Injectable({ providedIn: 'root' })
export class ProduitService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/admin/produits/';
  private readonly baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  readonly lowStockThreshold = LOW_STOCK_THRESHOLD;

  private normalizeImage(image: string | null): string | null {
    if (!image) return null;
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    const separator = image.startsWith('/') ? '' : '/';
    return `${this.baseUrl}${separator}${image}`;
  }

  private defaultSections(): ProductSections {
    return { bestOffer: false, flashSale: false, bestSeller: false, trending: false, lightningSale: false };
  }

  private normalizeProduit(p: Produit): Produit {
    return { ...p, image: this.normalizeImage(p.image), sections: { ...this.defaultSections(), ...(p.sections || {}) } };
  }

  getAll(): Observable<Produit[]> {
    return this.http.get<Produit[]>(this.apiUrl).pipe(
      map(list => list.map(p => this.normalizeProduit(p)))
    );
  }

  setState(id: number, state: ProduitState): Observable<Produit> {
    const statut = state === 'en_ligne' ? 'actif' : 'inactif';
    return this.http.patch<Produit>(`${this.apiUrl}${id}/toggle-active/`, { statut }).pipe(
      map(p => this.normalizeProduit(p))
    );
  }

  setSignal(id: number, signale: boolean, reason?: string): Observable<Produit> {
    return this.http.patch<Produit>(`${this.apiUrl}${id}/signal/`, { signale, motif: reason }).pipe(
      map(p => this.normalizeProduit(p))
    );
  }

  setSections(id: number, sections: ProductSections): Observable<Produit> {
    return this.http.patch<Produit>(`${this.apiUrl}${id}/sections/`, sections).pipe(
      map(p => this.normalizeProduit(p))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}