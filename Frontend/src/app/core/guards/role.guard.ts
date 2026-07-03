import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MockAuthService } from '../services/mock-auth.service';
import { UserRole } from '../models/auth-user.model';

/**
 * Guard basé sur les rôles.
 *
 * À déclarer sur une route via `canActivate: [roleGuard]` et
 * `data: { role: 'admin' | 'fournisseur' }`.
 *
 * - Utilisateur non connecté  -> redirection vers la page de connexion
 * - Rôle différent de la route -> redirection vers la page de connexion
 */
const LOGIN_ROUTE = '/admin/login';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(MockAuthService);
  const router = inject(Router);

  const expectedRole = route.data['role'] as UserRole | undefined;

  if (!auth.isAuthenticated()) {
    return router.parseUrl(LOGIN_ROUTE);
  }

  if (expectedRole && !auth.hasRole(expectedRole)) {
    return router.parseUrl(LOGIN_ROUTE);
  }

  return true;
};
