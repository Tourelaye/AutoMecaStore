import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

@Injectable({ providedIn: 'root' })
export class AvisService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/admin/avis/';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Avis[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(list => list.map(a => this.mapBackendToUi(a)))
    );
  }

  setStatus(id: string, status: AvisStatus, signalReason?: string): Observable<Avis> {
    const backendStatus = status === 'visible' ? 'visible' : 'masque';
    return this.http.patch<any>(`${this.apiUrl}${id}/toggle-approve/`, {
      approuve: backendStatus === 'visible',
      signalReason: status === 'moderation_requise' ? signalReason : undefined
    }).pipe(
      map(a => this.mapBackendToUi(a))
    );
  }

  reply(id: string, adminReply: string): Observable<Avis> {
    return this.http.patch<any>(`${this.apiUrl}${id}/`, { reponse_admin: adminReply }).pipe(
      map(a => this.mapBackendToUi(a))
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }

  private mapBackendToUi(a: any): Avis {
    return {
      id: a.id?.toString() || '',
      buyer: a.client_email || a.client?.user?.email || '',
      productName: a.produit_nom || a.produit?.nom || '',
      vendor: a.vendor || 'AutoMecaStore',
      rating: a.note || 0,
      comment: a.commentaire || '',
      date: a.date_creation ? new Date(a.date_creation).toLocaleDateString('fr-FR') : '',
      status: this.toUiStatus(a.approuve, a.signalReason),
      adminReply: a.reponse_admin,
      signalReason: a.signalReason
    };
  }

  private toUiStatus(approuve: boolean, signalReason?: string): AvisStatus {
    if (signalReason) return 'moderation_requise';
    return approuve ? 'visible' : 'masque';
  }
}