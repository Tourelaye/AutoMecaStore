import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

export interface Avis {
  id: number;
  produit: number;
  produit_nom: string;
  client_nom: string;
  note: number;
  commentaire: string;
  date: string;
  reponse_fournisseur?: string;
  date_reponse?: string;
  statut: string;
}

@Injectable({
  providedIn: 'root'
})
export class AvisService {
  private apiUrl = 'http://127.0.0.1:8000/api/fournisseur/avis';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getAvis(): Observable<Avis[]> {
    return this.http.get<Avis[]>(`${this.apiUrl}/`);
  }

  repondre(id: number, reponse: string): Observable<Avis> {
    return this.http.patch<Avis>(`${this.apiUrl}/${id}/`, { reponse_fournisseur: reponse });
  }
}
