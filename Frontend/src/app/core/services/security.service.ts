import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface SecurityOverview {
  two_factor_enabled: boolean;
  email_alerts_enabled: boolean;
  password_changed_at: string | null;
  last_login: string | null;
  active_sessions_count: number;
  api_tokens_count: number;
  recent_alerts: SecurityActivity[];
}

export interface SecurityActivity {
  id?: number;
  action: string;
  action_code?: string;
  status: 'success' | 'failure' | 'info' | 'warning';
  ip_address?: string;
  timestamp: string;
  metadata?: any;
}

export interface UserSession {
  id: number;
  session_key: string;
  device_name: string;
  user_agent: string;
  ip_address: string;
  location: string;
  created_at: string;
  last_active_at: string;
  is_current: boolean;
}

export interface APIToken {
  id: number;
  name: string;
  key: string;
  created_at: string;
  last_used_at: string | null;
}

export interface TwoFactorResponse {
  enabled: boolean;
  secret: string | null;
  otpauth_url: string | null;
  backup_codes: string[];
  email_alerts_enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private readonly apiUrl = 'http://127.0.0.1:8000/account/security';

  constructor(private http: HttpClient) {}

  private getSessionKey(): string {
    let key = localStorage.getItem('security_session_key');
    if (!key) {
      key = this.generateSessionKey();
      localStorage.setItem('security_session_key', key);
    }
    return key;
  }

  generateSessionKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  private sessionHeaders(): { headers: HttpHeaders } {
    return { headers: new HttpHeaders({ 'X-Session-Key': this.getSessionKey() }) };
  }

  getOverview(): Observable<SecurityOverview> {
    return this.http.get<SecurityOverview>(`${this.apiUrl}/overview/`);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/change-password/`,
      { current_password: currentPassword, new_password: newPassword }
    );
  }

  getTwoFactor(): Observable<{ enabled: boolean; email_alerts_enabled: boolean }> {
    return this.http.get<{ enabled: boolean; email_alerts_enabled: boolean }>(`${this.apiUrl}/two-factor/`);
  }

  setTwoFactor(enabled: boolean, emailAlertsEnabled: boolean): Observable<TwoFactorResponse> {
    return this.http.post<TwoFactorResponse>(
      `${this.apiUrl}/two-factor/`,
      { enabled, email_alerts_enabled: emailAlertsEnabled }
    );
  }

  getActivity(): Observable<SecurityActivity[]> {
    return this.http.get<SecurityActivity[]>(`${this.apiUrl}/activity/`);
  }

  getSessions(): Observable<UserSession[]> {
    return this.http.get<UserSession[]>(`${this.apiUrl}/sessions/`, this.sessionHeaders());
  }

  registerSession(deviceName?: string): Observable<{ message: string; session_key: string }> {
    const body = {
      session_key: this.getSessionKey(),
      device_name: deviceName || this.guessDeviceName()
    };
    return this.http.post<{ message: string; session_key: string }>(
      `${this.apiUrl}/sessions/register/`,
      body,
      this.sessionHeaders()
    ).pipe(tap(() => {}));
  }

  revokeSession(sessionKey: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/sessions/${sessionKey}/revoke/`,
      {},
      this.sessionHeaders()
    );
  }

  revokeOtherSessions(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/sessions/revoke-others/`,
      {},
      this.sessionHeaders()
    );
  }

  getTokens(): Observable<APIToken[]> {
    return this.http.get<APIToken[]>(`${this.apiUrl}/tokens/`);
  }

  createToken(name: string): Observable<APIToken> {
    return this.http.post<APIToken>(`${this.apiUrl}/tokens/`, { name });
  }

  revokeToken(tokenId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/tokens/${tokenId}/`);
  }

  logoutAll(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout-all/`, {}, this.sessionHeaders());
  }

  deactivateAccount(password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/deactivate/`, { password });
  }

  private guessDeviceName(): string {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return 'Mobile';
    if (/iPad|Tablet/i.test(ua)) return 'Tablette';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Appareil inconnu';
  }
}
