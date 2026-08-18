import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type PaiementStatut =
  | 'en_attente'
  | 'en_cours'
  | 'reussi'
  | 'echoue'
  | 'annule'
  | 'remboursement_demande'
  | 'remboursement_en_cours'
  | 'rembourse'
  | 'remboursement_refuse';

export type PaiementAction =
  | 'confirmer'
  | 'echouer'
  | 'annuler'
  | 'demander_remboursement'
  | 'demarrer_remboursement'
  | 'rembourser'
  | 'refuser_remboursement';

export interface Paiement {
  id: number;
  reference: string;
  commande: number | null;
  commande_reference: string;
  client: number | null;
  client_nom: string;
  moyen: string;
  moyen_libelle: string;
  statut: PaiementStatut;
  statut_libelle: string;
  montant: number;
  date_creation: string;
  date_mise_a_jour: string;
  provider_reference: string;
  motif_erreur: string;
  remboursement_motif: string;
  remboursement_montant: number | null;
  metadata: Record<string, unknown>;
}

export interface PaiementActionPayload {
  action: PaiementAction;
  motif?: string;
  provider_reference?: string;
  remboursement_montant?: number | null;
}

@Injectable({ providedIn: 'root' })
export class PaiementService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/admin/paiements/';

  constructor(private http: HttpClient) {}

  getAll(search = ''): Observable<Paiement[]> {
    let params = new HttpParams();
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Paiement[]>(this.apiUrl, { params }).pipe(
      map(list => list.map(p => this.normalize(p)))
    );
  }

  get(id: number): Observable<Paiement> {
    return this.http.get<Paiement>(`${this.apiUrl}${id}/`).pipe(map(p => this.normalize(p)));
  }

  action(id: number, payload: PaiementActionPayload): Observable<Paiement> {
    return this.http.post<Paiement>(`${this.apiUrl}${id}/action/`, payload).pipe(
      map(p => this.normalize(p))
    );
  }

  private normalize(p: Paiement): Paiement {
    return {
      ...p,
      montant: Number(p.montant) || 0,
      remboursement_montant:
        p.remboursement_montant === null || p.remboursement_montant === undefined
          ? null
          : Number(p.remboursement_montant),
      metadata: p.metadata || {}
    };
  }
}
