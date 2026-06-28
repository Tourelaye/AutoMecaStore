import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface DashboardStats {
  totalProduits: number;
  totalCommandes: number;
  totalRevenue: number;
  stockFaible: number;
}

export interface WeeklySalesData {
  label: string;
  real: number;
  target: number;
  value: string;
}

export interface RecentOrder {
  id: string;
  client?: string;
  produits?: number[];
  total: number;
  statut: string;
}

export interface TopProduct {
  id: number;
  nom: string;
  categorie_nom?: string;
  categorie?: string;
  ventes: number;
  pct?: number;
  icon?: string;
  color?: string;
  total_revenue?: number;
}

export interface Kpi {
  label: string;
  value: string;
  icon: string;
  bg: string;
  color: string;
  trend: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // Get all dashboard stats in one call
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/dashboard/stats/`);
  }

  // Get weekly sales data
  getWeeklySales(): Observable<WeeklySalesData[]> {
    return this.http.get<WeeklySalesData[]>(`${this.baseUrl}/dashboard/weekly-sales/`);
  }

  // Get recent orders
  getRecentOrders(limit: number = 5): Observable<RecentOrder[]> {
    return this.http.get<RecentOrder[]>(`${this.baseUrl}/dashboard/recent-orders/?limit=${limit}`);
  }

  // Get total products count
  getTotalProducts(): Observable<number> {
    return this.http.get<any>(`${this.baseUrl}/produits/`).pipe(
      map((data: any) => Array.isArray(data) ? data.length : (data.count || 0))
    );
  }

  // Get total orders count
  getTotalOrders(): Observable<number> {
    return this.http.get<any>(`${this.baseUrl}/commandes/`).pipe(
      map((data: any) => Array.isArray(data) ? data.length : (data.count || 0))
    );
  }

  // Get products with low stock
  getLowStockProducts(threshold: number = 10): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/produits/`).pipe(
      map((data: any) => {
        const products = Array.isArray(data) ? data : (data.results || []);
        return products.filter((p: any) => p.stock <= threshold);
      })
    );
  }

  // Calculate total revenue from orders
  getTotalRevenue(): Observable<number> {
    return this.http.get<any>(`${this.baseUrl}/commandes/`).pipe(
      map((data: any) => {
        const orders = Array.isArray(data) ? data : (data.results || []);
        return orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
      })
    );
  }

  // Get top products by sales
  getTopProducts(limit: number = 5): Observable<TopProduct[]> {
    return this.http.get<any>(`${this.baseUrl}/produits/`).pipe(
      map((data: any) => {
        const products = Array.isArray(data) ? data : (data.results || []);
        // Sort by a hypothetical sales count field (will need to be implemented in backend)
        // For now, we'll return products and the component will handle the display
        return products.slice(0, limit).map((p: any) => ({
          id: p.id,
          nom: p.nom,
          categorie_nom: p.categorie_nom || p.categorie_detail?.nom || 'Non classé',
          ventes: 0, // Will need to be calculated from order items in backend
          total_revenue: 0
        }));
      })
    );
  }

  // Get KPI data
  getKPIs(): Observable<Kpi[]> {
    return this.http.get<Kpi[]>(`${this.baseUrl}/dashboard/kpi/`);
  }
}
