import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface AdminProfile {
  fullName: string;
  email: string;
}

export interface FinanceConfig {
  commissionRate: number; // %
  vatRate: number; // %
  baseShippingFee: number; // €
}

export interface PaymentGateway {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export interface RolePermission {
  title: string;
  description: string;
}

export interface ApiConfig {
  authMethod: string;
  databaseRouting: string;
}

const MOCK_PROFILE: AdminProfile = {
  fullName: 'Thomas Admin (Principal)',
  email: 'thomas.admin@automecastore.fr'
};

const MOCK_FINANCE: FinanceConfig = {
  commissionRate: 10,
  vatRate: 20,
  baseShippingFee: 5.9
};

const MOCK_GATEWAYS: PaymentGateway[] = [
  { id: 'stripe', name: 'Stripe', description: 'Paiements par cartes bleues sécurisées (Visa, Mastercard, Amex).', icon: 'bi-credit-card-2-front', enabled: true },
  { id: 'paypal', name: 'PayPal', description: 'Alternative populaire avec compte PayPal ou virement différé.', icon: 'bi-paypal', enabled: true },
  { id: 'apple_pay', name: 'Apple Pay', description: 'Paiement instantané sur terminaux mobiles iOS et macOS.', icon: 'bi-apple', enabled: true },
  { id: 'virement', name: 'Virement Bancaire', description: 'Factures de gros pour les ateliers professionnels partenaires.', icon: 'bi-bank', enabled: true }
];

const MOCK_ROLES: RolePermission[] = [
  { title: 'Administrateur (Superviseur)', description: "Permissions complètes d'arbitrage (is_superuser=True). Accès direct à l'ensemble de l'API DRF pour modérer, rembourser et suspendre." },
  { title: 'Fournisseur (Boutiques)', description: "Accès en écriture restreint aux seuls produits rattachés à son ID vendeur (is_supplier=True). Aucun accès aux fiches tiers." },
  { title: 'Client (Acheteur)', description: "Accès en écriture aux commandes personnelles passées (is_customer=True). Lecture restreinte du catalogue de pièces en ligne." }
];

const MOCK_API_CONFIG: ApiConfig = {
  authMethod: 'Token Authentication (HTTP Bearer)',
  databaseRouting: 'PostgreSQL Cloud SQL / Django DB'
};

@Injectable({ providedIn: 'root' })
export class ParametresService {
  // Même approche que les autres modules : 100% en mémoire pour l'instant.
  private profile: AdminProfile = { ...MOCK_PROFILE };
  private finance: FinanceConfig = { ...MOCK_FINANCE };
  private gateways: PaymentGateway[] = MOCK_GATEWAYS.map(g => ({ ...g }));

  getProfile(): Observable<AdminProfile> {
    return of({ ...this.profile }).pipe(delay(150));
  }

  saveProfile(payload: { fullName: string; email: string; password?: string }): Observable<AdminProfile> {
    this.profile = { fullName: payload.fullName, email: payload.email };
    // payload.password serait envoyé séparément (endpoint dédié type /change-password/)
    return of({ ...this.profile }).pipe(delay(400));
  }

  getFinanceConfig(): Observable<FinanceConfig> {
    return of({ ...this.finance }).pipe(delay(150));
  }

  saveFinanceConfig(payload: FinanceConfig): Observable<FinanceConfig> {
    this.finance = { ...payload };
    return of({ ...this.finance }).pipe(delay(400));
  }

  getGateways(): Observable<PaymentGateway[]> {
    return of(this.gateways.map(g => ({ ...g }))).pipe(delay(150));
  }

  toggleGateway(id: string): Observable<PaymentGateway> {
    this.gateways = this.gateways.map(g => (g.id === id ? { ...g, enabled: !g.enabled } : g));
    return of(this.gateways.find(g => g.id === id)!).pipe(delay(250));
  }

  getRoles(): Observable<RolePermission[]> {
    return of(MOCK_ROLES).pipe(delay(150));
  }

  getApiConfig(): Observable<ApiConfig> {
    return of(MOCK_API_CONFIG).pipe(delay(150));
  }
}