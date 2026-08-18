import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface NotificationClient {
  id: number;
  type: string;
  importance: 'info' | 'success' | 'warning' | 'danger';
  titre: string;
  message: string;
  lien?: string;
  objet_type?: string;
  objet_id?: number;
  lu: boolean;
  created_at: string;
}

export interface ClientNotificationsResponse {
  notifications: NotificationClient[];
  unread_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClientNotificationsService {
  private readonly API_URL = 'http://127.0.0.1:8000/account';

  private unreadCount = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCount.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getNotifications(limit = 20): Observable<ClientNotificationsResponse> {
    return this.http.get<ClientNotificationsResponse>(
      `${this.API_URL}/notifications/?limit=${limit}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(res => this.unreadCount.next(res.unread_count || 0))
    );
  }

  getCount(): Observable<{ unread_count: number }> {
    return this.http.get<{ unread_count: number }>(
      `${this.API_URL}/notifications/count/`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(res => this.unreadCount.next(res.unread_count || 0))
    );
  }

  marquerCommeLue(id: number): Observable<any> {
    return this.http.patch(
      `${this.API_URL}/notifications/${id}/`,
      { lu: true },
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => {
        const current = this.unreadCount.value;
        if (current > 0) this.unreadCount.next(current - 1);
      })
    );
  }

  toutMarquerCommeLu(): Observable<{ marked_as_read: number }> {
    return this.http.post<{ marked_as_read: number }>(
      `${this.API_URL}/notifications/mark-all-read/`,
      {},
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => this.unreadCount.next(0))
    );
  }

  supprimerNotification(id: number): Observable<any> {
    return this.http.delete(
      `${this.API_URL}/notifications/${id}/`,
      { headers: this.getAuthHeaders() }
    );
  }

  refreshCount(): void {
    this.getNotifications().subscribe({
      error: (err) => console.error('Erreur compteur notifications:', err)
    });
  }
}
