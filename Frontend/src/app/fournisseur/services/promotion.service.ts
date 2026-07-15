import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

export interface Promotion {
  id: number;
  produit: number;
  produit_nom: string;
  fournisseur: number;
  fournisseur_nom: string;
  pourcentage: number;
  date_debut: string;
  date_fin: string;
  statut: string;
  created_at: string;
}

export interface PromotionPayload {
  produit: number;
  pourcentage: number;
  date_debut: string;
  date_fin: string;
  statut?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private apiUrl = 'http://127.0.0.1:8000/api/fournisseur/promotions';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getPromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiUrl}/`);
  }

  createPromotion(data: PromotionPayload): Observable<Promotion> {
    return this.http.post<Promotion>(`${this.apiUrl}/`, data);
  }

  deletePromotion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/`);
  }
}