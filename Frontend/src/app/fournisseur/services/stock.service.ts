import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Produit } from './produit.service';

export type TypeMouvement = 'entree' | 'sortie' | 'retour' | 'correction';

export interface MouvementStock {
  id?: number;
  type_mouvement: TypeMouvement;
  type_mouvement_label?: string;
  quantite: number;
  observation: string;
  date_mouvement?: string;
  produit?: number;
  produit_nom?: string;
  produit_reference?: string;
  utilisateur?: number;
  utilisateur_nom?: string;
}

export interface MouvementPayload {
  type_mouvement: TypeMouvement;
  quantite: number;
  observation?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private apiUrl = 'http://127.0.0.1:8000/api/fournisseur/stock';

  constructor(private http: HttpClient) {}

  getStocks(): Observable<Produit[]> {
    return this.http.get<Produit[]>(`${this.apiUrl}/`);
  }

  /** Mise à jour directe du stock (compatibilité) */
  updateStock(id: number, stock: number, observation?: string): Observable<Produit> {
    return this.http.patch<Produit>(`${this.apiUrl}/${id}/`, { stock, observation });
  }

  /** Crée un mouvement de stock (entrée, sortie, retour, correction) */
  createMouvement(produitId: number, payload: MouvementPayload): Observable<Produit> {
    return this.http.post<Produit>(`${this.apiUrl}/${produitId}/mouvement/`, payload);
  }

  /** Liste des mouvements de stock. Optionnellement filtré par produit. */
  getMouvements(produitId?: number): Observable<MouvementStock[]> {
    const params = produitId ? `?produit=${produitId}` : '';
    return this.http.get<MouvementStock[]>(`${this.apiUrl}/mouvements/${params}`);
  }
}