import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export type StatutLivraison = 'en_preparation' | 'en_cours' | 'livree' | 'annulee';

export interface Livraison {
  id: number;
  commandeId: string;
  client: string;
  adresse: string;
  statut: StatutLivraison;
  transporteur: string;
  dateCreation: string;
  dateLivraison?: string;
  tracking?: string;
}

export interface CreateLivraisonRequest {
  commandeId: string;
  client: string;
  adresse: string;
  statut: StatutLivraison;
  transporteur?: string;
  tracking?: string;
  dateLivraison?: string;
}

export interface UpdateLivraisonRequest {
  commandeId?: string;
  client?: string;
  adresse?: string;
  statut?: StatutLivraison;
  transporteur?: string;
  tracking?: string;
  dateLivraison?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LivraisonService {

  private apiUrl = 'http://localhost:8000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Récupérer toutes les livraisons
  getLivraisons(): Observable<Livraison[]> {
    return this.http.get<Livraison[]>(
      `${this.apiUrl}/livraisons/`,
      { headers: this.getHeaders() }
    );
  }

  // Récupérer une livraison
  getLivraison(id: number): Observable<Livraison> {
    return this.http.get<Livraison>(
      `${this.apiUrl}/livraisons/${id}/`,
      { headers: this.getHeaders() }
    );
  }

  // Créer une livraison
  createLivraison(data: CreateLivraisonRequest): Observable<Livraison> {
    return this.http.post<Livraison>(
      `${this.apiUrl}/livraisons/`,
      data,
      { headers: this.getHeaders() }
    );
  }

  // Mettre à jour une livraison
  updateLivraison(id: number, data: UpdateLivraisonRequest): Observable<Livraison> {
    return this.http.put<Livraison>(
      `${this.apiUrl}/livraisons/${id}/`,
      data,
      { headers: this.getHeaders() }
    );
  }

  // Supprimer une livraison
  deleteLivraison(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/livraisons/${id}/`,
      { headers: this.getHeaders() }
    );
  }

  // Rechercher des livraisons
  rechercherLivraisons(query: string): Observable<Livraison[]> {
    return this.http.get<Livraison[]>(
      `${this.apiUrl}/livraisons/?search=${query}`,
      { headers: this.getHeaders() }
    );
  }

  // Filtrer par statut
  filtrerParStatut(statut: StatutLivraison): Observable<Livraison[]> {
    return this.http.get<Livraison[]>(
      `${this.apiUrl}/livraisons/?statut=${statut}`,
      { headers: this.getHeaders() }
    );
  }
}
