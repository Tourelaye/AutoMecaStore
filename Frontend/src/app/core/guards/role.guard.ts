import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth-user.model';

export const roleGuard: CanActivateFn = (route) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const expectedRole = route.data['role'] as UserRole | undefined;

  // ── Non authentifié ──────────────────────────────────────────────
  if (!auth.isAuthenticated()) {
    // ✅ Redirige vers la bonne page login selon le rôle attendu
    let loginUrl = '/admin/login';
    if (expectedRole === 'fournisseur') {
      loginUrl = '/fournisseur/login';
    } else if (expectedRole === 'client') {
      loginUrl = '/login';
    }
    return router.parseUrl(loginUrl);
  }

  // ── Mauvais rôle ─────────────────────────────────────────────────
  if (expectedRole && !auth.hasRole(expectedRole)) {
    // ✅ Redirige vers son propre espace — pas de boucle
    return router.parseUrl(auth.homeRoute());
  }

  // ── Fournisseur non validé ─────────────────────────────────────────
  if (expectedRole === 'fournisseur' && !auth.isFournisseurValidated()) {
    return router.parseUrl('/fournisseur/en-attente');
  }

  // ── Accès autorisé ───────────────────────────────────────────────
  return true;
};