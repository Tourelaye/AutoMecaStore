import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export type AvisStatus = 'visible' | 'masque' | 'moderation_requise';

export interface Avis {
  id: string;
  buyer: string;
  productName: string;
  vendor: string;
  rating: number; // 1 à 5
  comment: string;
  date: string; // jj/mm/aaaa
  status: AvisStatus;
  adminReply?: string;
  signalReason?: string;
}

const MOCK_AVIS: Avis[] = [
  {
    id: 'rev_1', buyer: 'Jean Dupont', productName: "Kit d'Embrayage Complet LUK RepSet Pro", vendor: 'MecaPart SAS',
    rating: 5, comment: "Produit parfaitement identique à l'origine. Montage effectué sans problème sur ma Clio III. Expédition très rapide !",
    date: '01/07/2026', status: 'visible'
  },
  {
    id: 'rev_2', buyer: 'Sophie Dubois', productName: "Cardan d'Arbre de Transmission Avant Droit SKF", vendor: 'Direct Pièces Discount',
    rating: 2, comment: "La référence OEM indiquée ne correspond absolument pas au cardan reçu pour ma Golf VI. Service client à revoir.",
    date: '03/07/2026', status: 'moderation_requise', signalReason: 'Signalé par un client pour non-conformité du produit reçu.'
  },
  {
    id: 'rev_3', buyer: 'Marc Lefevre', productName: 'Disques de Frein Ventilés Brembo (La Paire)', vendor: 'DistriAuto France',
    rating: 5, comment: 'Freinage nickel, livraison rapide. Rien à redire.',
    date: '04/07/2026', status: 'visible'
  },
  {
    id: 'rev_4', buyer: 'Nadia Benali', productName: 'Filtre à Huile Purflux Premium', vendor: 'MecaPart SAS',
    rating: 4, comment: 'Bon rapport qualité prix, conforme à la description.',
    date: '05/07/2026', status: 'visible'
  }
];

@Injectable({ providedIn: 'root' })
export class AvisService {
  // Même approche que les autres modules : 100% en mémoire pour l'instant.
  private data: Avis[] = [...MOCK_AVIS];

  getAll(): Observable<Avis[]> {
    return of([...this.data]).pipe(delay(150));
  }

  private patch(id: string, changes: Partial<Avis>): Observable<Avis> {
    this.data = this.data.map(a => (a.id === id ? { ...a, ...changes } : a));
    return of(this.data.find(a => a.id === id)!).pipe(delay(120));
  }

  setStatus(id: string, status: AvisStatus, signalReason?: string): Observable<Avis> {
    return this.patch(id, { status, signalReason: status === 'moderation_requise' ? signalReason : undefined });
  }

  reply(id: string, adminReply: string): Observable<Avis> {
    return this.patch(id, { adminReply });
  }

  delete(id: string): Observable<void> {
    this.data = this.data.filter(a => a.id !== id);
    return of(void 0).pipe(delay(120));
  }
}