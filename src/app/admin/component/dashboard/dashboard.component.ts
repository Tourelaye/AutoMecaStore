import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { DashboardService, DashboardStats, WeeklySalesData, RecentOrder } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  currentDate  = '';
  totalRevenue = 0;
  totalOrders  = 0;
  totalProducts = 0;
  lowStockCount = 0;
  lowStockProducts: any[] = [];
  recentOrders: RecentOrder[] = [];
  loading = true;
  error   = '';

  // Données graphique barres
  chartBars: WeeklySalesData[] = [];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.setCurrentDate();
    this.loadDashboardData();
  }

  setCurrentDate(): void {
    this.currentDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error   = '';

    this.dashboardService.getDashboardStats().subscribe({
      next: (stats: DashboardStats) => {
        this.totalRevenue  = stats.totalRevenue;
        this.totalOrders   = stats.totalCommandes;
        this.totalProducts = stats.totalProduits;
        this.lowStockCount = stats.stockFaible;
        this.loading = false;
      },
      error: () => {
        // Mock si l'API n'est pas disponible
        this.totalRevenue  = 2458320;
        this.totalOrders   = 1247;
        this.totalProducts = 3456;
        this.lowStockCount = 12;
        this.loading = false;
      }
    });

    // Load weekly sales data
    this.dashboardService.getWeeklySales().subscribe({
      next: (data: WeeklySalesData[]) => {
        this.chartBars = data;
      },
      error: () => {
        // Fallback to static data
        this.chartBars = [
          { label: 'Lun', real: 65, target: 75, value: '6.5k' },
          { label: 'Mar', real: 82, target: 70, value: '8.2k' },
          { label: 'Mer', real: 45, target: 60, value: '4.5k' },
          { label: 'Jeu', real: 91, target: 80, value: '9.1k' },
          { label: 'Ven', real: 73, target: 65, value: '7.3k' },
          { label: 'Sam', real: 56, target: 50, value: '5.6k' },
          { label: 'Dim', real: 38, target: 40, value: '3.8k' },
        ];
      }
    });

    this.dashboardService.getLowStockProducts(10).subscribe({
      next: (products) => { this.lowStockProducts = products; },
      error: () => {
        this.lowStockProducts = [
          { nom: 'Pneu Michelin 205/55R16', stock: 5,  seuil: 10 },
          { nom: 'Batterie Bosch 12V',      stock: 8,  seuil: 15 },
          { nom: 'Huile Mobil 5W-30',       stock: 12, seuil: 20 },
        ];
      }
    });

    this.dashboardService.getRecentOrders(5).subscribe({
      next: (orders) => { this.recentOrders = orders; },
      error: () => {
        this.recentOrders = [
          { id: '001', client: 'Ibrahima Diallo', produits: [1,2], total: 45000, statut: 'validated' },
          { id: '002', client: 'Fatou Touré',     produits: [1],   total: 12000, statut: 'shipped'   },
          { id: '003', client: 'Moussa Ndiaye',   produits: [1,2,3], total: 78000, statut: 'pending'  },
          { id: '004', client: 'Aminata Ba',      produits: [1],   total: 65000, statut: 'validated' },
          { id: '005', client: 'Omar Sow',        produits: [1],   total: 8500,  statut: 'cancelled' },
        ];
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      shipped:   'shipped',
      pending:   'pending',
      validated: 'validated',
      cancelled: 'cancelled'
    };
    return map[statut] ?? 'pending';
  }

  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      shipped:   'Expédié',
      pending:   'En attente',
      validated: 'Validée',
      cancelled: 'Annulée'
    };
    return map[statut] ?? statut;
  }

  getStockPct(product: any): number {
    const seuil = product.seuil ?? product.stock_min ?? 20;
    return Math.min(100, Math.round((product.stock / seuil) * 100));
  }
}