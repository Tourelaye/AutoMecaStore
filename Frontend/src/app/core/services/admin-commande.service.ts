import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminCommande,
  AdminCommandeDetail,
  StatistiquesCommande,
  AlerteCommande,
  ActionCommandePayload,
  FiltresCommande
} from '../../models/admin-commande.model';

@Injectable({
  providedIn: 'root'
})
export class AdminCommandeService {
  private apiUrl = 'http://127.0.0.1:8000/api/admin';

  constructor(private http: HttpClient) { }

  getCommandes(filtres?: FiltresCommande): Observable<AdminCommande[]> {
    let params = new HttpParams();
    if (filtres) {
      Object.entries(filtres).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value);
        }
      });
    }
    return this.http.get<AdminCommande[]>(`${this.apiUrl}/commandes/`, { params });
  }

  getCommande(id: number): Observable<AdminCommandeDetail> {
    return this.http.get<AdminCommandeDetail>(`${this.apiUrl}/commandes/${id}/`);
  }

  getStats(): Observable<StatistiquesCommande> {
    return this.http.get<StatistiquesCommande>(`${this.apiUrl}/commandes/stats/`);
  }

  getAlertes(): Observable<AlerteCommande[]> {
    return this.http.get<AlerteCommande[]>(`${this.apiUrl}/commandes/alerts/`);
  }

  actionCommande(id: number, payload: ActionCommandePayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/commandes/${id}/action/`, payload);
  }

  exportCSV(filtres?: FiltresCommande): Observable<Blob> {
    let params = new HttpParams().set('format', 'csv');
    if (filtres) {
      Object.entries(filtres).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && ['statut', 'periode'].includes(key)) {
          params = params.set(key, value);
        }
      });
    }
    return this.http.get(`${this.apiUrl}/commandes/export/`, { params, responseType: 'blob' });
  }

  exportPDF(filtres?: FiltresCommande): Observable<string> {
    let params = new HttpParams().set('format', 'pdf');
    if (filtres) {
      Object.entries(filtres).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && ['statut', 'periode'].includes(key)) {
          params = params.set(key, value);
        }
      });
    }
    return this.http.get(`${this.apiUrl}/commandes/export/`, { params, responseType: 'text' });
  }
}
