import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type ProduitAdminStatus =
  | 'en_attente_validation'
  | 'publie'
  | 'brouillon'
  | 'a_corriger'
  | 'refuse'
  | 'masque';

export type ProductAction =
  | 'publier'
  | 'demander_correction'
  | 'masquer'
  | 'refuser'
  | 'supprimer';

export interface ProductSections {
  bestOffer: boolean;
  flashSale: boolean;
  bestSeller: boolean;
  trending: boolean;
  lightningSale: boolean;
  featured: boolean;
  recommended: boolean;
}

export interface QualityAlert {
  type: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ProduitCompatibility {
  modeles_compatibles: any[];
  annee_debut?: number | null;
  annee_fin?: number | null;
  compatibilites: any[];
}

export interface ProduitTechnical {
  etat: string;
  garantie_mois: number;
  garantie_disponible: boolean;
  pays_origine: string;
  fabricant: string;
  matiere: string;
  couleur: string;
  poids: number | null;
  longueur: number | null;
  largeur: number | null;
  hauteur: number | null;
}

export interface Produit {
  id: number;
  ref: string;
  reference_oem: string;
  name: string;
  category: string;
  category_id: number | null;
  brand: string;
  vendor: string;
  vendor_id: number | null;
  vendor_store: string;
  image: string | null;
  images: string[];
  price: number;
  stock: number;
  sales: number;
  created_at: string | null;
  updated_at: string | null;
  admin_status: ProduitAdminStatus;
  admin_status_label: string;
  admin_status_color: string;
  admin_status_icon: string;
  admin_status_description: string;
  signale: boolean;
  signalReason?: string;
  motif_rejet: string;
  statut_approbation: string;
  statut: string;
  is_active: boolean;
  sections: ProductSections;
  alerts: QualityAlert[];
  compatibility: ProduitCompatibility;
  technical: ProduitTechnical;
  description_courte: string;
  description_detaillee: string;
  precautions: string;
  mots_cles: string[];
  delai_livraison: string;
  livraison_disponible: boolean;
  retrait_magasin: boolean;
  quantite_min: number | null;
  seuil_alerte: number | null;
}

export interface ProduitFilterParams {
  q?: string;
  statut?: string;
  categorie?: string;
  marque?: string;
  fournisseur?: string;
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
    return { bestOffer: false, flashSale: false, bestSeller: false, trending: false, lightningSale: false, featured: false, recommended: false };
  }

  private normalizeProduit(p: Produit): Produit {
    const images = (p.images || []).map(img => this.normalizeImage(img)).filter(Boolean) as string[];
    const main = images[0] || null;
    return {
      ...p,
      image: main,
      images,
      sections: { ...this.defaultSections(), ...(p.sections || {}) },
      alerts: p.alerts || [],
      compatibility: p.compatibility || { modeles_compatibles: [], annee_debut: null, annee_fin: null, compatibilites: [] },
      technical: p.technical || {
        etat: '', garantie_mois: 0, garantie_disponible: false, pays_origine: '',
        fabricant: '', matiere: '', couleur: '', poids: null, longueur: null, largeur: null, hauteur: null
      }
    };
  }

  getAll(params: ProduitFilterParams = {}): Observable<Produit[]> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<Produit[]>(this.apiUrl, { params: httpParams }).pipe(
      map(list => list.map(p => this.normalizeProduit(p)))
    );
  }

  getDetail(id: number): Observable<Produit> {
    return this.http.get<Produit>(`${this.apiUrl}${id}/`).pipe(
      map(p => this.normalizeProduit(p))
    );
  }

  validate(id: number, action: ProductAction, motif?: string): Observable<Produit> {
    return this.http.post<Produit>(`${this.apiUrl}${id}/validation/`, { action, motif }).pipe(
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