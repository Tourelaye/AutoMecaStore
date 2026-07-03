import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { AuthUser, ROLE_HOME, UserRole } from '../models/auth-user.model';

interface DemoAccount {
  email: string;
  password: string;
  role: UserRole;
}

/**
 * Authentification fictive (Mock) pour naviguer entre les espaces
 * Administrateur et Fournisseur avant le branchement du backend.
 *
 * NOTE: Conçu pour être remplacé facilement par une authentification
 * Django REST + JWT — il suffit de réimplémenter `login()` pour appeler
 * l'API et de conserver la même interface publique.
 */
@Injectable({ providedIn: 'root' })
export class MockAuthService {

  private static readonly STORAGE_KEY = 'automeca_auth';

  // Comptes de démonstration (à supprimer lors du passage au backend réel)
  private readonly DEMO_ACCOUNTS: readonly DemoAccount[] = [
    { email: 'admin@automeca.com',       password: 'Admin123@',       role: 'admin' },
    { email: 'fournisseur@automeca.com', password: 'Fournisseur123@', role: 'fournisseur' }
  ];

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.readStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  /**
   * Vérifie les identifiants contre les comptes de démonstration.
   * Retourne l'utilisateur authentifié ou une erreur si les identifiants
   * sont invalides.
   */
  login(email: string, password: string): Observable<AuthUser> {
    const normalizedEmail = (email ?? '').trim().toLowerCase();
    const account = this.DEMO_ACCOUNTS.find(
      (acc) => acc.email === normalizedEmail && acc.password === password
    );

    if (!account) {
      return throwError(() => new Error('Adresse email ou mot de passe incorrect.'));
    }

    const user: AuthUser = { email: account.email, role: account.role };
    this.persistUser(user);
    this.currentUserSubject.next(user);
    return of(user);
  }

  logout(): void {
    localStorage.removeItem(MockAuthService.STORAGE_KEY);
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  getRole(): UserRole | null {
    return this.currentUserSubject.value?.role ?? null;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  hasRole(role: UserRole): boolean {
    return this.currentUserSubject.value?.role === role;
  }

  /** Route d'accueil correspondant au rôle de l'utilisateur connecté. */
  homeRoute(): string {
    const role = this.getRole();
    return role ? ROLE_HOME[role] : '/login';
  }

  private persistUser(user: AuthUser): void {
    localStorage.setItem(MockAuthService.STORAGE_KEY, JSON.stringify(user));
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(MockAuthService.STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed?.email && (parsed.role === 'admin' || parsed.role === 'fournisseur')) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }
}
