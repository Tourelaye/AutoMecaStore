import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: Utilisateur;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8000/api';

  // BehaviorSubject qui contient l'utilisateur connecté (null si non connecté)
  private utilisateurSubject = new BehaviorSubject<Utilisateur | null>(null);
  public utilisateur$ = this.utilisateurSubject.asObservable();

  // BehaviorSubject pour savoir si l'utilisateur est connecté
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) {
    // Au démarrage, on vérifie si un token est stocké
    this.checkTokenAtStartup();
  }

  // ---------------------------------
  // Vérification du token au démarrage
  // ---------------------------------
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

  // ---------------------------------
  // Connexion
  // ---------------------------------
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login/`, { email, password }).pipe(
      tap((response) => {
        // Stockage des tokens
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
        localStorage.setItem('user', JSON.stringify(response.user));

        // Mise à jour des subjects
        this.utilisateurSubject.next(response.user);
        this.isLoggedInSubject.next(true);
      })
    );
  }

  // ---------------------------------
  // Inscription
  // ---------------------------------
  register(data: {
    nom: string;
    prenom: string;
    email: string;
    password: string;
    telephone?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register/`, data);
  }

  // ---------------------------------
  // Déconnexion
  // ---------------------------------
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    this.utilisateurSubject.next(null);
    this.isLoggedInSubject.next(false);
  }

  // ---------------------------------
  // Getters utilitaires
  // ---------------------------------
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getUtilisateur(): Utilisateur | null {
    return this.utilisateurSubject.value;
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  getPrenom(): string {
    return this.utilisateurSubject.value?.prenom ?? '';
  }
}