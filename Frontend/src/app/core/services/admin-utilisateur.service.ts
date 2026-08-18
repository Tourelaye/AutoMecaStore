import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminUtilisateur,
  UtilisateurDetail,
  UtilisateurStats,
  UtilisateurFilters,
  ActionPayload,
  NotificationGroupePayload
} from '../../models/admin-utilisateur.model';

@Injectable({
  providedIn: 'root'
})
export class AdminUtilisateurService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api/admin/utilisateurs';

  constructor(private http: HttpClient) {}

  getUtilisateurs(filters: UtilisateurFilters = {}): Observable<AdminUtilisateur[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<AdminUtilisateur[]>(this.baseUrl + '/', { params });
  }

  getUtilisateur(id: number): Observable<UtilisateurDetail> {
    return this.http.get<UtilisateurDetail>(`${this.baseUrl}/${id}/`);
  }

  getStats(): Observable<UtilisateurStats> {
    return this.http.get<UtilisateurStats>(`${this.baseUrl}/stats/`);
  }

  updateUtilisateur(id: number, data: Partial<AdminUtilisateur>): Observable<UtilisateurDetail> {
    return this.http.patch<UtilisateurDetail>(`${this.baseUrl}/${id}/`, data);
  }

  action(id: number, payload: ActionPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${id}/action/`, payload);
  }

  getActivite(id: number): Observable<{ securite: any[]; admin: any[] }> {
    return this.http.get<{ securite: any[]; admin: any[] }>(`${this.baseUrl}/${id}/activite/`);
  }

  sendNotification(payload: NotificationGroupePayload): Observable<{ message: string; nombre: number }> {
    return this.http.post<{ message: string; nombre: number }>(`${this.baseUrl}/notifications/`, payload);
  }
}
