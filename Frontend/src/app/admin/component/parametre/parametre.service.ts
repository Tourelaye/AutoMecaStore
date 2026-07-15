import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export interface RolePermission {
  id: number;
  title: string;
  description: string;
  role_key: string;
}

export interface ApiConfig {
  authMethod: string;
  databaseRouting: string;
}

@Injectable({ providedIn: 'root' })
export class ParametresService {
  private apiUrl = 'http://127.0.0.1:8000/api/admin';

  constructor(private http: HttpClient) {}

  getProfile(): Observable<AdminProfile> {
    return this.http.get<AdminProfile>(`${this.apiUrl}/profil/`);
  }

  saveProfile(payload: { fullName: string; email: string; password?: string }): Observable<AdminProfile> {
    return this.http.put<AdminProfile>(`${this.apiUrl}/profil/`, payload);
  }

  getFinanceConfig(): Observable<FinanceConfig> {
    return this.http.get<FinanceConfig>(`${this.apiUrl}/parametres/finance/`);
  }

  saveFinanceConfig(payload: FinanceConfig): Observable<FinanceConfig> {
    return this.http.put<FinanceConfig>(`${this.apiUrl}/parametres/finance/`, payload);
  }

  getGateways(): Observable<PaymentGateway[]> {
    return this.http.get<PaymentGateway[]>(`${this.apiUrl}/parametres/gateways/`);
  }

  toggleGateway(id: number): Observable<PaymentGateway> {
    return this.http.post<PaymentGateway>(`${this.apiUrl}/parametres/gateways/${id}/toggle/`, {});
  }

  getRoles(): Observable<RolePermission[]> {
    return this.http.get<RolePermission[]>(`${this.apiUrl}/parametres/roles/`);
  }

  getApiConfig(): Observable<ApiConfig> {
    return this.http.get<ApiConfig>(`${this.apiUrl}/parametres/api/`);
  }
}