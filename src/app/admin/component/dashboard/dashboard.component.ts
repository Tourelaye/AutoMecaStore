import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { DashboardService, DashboardStats, WeeklySalesData, RecentOrder, TopProduct, Kpi } from './dashboard.service';
import { interval, Subscription } from 'rxjs';

interface Activity {
  message: string; time: string; icon: string;
  bg: string; color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {

  currentDate   = '';
  adminName     = 'Admin';
  totalRevenue  = 0;
  totalOrders   = 0;
  totalProducts = 0;
  lowStockCount = 0;
  lowStockProducts: any[] = [];
  recentOrders: RecentOrder[] = [];
  loading = true;
  error   = '';

  activeOrderMenu: string | null = null;

  chartBars: WeeklySalesData[] = [];

  // Real-time polling
  private pollingSubscription: Subscription | null = null;
  private readonly POLLING_INTERVAL = 30000; // 30 seconds

  // Date range filtering
  selectedDateRange: '7d' | '30d' | '90d' | 'all' = '7d';
  dateRangeOptions = [
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
    { value: '90d', label: '90 jours' },
    { value: 'all', label: 'Tout' }
  ];

  // Animation states
  isAnimating = false;
  cardAnimations = [false, false, false, false, false];

  // Mini sparklines pour les stats cards (valeurs en %)
  sparkRevenue  = [40, 55, 35, 70, 60, 85, 65];
  sparkOrders   = [30, 45, 50, 40, 65, 55, 75];
  sparkProducts = [60, 50, 70, 65, 80, 70, 90];

  // KPI band
  kpis: Kpi[] = [
    { label: 'Panier moyen',      value: '38 500 FCFA', icon: 'bi-wallet2',         bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', trend: 5.2  },
    { label: 'Taux conversion',   value: '3.8%',         icon: 'bi-percent',         bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', trend: 1.1  },
    { label: 'Clients actifs',    value: '8 942',        icon: 'bi-people-fill',     bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', trend: 8.4  },
    { label: 'Délai livraison',   value: '36h',          icon: 'bi-truck',           bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', trend: -2.3 },
    { label: 'Taux satisfaction', value: '4.8/5',         icon: 'bi-star-fill',       bg: 'rgba(236,72,153,0.12)', color: '#f472b6', trend: 0   },
  ];

  // Activité récente
  activities: Activity[] = [
    { message: 'Nouvelle commande #ORD-128 reçue',          time: 'Il y a 2 min',  icon: 'bi-cart-check-fill',         bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
    { message: 'Stock critique : Pneu Michelin 205/55R16',  time: 'Il y a 12 min', icon: 'bi-exclamation-triangle-fill', bg: 'rgba(239,68,68,0.12)',  color: '#f87171' },
    { message: 'Nouveau client inscrit : Awa Diop',         time: 'Il y a 28 min', icon: 'bi-person-plus-fill',        bg: 'rgba(34,197,94,0.12)',  color: '#4ade80' },
    { message: 'Commande #ORD-124 expédiée',                time: 'Il y a 1h',     icon: 'bi-truck',                   bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
    { message: 'Avis 5★ reçu sur Batterie Bosch 12V',        time: 'Il y a 2h',     icon: 'bi-star-fill',               bg: 'rgba(236,72,153,0.12)', color: '#f472b6' },
  ];

  // Top produits
  topProducts: TopProduct[] = [
    { id: 1, nom: 'Pneu Michelin 205/55R16', categorie: 'Pneumatiques', categorie_nom: 'Pneumatiques', ventes: 248, pct: 100, icon: 'bi-circle-fill',       color: '#60a5fa' },
    { id: 2, nom: 'Batterie Bosch 12V',      categorie: 'Électrique',   categorie_nom: 'Électrique',   ventes: 196, pct: 79,  icon: 'bi-battery-full',       color: '#4ade80' },
    { id: 3, nom: 'Huile Mobil 5W-30',       categorie: 'Lubrifiants',  categorie_nom: 'Lubrifiants',  ventes: 172, pct: 69,  icon: 'bi-droplet-fill',       color: '#fbbf24' },
    { id: 4, nom: 'Plaquettes Brembo',       categorie: 'Freinage',     categorie_nom: 'Freinage',     ventes: 134, pct: 54,  icon: 'bi-disc-fill',          color: '#a78bfa' },
    { id: 5, nom: 'Filtre à air K&N',        categorie: 'Filtration',   categorie_nom: 'Filtration',   ventes: 98,  pct: 40,  icon: 'bi-funnel-fill',        color: '#f472b6' },
  ];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.setCurrentDate();
    this.loadAdminName();
    this.loadDashboardData();
    this.startPolling();
    this.triggerCardAnimations();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private loadAdminName(): void {
    const raw = localStorage.getItem('admin_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        this.adminName = u.prenom ?? 'Admin';
      } catch { /* défaut */ }
    }
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
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
        this.totalRevenue  = 2458320;
        this.totalOrders   = 1247;
        this.totalProducts = 3456;
        this.lowStockCount = 12;
        this.loading = false;
        this.error = 'Erreur lors du chargement des statistiques';
      }
    });

    this.dashboardService.getWeeklySales().subscribe({
      next: (data: WeeklySalesData[]) => {
        this.chartBars = data;
      },
      error: (err) => {
        console.error('Error loading weekly sales:', err);
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
      next: (products) => {
        this.lowStockProducts = products;
      },
      error: (err) => {
        console.error('Error loading low stock products:', err);
        this.lowStockProducts = [
          { nom: 'Pneu Michelin 205/55R16', stock: 5,  seuil: 10 },
          { nom: 'Batterie Bosch 12V',      stock: 8,  seuil: 15 },
          { nom: 'Huile Mobil 5W-30',       stock: 12, seuil: 20 },
        ];
      }
    });

    this.dashboardService.getRecentOrders(5).subscribe({
      next: (orders) => {
        this.recentOrders = orders;
      },
      error: (err) => {
        console.error('Error loading recent orders:', err);
        this.recentOrders = [
          { id: '001', client: 'Ibrahima Diallo', produits: [1,2], total: 45000, statut: 'validated' },
          { id: '002', client: 'Fatou Touré',     produits: [1],   total: 12000, statut: 'shipped'   },
          { id: '003', client: 'Moussa Ndiaye',   produits: [1,2,3], total: 78000, statut: 'pending'  },
          { id: '004', client: 'Aminata Ba',      produits: [1],   total: 65000, statut: 'validated' },
          { id: '005', client: 'Omar Sow',        produits: [1],   total: 8500,  statut: 'cancelled' },
        ];
      }
    });

    this.dashboardService.getTopProducts(5).subscribe({
      next: (products) => {
        // Map API products to display format with icons and colors
        const colors = ['#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#f472b6'];
        const icons = ['bi-circle-fill', 'bi-battery-full', 'bi-droplet-fill', 'bi-disc-fill', 'bi-funnel-fill'];
        
        this.topProducts = products.map((p, index) => ({
          id: p.id,
          nom: p.nom,
          categorie: p.categorie_nom || p.categorie || 'Non classé',
          categorie_nom: p.categorie_nom || p.categorie || 'Non classé',
          ventes: p.ventes || 0,
          pct: 0, // Will be calculated based on max sales
          icon: icons[index % icons.length],
          color: colors[index % colors.length]
        }));
        
        // Calculate percentages based on max sales
        const maxSales = Math.max(...this.topProducts.map(p => p.ventes), 1);
        this.topProducts = this.topProducts.map(p => ({
          ...p,
          pct: Math.round((p.ventes / maxSales) * 100)
        }));
      },
      error: (err) => {
        console.error('Error loading top products:', err);
        // Keep hardcoded fallback data
      }
    });

    this.dashboardService.getKPIs().subscribe({
      next: (kpis) => {
        this.kpis = kpis;
      },
      error: (err) => {
        console.error('Error loading KPIs:', err);
        // Keep hardcoded fallback data
      }
    });
  }

  // ── Real-time polling ────────────────────────────────────────────────────────

  private startPolling(): void {
    this.pollingSubscription = interval(this.POLLING_INTERVAL).subscribe(() => {
      this.loadDashboardData();
    });
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  // ── Animations ───────────────────────────────────────────────────────────────

  private triggerCardAnimations(): void {
    this.cardAnimations = [false, false, false, false, false];
    setTimeout(() => {
      this.cardAnimations.forEach((_, index) => {
        setTimeout(() => {
          this.cardAnimations[index] = true;
        }, index * 100);
      });
    }, 100);
  }

  // ── Date range filtering ───────────────────────────────────────────────────────

  onDateRangeChange(range: string): void {
    this.selectedDateRange = range as '7d' | '30d' | '90d' | 'all';
    this.loadDashboardData();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      shipped: 'shipped', pending: 'pending', validated: 'validated', cancelled: 'cancelled'
    };
    return map[statut] ?? 'pending';
  }

  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      shipped: 'Expédié', pending: 'En attente', validated: 'Validée', cancelled: 'Annulée'
    };
    return map[statut] ?? statut;
  }

  getStockPct(product: any): number {
    const seuil = product.seuil ?? product.stock_min ?? 20;
    return Math.min(100, Math.round((product.stock / seuil) * 100));
  }

  // Stats pour le donut chart de répartition des commandes
  getStats(): { total: number; enAttente: number; validees: number; expediees: number; annulees: number } {
    const enAttente = this.recentOrders.filter(o => o.statut === 'pending').length;
    const validees  = this.recentOrders.filter(o => o.statut === 'validated').length;
    const expediees = this.recentOrders.filter(o => o.statut === 'shipped').length;
    const annulees  = this.recentOrders.filter(o => o.statut === 'cancelled').length;
    return {
      total: this.recentOrders.length || 1,
      enAttente, validees, expediees, annulees
    };
  }

  // Calcule la longueur d'arc du donut (circonférence = 251 pour r=40)
  getArc(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 251);
  }

  // ── Order Actions ────────────────────────────────────────────────────────
  toggleOrderMenu(orderId: string): void {
    this.activeOrderMenu = this.activeOrderMenu === orderId ? null : orderId;
  }

  closeOrderMenu(): void {
    this.activeOrderMenu = null;
  }

  viewOrderDetails(order: RecentOrder): void {
    console.log('View order details:', order);
    this.closeOrderMenu();
  }

  updateOrderStatus(order: RecentOrder): void {
    console.log('Update order status:', order);
    this.closeOrderMenu();
  }

  printInvoice(order: RecentOrder): void {
    console.log('Print invoice:', order);
    this.closeOrderMenu();
  }

  deleteOrder(order: RecentOrder): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la commande #ORD-${order.id} ?`)) {
      console.log('Delete order:', order);
      this.recentOrders = this.recentOrders.filter(o => o.id !== order.id);
      this.closeOrderMenu();
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeOrderMenu();
  }
}