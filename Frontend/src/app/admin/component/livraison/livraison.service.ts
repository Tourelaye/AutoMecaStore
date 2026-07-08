import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

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

const MOCK_LIVRAISONS: Livraison[] = [
  {
    id: 'ship_1', orderRef: 'ORD-20260705-1024', vendor: 'MecaPart SAS', client: 'Jean Dupont',
    carrier: 'GLS Express', trackingNumber: 'FR-923847123-GLS', currentPosition: 'Livré à domicile',
    estimatedDelivery: '06/07/2026', status: 'livre'
  },
  {
    id: 'ship_2', orderRef: 'ORD-20260705-1025', vendor: 'DistriAuto France', client: 'Marie Laurent',
    carrier: 'Colissimo Média', trackingNumber: 'COL-839210492-FR', currentPosition: 'Centre de tri postal de Lyon',
    estimatedDelivery: '08/07/2026', status: 'en_transit'
  },
  {
    id: 'ship_3', orderRef: 'ORD-20260705-1027', vendor: 'Direct Pièces Discount', client: 'Sophie Dubois',
    carrier: 'Chronopost 13h', trackingNumber: 'CH-482019482-FR', currentPosition: 'Agence Chronopost de Lesquin (Lille)',
    estimatedDelivery: '05/07/2026', status: 'incident',
    incidentReason: "Retard : Adresse incomplète fournie, colis en attente d'instructions complémentaires."
  }
];

@Injectable({ providedIn: 'root' })
export class LivraisonService {
  // Même approche que les autres modules : 100% en mémoire pour l'instant.
  private data: Livraison[] = [...MOCK_LIVRAISONS];

  getAll(): Observable<Livraison[]> {
    return of([...this.data]).pipe(delay(150));
  }

  resolveIncident(id: string, note: string): Observable<Livraison> {
    this.data = this.data.map(l =>
      l.id === id ? { ...l, status: 'en_transit' as LivraisonStatus, incidentReason: undefined, resolutionNote: note } : l
    );
    return of(this.data.find(l => l.id === id)!).pipe(delay(200));
  }

  /** Construit une URL de tracking générique. À remplacer par le lien réel du transporteur une fois disponible. */
  trackingUrl(l: Livraison): string {
    return `https://www.google.com/search?q=${encodeURIComponent(l.carrier + ' tracking ' + l.trackingNumber)}`;
  }
}