export type UserRole = 'admin' | 'fournisseur';

export interface AuthUser {
  email: string;
  role: UserRole;
}

export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  fournisseur: '/fournisseur/dashboard'
};
