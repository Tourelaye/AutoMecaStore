import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FournisseurNotification {
  id: number;
  type: 'commande' | 'stock' | 'promotion' | 'avis' | 'systeme';
  titre: string;
  message: string;
  lien: string;
  lu: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class FournisseurNotificationsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/fournisseur';

  getNotifications(type?: string, lu?: boolean): Observable<FournisseurNotification[]> {
    let url = `${this.apiUrl}/notifications/`;
    const params: string[] = [];
    if (type) params.push(`type=${encodeURIComponent(type)}`);
    if (lu !== undefined) params.push(`lu=${lu}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<FournisseurNotification[]>(url);
  }

  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/notifications/count/`);
  }

  markNotificationRead(id: number): Observable<FournisseurNotification> {
    return this.http.patch<FournisseurNotification>(`${this.apiUrl}/notifications/${id}/`, { lu: true });
  }

  markAllNotificationsRead(): Observable<{ marked_as_read: number }> {
    return this.http.post<{ marked_as_read: number }>(`${this.apiUrl}/notifications/mark-all-read/`, {});
  }

  deleteNotification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/notifications/${id}/`);
  }
}
