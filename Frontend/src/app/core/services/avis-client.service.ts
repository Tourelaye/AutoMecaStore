import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AvisProduit } from './produit.service';

export interface CreateAvisPayload {
  note: number;
  commentaire: string;
  produit?: number | null;
  magasin?: number | null;
  commande?: number | null;
  ligne_commande?: number | null;
  note_qualite_produit?: number | null;
  note_delai?: number | null;
  note_communication?: number | null;
  note_livraison?: number | null;
  photos?: string[];
}

export interface SignalementPayload {
  motif: string;
  commentaire?: string;
}

export interface AvisStats {
  total: number;
  note_moyenne: number;
  repartition: { [note: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class AvisClientService {
  private apiUrl = 'http://127.0.0.1:8000/api/avis';

  constructor(private http: HttpClient) {}

  getAvisProduit(produitId: number): Observable<AvisProduit[]> {
    return this.http.get<AvisProduit[]>(`${this.apiUrl}/produit/${produitId}/`);
  }

  getAvisMagasin(magasinId: number): Observable<AvisProduit[]> {
    return this.http.get<AvisProduit[]>(`${this.apiUrl}/magasin/${magasinId}/`);
  }

  createAvis(payload: CreateAvisPayload): Observable<AvisProduit> {
    return this.http.post<AvisProduit>(`${this.apiUrl}/create/`, payload);
  }

  signalerAvis(avisId: number, payload: SignalementPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/${avisId}/signaler/`, payload);
  }
}
