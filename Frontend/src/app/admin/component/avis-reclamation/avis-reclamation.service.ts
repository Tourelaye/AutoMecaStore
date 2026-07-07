import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
// import { Avis, AvisPayload } from './avis-reclamation.model';
import {Avis, AvisPayload} from './avis-reclamation.model';
// ⚠️ Adapte cette URL à celle de ton API Django REST Framework
const API_URL = '/api/avis-reclamations/';

@Injectable({ providedIn: 'root' })
export class AvisReclamationService {

  constructor(private http: HttpClient) {}

  getAll(): Observable<Avis[]> {
    return this.http.get<Avis[]>(API_URL).pipe(
      catchError(() => of(this.getMockData()))
    );
  }

  create(payload: AvisPayload): Observable<Avis> {
    return this.http.post<Avis>(API_URL, payload);
  }

  update(id: number, payload: Partial<AvisPayload>): Observable<Avis> {
    return this.http.patch<Avis>(`${API_URL}${id}/`, payload);
  }

  updateStatut(id: number, statut: string): Observable<Avis> {
    return this.http.patch<Avis>(`${API_URL}${id}/`, { statut });
  }

  repondre(id: number, reponse: string): Observable<Avis> {
    return this.http.patch<Avis>(`${API_URL}${id}/`, {
      reponse,
      statut: 'traite'
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}${id}/`);
  }

  // Données de démonstration utilisées tant que l'API n'est pas branchée
  private getMockData(): Avis[] {
    return [
      { id: 1, client: 'Jean Dupont', produit: 'Kit Freinage', note: 5, commentaire: 'Excellent produit, livraison rapide', date: '2024-01-20', type: 'avis', statut: 'traite' },
      { id: 2, client: 'Marie Martin', produit: 'Filtre à huile', note: 3, commentaire: 'Produit correct mais emballage abîmé', date: '2024-01-19', type: 'reclamation', statut: 'en_cours' },
      { id: 3, client: 'Pierre Bernard', produit: 'Bougies', note: 1, commentaire: 'Produit défectueux, remboursement souhaité', date: '2024-01-18', type: 'reclamation', statut: 'nouveau' },
      { id: 4, client: 'Sophie Leclerc', produit: 'Plaquettes de frein', note: 4, commentaire: 'Bon rapport qualité prix', date: '2024-01-22', type: 'avis', statut: 'nouveau' },
    ];
  }
}