import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse: string; // Removed the optional operator (?)
  role?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = 'http://127.0.0.1:8000/account';

  private utilisateurSubject = new BehaviorSubject<Utilisateur | null>(null);
  public utilisateur$ = this.utilisateurSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkTokenAtStartup();
  }

  private checkTokenAtStartup(): void {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as Utilisateur;
        this.utilisateurSubject.next(user);
        this.isLoggedInSubject.next(true);
      } catch {
        this.logout();
      }
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login/`, { email, password }).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);

        const payload = this.decodeToken(response.access);
        const userFromToken: Utilisateur = {
          id: payload.user_id ?? 0,
          nom: payload.nom ?? '',
          prenom: payload.prenom ?? '',
          email: email,
          adresse: '',
          role: payload.role ?? 'client'
        };
        this.utilisateurSubject.next(userFromToken);
        this.isLoggedInSubject.next(true);
        localStorage.setItem('user', JSON.stringify(userFromToken));

        // Charge le profil complet depuis /me/
        this.fetchProfil().subscribe();
      })
    );
  }

  fetchProfil(): Observable<Utilisateur> {
    const token = this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const user = this.utilisateurSubject.value;
    const url = `${this.apiUrl}/me/${user?.id ?? ''}/`;
    return this.http.get<Utilisateur>(url, { headers }).pipe(
      tap((profil) => {
        this.utilisateurSubject.next(profil);
        localStorage.setItem('user', JSON.stringify(profil));
      })
    );
  }

  updateProfil(data: Partial<Utilisateur>): Observable<Utilisateur> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    const user = this.utilisateurSubject.value;
    return this.http.patch<Utilisateur>(
      `${this.apiUrl}/me/${user?.id}/`,
      data,
      { headers }
    ).pipe(
      tap((profil) => {
        this.utilisateurSubject.next(profil);
        localStorage.setItem('user', JSON.stringify(profil));
      })
    );
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/`, data);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.utilisateurSubject.next(null);
    this.isLoggedInSubject.next(false);
  }

  getToken(): string | null { return localStorage.getItem('access_token'); }
  getUtilisateur(): Utilisateur | null { return this.utilisateurSubject.value; }
  isLoggedIn(): boolean { return this.isLoggedInSubject.value; }
  getPrenom(): string { return this.utilisateurSubject.value?.prenom ?? ''; }

  getInitiales(): string {
    const u = this.utilisateurSubject.value;
    if (!u) return '?';
    return `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase();
  }

  private decodeToken(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch { return {}; }
  }
}