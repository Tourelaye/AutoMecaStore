import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TypePromotion =
  | 'pourcentage'
  | 'montant_fixe'
  | 'vente_flash'
  | 'offre_speciale'
  | 'produit_vedette'
  | 'nouveau_produit'
  | 'dernieres_pieces';

export interface Promotion {
  id?: number;
  fournisseur?: number;
  fournisseur_nom?: string;
  produit: number;
  produit_nom?: string;
  prix_original?: number;
  prix_promo?: number;

  nom?: string;
  description?: string;
  type_promotion: TypePromotion;
  type_promotion_label?: string;
  pourcentage?: number;
  valeur_reduction?: number;

  date_debut: string;
  heure_debut?: string;
  date_fin: string;
  heure_fin?: string;

  quantite_min?: number;
  nombre_max_utilisations?: number;
  nb_utilisations?: number;

  is_active?: boolean;
  statut?: string;
  statut_label?: string;
  created_at?: string;
}

export interface PromotionPayload {
  produit: number;
  nom?: string;
  description?: string;
  type_promotion: TypePromotion;
  pourcentage?: number;
  valeur_reduction?: number;
  date_debut: string;
  date_fin: string;
  quantite_min?: number;
  nombre_max_utilisations?: number;
  is_active?: boolean;
}

export interface PromotionStats {
  total: number;
  actives: number;
  a_venir: number;
  terminees: number;
  suspendues: number;
  produits_en_promotion: number;
  ventes_generees: number;
  revenus_generees: number;
  meilleure_promotion?: Promotion;
}

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private apiUrl = 'http://127.0.0.1:8000/api/fournisseur/promotions';

  constructor(private http: HttpClient) {}

  getPromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiUrl}/`);
  }

  getPromotion(id: number): Observable<Promotion> {
    return this.http.get<Promotion>(`${this.apiUrl}/${id}/`);
  }

  createPromotion(data: PromotionPayload): Observable<Promotion> {
    return this.http.post<Promotion>(`${this.apiUrl}/`, data);
  }

  updatePromotion(id: number, data: PromotionPayload): Observable<Promotion> {
    return this.http.patch<Promotion>(`${this.apiUrl}/${id}/`, data);
  }

  deletePromotion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/`);
  }

  getStats(): Observable<PromotionStats> {
    return this.http.get<PromotionStats>(`${this.apiUrl}/stats/`);
  }

  duplicatePromotion(id: number): Observable<Promotion> {
    return this.http.post<Promotion>(`${this.apiUrl}/${id}/duplicate/`, {});
  }

  togglePromotion(id: number, action: 'suspendre' | 'reactiver'): Observable<Promotion> {
    return this.http.patch<Promotion>(`${this.apiUrl}/${id}/toggle/`, { action });
  }
}