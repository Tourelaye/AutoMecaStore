import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

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

const MOCK_PAIEMENTS: Paiement[] = [
  { id: 'pay_1', orderRef: 'ORD-20260705-1024', client: 'Jean Dupont', vendor: 'MecaPart SAS', gateway: 'Carte Bancaire (Stripe)', date: '04/07/2026', netClient: 209.50, commission: 20.95, status: 'reussi' },
  { id: 'pay_2', orderRef: 'ORD-20260705-1025', client: 'Marie Laurent', vendor: 'DistriAuto France', gateway: 'PayPal', date: '05/07/2026', netClient: 402.50, commission: 40.25, status: 'reussi' },
  { id: 'pay_3', orderRef: 'ORD-20260705-1026', client: 'Thomas Bernard', vendor: 'Direct Pièces Discount', gateway: 'Carte Bancaire (Stripe)', date: '05/07/2026', netClient: 139.80, commission: 13.98, status: 'reussi' },
  { id: 'pay_4', orderRef: 'ORD-20260705-1027', client: 'Sophie Dubois', vendor: 'Direct Pièces Discount', gateway: 'Apple Pay', date: '03/07/2026', netClient: 95.00, commission: 9.50, status: 'reussi' },
  { id: 'pay_5', orderRef: 'ORD-20260705-1028', client: 'Nicolas Martin', vendor: 'MecaPart SAS', gateway: 'Carte Bancaire (Stripe)', date: '02/07/2026', netClient: 9.80, commission: 0.98, status: 'rembourse' },
  { id: 'pay_6', orderRef: 'ORD-20260704-1019', client: 'Julien Petit', vendor: 'CarHacker Paris', gateway: 'Carte Bancaire (Stripe)', date: '01/07/2026', netClient: 45.00, commission: 4.50, status: 'echec' },
  { id: 'pay_7', orderRef: 'ORD-20260703-1015', client: 'Camille Roux', vendor: 'DistriAuto France', gateway: 'PayPal', date: '30/06/2026', netClient: 62.30, commission: 6.23, status: 'rembourse' }
];

@Injectable({ providedIn: 'root' })
export class PaiementService {
  // Même approche que Fournisseurs/Produits : 100% en mémoire pour l'instant.
  private data: Paiement[] = [...MOCK_PAIEMENTS];

  getAll(): Observable<Paiement[]> {
    return of([...this.data]).pipe(delay(150));
  }

  refund(id: string): Observable<Paiement> {
    this.data = this.data.map(p => (p.id === id ? { ...p, status: 'rembourse' as PaiementStatus } : p));
    return of(this.data.find(p => p.id === id)!).pipe(delay(150));
  }

  retry(id: string): Observable<Paiement> {
    this.data = this.data.map(p => (p.id === id ? { ...p, status: 'reussi' as PaiementStatus } : p));
    return of(this.data.find(p => p.id === id)!).pipe(delay(150));
  }
}