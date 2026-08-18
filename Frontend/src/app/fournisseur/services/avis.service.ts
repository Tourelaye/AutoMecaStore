import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SignalementAvis {
  id: number;
  motif: 'offensant' | 'spam' | 'faux' | 'inapproprie';
  commentaire?: string;
  date: string;
  statut: 'en_attente' | 'traite' | 'rejete';
}

export interface Avis {
  id: number;
  produit: number;
  produit_nom: string;
  produit_reference?: string;
  produit_image?: string | null;
  client: number;
  client_nom: string;
  client_prenom?: string;
  client_photo?: string | null;
  note: number;
  commentaire: string;
  date: string;
  photos: string[];
  achat_verifie: boolean;
  reponse_fournisseur?: string;
  date_reponse?: string;
  reponse_fournisseur_nom?: string;
  signale: boolean;
  signalements: SignalementAvis[];
}

export interface AvisStats {
  total: number;
  note_moyenne: number;
  repartition: { [note: string]: number };
  top_produits: { id: number; nom: string; note_moyenne: number; nb_avis: number }[];
  flop_produits: { id: number; nom: string; note_moyenne: number; nb_avis: number }[];
  evolution: { [mois: string]: { count: number; moyenne: number } };
  reponses: {
    count: number;
    avg_response_time_hours: number | null;
  };
}

export interface AvisFilters {
  search: string;
  note: 'tous' | '5' | '4' | '3' | '2' | '1';
  avecPhotos: 'tous' | 'true' | 'false';
  achatVerifie: 'tous' | 'true' | 'false';
  sortBy: 'date' | 'note' | 'produit';
  sortDir: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class AvisService {
  private apiUrl = 'http://127.0.0.1:8000/api/fournisseur/avis';

  constructor(private http: HttpClient) {}

  getAvis(): Observable<Avis[]> {
    return this.http.get<Avis[]>(`${this.apiUrl}/`);
  }

  getStats(): Observable<AvisStats> {
    return this.http.get<AvisStats>(`${this.apiUrl}/stats/`);
  }

  repondre(id: number, reponse: string): Observable<Avis> {
    return this.http.post<Avis>(`${this.apiUrl}/${id}/repondre/`, { reponse_fournisseur: reponse });
  }

  signaler(id: number, motif: string, commentaire: string = ''): Observable<SignalementAvis> {
    return this.http.post<SignalementAvis>(`${this.apiUrl}/${id}/signaler/`, { motif, commentaire });
  }
}
