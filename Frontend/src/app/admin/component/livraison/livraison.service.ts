import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type LivraisonStatus = 'livre' | 'en_transit' | 'incident';

export interface Livraison {
  id: string;
  orderRef: string;
  vendor: string;
  client: string;
  carrier: string;
  trackingNumber: string;
  currentPosition: string;
  estimatedDelivery: string; // jj/mm/aaaa
  status: LivraisonStatus;
  incidentReason?: string;
  resolutionNote?: string;
}

@Injectable({ providedIn: 'root' })
export class LivraisonService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/admin/livraisons/';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Livraison[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(list => list.map(l => this.mapBackendToUi(l)))
    );
  }

  resolveIncident(id: string, note: string): Observable<Livraison> {
    return this.http.patch<any>(`${this.apiUrl}${id}/statut/`, { statut: 'en_transit' }).pipe(
      map(l => this.mapBackendToUi(l))
    );
  }

  /** Construit une URL de tracking générique. À remplacer par le lien réel du transporteur une fois disponible. */
  trackingUrl(l: Livraison): string {
    return `https://www.google.com/search?q=${encodeURIComponent(l.carrier + ' tracking ' + l.trackingNumber)}`;
  }

  private mapBackendToUi(l: any): Livraison {
    return {
      id: l.id?.toString() || '',
      orderRef: l.commande_reference || l.commande?.reference || '',
      vendor: 'AutoMecaStore',
      client: l.client_email || l.client?.user?.email || '',
      carrier: 'Transporteur partenaire',
      trackingNumber: l.tracking_number || 'N/A',
      currentPosition: l.statut === 'LIVREE' ? 'Livré à domicile' : 'En cours de livraison',
      estimatedDelivery: l.date_livraison
        ? new Date(l.date_livraison).toLocaleDateString('fr-FR')
        : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
      status: this.toUiStatus(l.statut),
      incidentReason: l.incident_reason,
      resolutionNote: l.resolution_note
    };
  }

  private toUiStatus(statut: string): LivraisonStatus {
    const s = (statut || '').toUpperCase();
    if (s === 'LIVREE' || s === 'LIVRE') return 'livre';
    if (s === 'INCIDENT' || s === 'BLOQUE' || s === 'BLOQUÉ') return 'incident';
    return 'en_transit';
  }
}