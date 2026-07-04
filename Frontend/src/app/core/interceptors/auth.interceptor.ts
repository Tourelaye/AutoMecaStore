import { Injectable } from '@angular/core';
import {
  HttpRequest, HttpHandler, HttpEvent,
  HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { MockAuthService } from '../services/mock-auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,       // ← clients
    private mockAuthService: MockAuthService, // ← admin + fournisseur
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // ✅ Priorité 1 : token JWT réel (client connecté via Django)
    const jwtToken = this.authService.getToken();

    // ✅ Priorité 2 : token mock admin/fournisseur
    // MockAuthService stocke le rôle dans 'automeca_auth'
    // On construit un pseudo-token lisible par Django si nécessaire
    // Pour l'instant on skip l'injection de token pour les routes admin mock
    const mockUser = this.mockAuthService.getCurrentUser();

    // ── Détermine quelle URL est ciblée ────────────────────────────
    const isAdminApi      = request.url.includes('/api/dashboard/') ||
                            request.url.includes('/api/notifications/');
    const isClientApi     = request.url.includes('/account/');
    const isPublicApi     = request.url.includes('/api/produits/') ||
                            request.url.includes('/api/categories/');

    // ── Attache le token selon le contexte ─────────────────────────
    if (jwtToken && !isAdminApi) {
      // Client avec JWT réel → on attache le token
      request = this.addToken(request, jwtToken);

    } else if (mockUser && isAdminApi) {
      // Admin/Fournisseur mock → les routes Django nécessitent un vrai JWT
      // On skippe l'injection car MockAuthService ne génère pas de JWT
      // Les erreurs 401 seront silencieuses (fallback data dans le dashboard)
      // TODO: brancher le vrai JWT quand le backend sera prêt
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {

        if (error.status === 401) {
          const url = this.router.url;

          // ✅ FIX BOUCLE : ne redirige que si pas déjà sur login
          if (url.includes('/admin/') && !url.includes('/admin/login')) {

            // Admin mock → NE PAS déconnecter, juste ignorer le 401
            // car MockAuthService gère l'auth indépendamment du JWT
            if (mockUser?.role === 'admin' || mockUser?.role === 'fournisseur') {
              // Silencieux — le dashboard affichera les données fallback
              return throwError(() => error);
            }

            // Vrai client sans token → déconnecter
            this.authService.logout();
            this.router.navigate(['/admin/login']);

          } else if (!url.includes('/login') && !mockUser) {
            // Client déconnecté → retour login client
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }

        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
}