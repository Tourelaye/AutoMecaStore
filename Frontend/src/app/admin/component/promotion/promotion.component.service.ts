import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { Promotion, PromotionPayload } from './promotion.component.model';

// ⚠️ Adapte cette URL à celle de ton API Django REST Framework
const API_URL = '/api/promotions/';

@Injectable({ providedIn: 'root' })
export class PromotionService {

  constructor(private http: HttpClient) {}

  getAll(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(API_URL).pipe(
      catchError(() => of(this.getMockData()))
    );
  }

  create(payload: PromotionPayload): Observable<Promotion> {
    return this.http.post<Promotion>(API_URL, payload);
  }

  update(id: number, payload: Partial<PromotionPayload>): Observable<Promotion> {
    return this.http.patch<Promotion>(`${API_URL}${id}/`, payload);
  }

  updateStatut(id: number, statut: string): Observable<Promotion> {
    return this.http.patch<Promotion>(`${API_URL}${id}/`, { statut });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}${id}/`);
  }

  // Données de démonstration utilisées tant que l'API n'est pas branchée
  private getMockData(): Promotion[] {
    return [
      { id: 1, nom: 'Soldes d\'hiver', code: 'HIVER24', reduction: 20, type: 'pourcentage', dateDebut: '2026-01-01', dateFin: '2026-07-31', utilisations: 45, limiteUtilisation: 100, statut: 'active' },
      { id: 2, nom: 'Nouveau client', code: 'BIENVENUE', reduction: 10, type: 'pourcentage', dateDebut: '2026-01-01', dateFin: '2026-12-31', utilisations: 23, statut: 'active' },
      { id: 3, nom: 'Black Friday', code: 'BLACK24', reduction: 30, type: 'pourcentage', dateDebut: '2025-11-24', dateFin: '2025-11-27', utilisations: 156, statut: 'expiree' },
      { id: 4, nom: 'Livraison offerte', code: 'LIVRAISON10', reduction: 10, type: 'montant', dateDebut: '2026-06-01', dateFin: '2026-07-10', utilisations: 8, limiteUtilisation: 50, statut: 'active' },
      { id: 5, nom: 'Ancienne offre', code: 'PROMO23', reduction: 15, type: 'pourcentage', dateDebut: '2025-05-01', dateFin: '2025-06-01', utilisations: 12, statut: 'desactivee' },
    ];
  }
}