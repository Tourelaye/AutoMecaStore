import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface PaiementClient {
  id: number;
  reference: string;
  cle_idempotence: string;
  commande: number;
  commande_reference: string;
  client: number;
  client_nom: string;
  moyen: string;
  moyen_libelle: string;
  statut: string;
  statut_libelle: string;
  montant: number;
  date_creation: string;
  date_mise_a_jour: string;
  provider_reference?: string;
  motif_erreur?: string;
  remboursement_motif?: string;
  remboursement_montant?: number;
  metadata?: any;
}

export interface PaiementInitRequest {
  commande: number;
  moyen: string;
  idempotence_key?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaiementClientService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Initier un paiement depuis le panier
  initierPaiement(data: PaiementInitRequest): Observable<PaiementClient> {
    return this.http.post<PaiementClient>(
      `${this.apiUrl}/paiement/initier/`,
      data,
      { headers: this.getHeaders() }
    );
  }

  // Consulter un paiement
  getPaiement(id: number): Observable<PaiementClient> {
    return this.http.get<PaiementClient>(
      `${this.apiUrl}/client/paiements/${id}/`,
      { headers: this.getHeaders() }
    );
  }

  // Annuler un paiement en attente
  annulerPaiement(id: number): Observable<PaiementClient> {
    return this.http.post<PaiementClient>(
      `${this.apiUrl}/client/paiements/${id}/annuler/`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // Liste des paiements du client
  getMesPaiements(): Observable<PaiementClient[]> {
    return this.http.get<PaiementClient[]>(
      `${this.apiUrl}/client/paiements/`,
      { headers: this.getHeaders() }
    );
  }
}
