import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MockAuthService } from '../services/mock-auth.service';
import { UserRole } from '../models/auth-user.model';

export const roleGuard: CanActivateFn = (route) => {
  const auth   = inject(MockAuthService);
  const router = inject(Router);

  const expectedRole = route.data['role'] as UserRole | undefined;

  // ── Non authentifié ──────────────────────────────────────────────
  if (!auth.isAuthenticated()) {
    // ✅ Redirige vers la bonne page login selon le rôle attendu
    const loginUrl = expectedRole === 'fournisseur'
      ? '/fournisseur/login'
      : '/admin/login';
    return router.parseUrl(loginUrl);
  }

  // ── Mauvais rôle ─────────────────────────────────────────────────
  if (expectedRole && !auth.hasRole(expectedRole)) {
    // ✅ Redirige vers son propre espace — pas de boucle
    return router.parseUrl(auth.homeRoute());
  }

  // ── Accès autorisé ───────────────────────────────────────────────
  return true;
};