import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CategorySales {
  name: string;
  qty: number;
  pct: number;
  color: 'violet' | 'blue' | 'green' | 'amber' | 'muted';
}

export interface MonthPoint {
  label: string;
  value: number;
}

export interface TopFournisseur {
  rank: number;
  name: string;
  vendor: string;
  orders: number;
  revenue: number;
  rating: number;
  reviews: number;
}

export interface TopProduit {
  rank: number;
  name: string;
  ref: string;
  category: string;
  sales: number;
  price: number;
}

export interface DashboardStats {
  caCumule: number;
  commissions: number;
  fournisseursTotal: number;
  fournisseursActifs: number;
  fournisseursAttente: number;
  clientsTotal: number;
  produitsTotal: number;
  produitsActifs: number;
  attenteValidation: number;
  commandesJour: number;
  commandesMois: number;
  reclamationsActives: number;
  rupturesStock: number;
  produitsSignales: number;
  fournisseursSuspendus: number;
  commissionRate: string;
  evolutionPct: number;
  categories: CategorySales[];
  chart: MonthPoint[];
  topFournisseurs: TopFournisseur[];
  topProduits: TopProduit[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/admin/dashboard-stats/';

  constructor(private http: HttpClient) {}

  getStats(period: string = '7 jours'): Observable<DashboardStats> {
    const params = new HttpParams().set('period', period);
    return this.http.get<DashboardStats>(this.apiUrl, { params });
  }
}
