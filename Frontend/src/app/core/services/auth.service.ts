import { Injectable, inject, forwardRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { PanierService } from './panier.service';

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse: string; // Removed the optional operator (?)
  role?: string;
  statut?: string;
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

  private get panierService(): PanierService {
    return inject(forwardRef(() => PanierService));
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
          role: payload.role ?? 'client',
          statut: payload.fournisseur_status ?? ''
        };
        this.utilisateurSubject.next(userFromToken);
        this.isLoggedInSubject.next(true);
        localStorage.setItem('user', JSON.stringify(userFromToken));

        // Charge le profil complet depuis /me/
        this.fetchProfil().subscribe(() => {
          // Sync localStorage cart to backend after login
          this.panierService.syncLocalStorageToBackend();
        });
      })
    );
  }

  fetchProfil(): Observable<Utilisateur> {
    return this.http.get<Utilisateur>(`${this.apiUrl}/me/`).pipe(
      tap((profil) => {
        this.utilisateurSubject.next(profil);
        localStorage.setItem('user', JSON.stringify(profil));
      })
    );
  }

  updateProfil(data: Partial<Utilisateur>): Observable<Utilisateur> {
    return this.http.patch<Utilisateur>(`${this.apiUrl}/me/`, data).pipe(
      tap((profil) => {
        this.utilisateurSubject.next(profil);
        localStorage.setItem('user', JSON.stringify(profil));
      })
    );
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/`, data);
  }

  registerFournisseur(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register-fournisseur/`, data);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.utilisateurSubject.next(null);
    this.isLoggedInSubject.next(false);
  }

  // Méthodes pour gérer les rôles
  isAdmin(): boolean {
    const user = this.utilisateurSubject.value;
    return user?.role === 'admin';
  }

  isClient(): boolean {
    const user = this.utilisateurSubject.value;
    return user?.role === 'client';
  }

  isFournisseur(): boolean {
    const user = this.utilisateurSubject.value;
    return user?.role === 'fournisseur';
  }

  getCurrentUserRole(): string | null {
    const user = this.utilisateurSubject.value;
    return user?.role || null;
  }

  hasRole(role: string): boolean {
    const user = this.utilisateurSubject.value;
    return user?.role === role;
  }

  getToken(): string | null { return localStorage.getItem('access_token'); }
  getUtilisateur(): Utilisateur | null { return this.utilisateurSubject.value; }
  getCurrentUser(): Utilisateur | null { return this.utilisateurSubject.value; }
  isLoggedIn(): boolean { return this.isLoggedInSubject.value; }
  isAuthenticated(): boolean { return this.isLoggedInSubject.value; }

  homeRoute(): string {
    const role = this.getCurrentUserRole();
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'fournisseur') {
      return this.getCurrentUser()?.statut === 'actif'
        ? '/fournisseur/dashboard'
        : '/fournisseur/en-attente';
    }
    return '/login';
  }

  isFournisseurValidated(): boolean {
    return this.isFournisseur() && this.getCurrentUser()?.statut === 'actif';
  }

  getPrenom(): string { return this.utilisateurSubject.value?.prenom ?? ''; }

  getInitiales(): string {
    const u = this.utilisateurSubject.value;
    if (!u) return '?';
    return `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase();
  }

  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return {};

      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padding = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
      const binary = atob(base64 + padding);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
      const jsonPayload = new TextDecoder('utf-8').decode(bytes);

      return JSON.parse(jsonPayload);
    } catch { return {}; }
  }
}