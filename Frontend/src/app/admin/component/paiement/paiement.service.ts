import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type PaiementStatus = 'reussi' | 'rembourse' | 'echec';

export interface Paiement {
  id: string;
  orderRef: string;
  client: string;
  vendor: string;
  gateway: string;
  date: string; // format jj/mm/aaaa
  netClient: number;
  commission: number;
  status: PaiementStatus;
}

@Injectable({ providedIn: 'root' })
export class PaiementService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/admin/paiements/';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Paiement[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(list => list.map(p => this.mapBackendToUi(p)))
    );
  }

  refund(id: string): Observable<Paiement> {
    return this.updateStatus(id, 'rembourse');
  }

  retry(id: string): Observable<Paiement> {
    return this.updateStatus(id, 'reussi');
  }

  private updateStatus(id: string, status: PaiementStatus): Observable<Paiement> {
    const backendStatus = this.toBackendStatus(status);
    return this.http.patch<any>(`${this.apiUrl}${id}/`, { statut: backendStatus }).pipe(
      map(p => this.mapBackendToUi(p))
    );
  }

  private mapBackendToUi(p: any): Paiement {
    return {
      id: p.id?.toString() || '',
      orderRef: p.commande_reference || p.commande?.reference || '',
      client: p.client_email || p.client?.user?.email || '',
      vendor: p.vendor || 'AutoMecaStore',
      gateway: p.type || 'Carte Bancaire',
      date: p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : '',
      netClient: parseFloat(p.montant) || 0,
      commission: (parseFloat(p.montant) || 0) * 0.10,
      status: this.toUiStatus(p.statut)
    };
  }

  private toUiStatus(statut: string): PaiementStatus {
    const s = (statut || '').toUpperCase();
    if (s === 'REMBOURSE' || s === 'REMBOURSÉ') return 'rembourse';
    if (s === 'CONFIRME' || s === 'CONFIRMÉ' || s === 'REUSSI' || s === 'RÉUSSI') return 'reussi';
    return 'echec';
  }

  private toBackendStatus(status: PaiementStatus): string {
    switch (status) {
      case 'rembourse': return 'REMBOURSE';
      case 'reussi': return 'CONFIRME';
      case 'echec': return 'ECHEC';
    }
  }
}