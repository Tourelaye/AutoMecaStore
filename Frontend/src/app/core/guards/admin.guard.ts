import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/admin/login');
  }

  const user = auth.getCurrentUser();
  if (!user || user.role !== 'admin' || user.is_active === false) {
    auth.logout();
    return router.parseUrl('/admin/login');
  }

  return true;
};
