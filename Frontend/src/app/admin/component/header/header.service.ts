import { environment } from '../../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Notification {
  id: number;
  message: string;
  time: string;
  type: 'order' | 'stock' | 'client' | 'produit' | 'system';
  read: boolean;
  data?: any;
}

export interface NotificationsResponse {
  notifications: Notification[];
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  private baseUrl = 'environment.apiUrl/account';

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<NotificationsResponse> {
    return this.http.get<NotificationsResponse>(`${this.baseUrl}/notifications/`);
  }

  clearNotifications(): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.baseUrl}/notifications/`);
  }
}
