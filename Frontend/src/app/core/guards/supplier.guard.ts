import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const supplierGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/fournisseur/login');
  }

  const user = auth.getCurrentUser();
  if (!user || user.role !== 'fournisseur' || user.is_active === false) {
    auth.logout();
    return router.parseUrl('/fournisseur/login');
  }

  if (user.statut !== 'actif') {
    return router.parseUrl('/fournisseur/en-attente');
  }

  return true;
};
