import {
  Component, OnInit, OnDestroy, HostListener,
  ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import {
  DashboardService, DashboardStats,
  WeeklySalesData, RecentOrder, TopProduct, Kpi
} from './dashboard.service';
import { Subscription } from 'rxjs';

interface Activity {
  message: string; time: string; icon: string; bg: string; color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, HeaderComponent, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {

  currentDate   = '';
  adminName     = 'Admin';
  totalRevenue  = 2458320;   // ✅ valeurs initiales = fallback immédiat
  totalOrders   = 1247;
  totalProducts = 3456;
  lowStockCount = 12;
  lowStockProducts: any[] = [];
  recentOrders:  RecentOrder[] = [];
  loading = false;           // ✅ false par défaut — les fallbacks sont déjà là
  error   = '';

  activeOrderMenu: string | null = null;

  // ✅ Toutes les animations désactivées — plus de clignotement
  cardAnimations = [true, true, true, true, true];

  chartBars: WeeklySalesData[] = [
    { label: 'Lun', real: 65, target: 75, value: '6.5k' },
    { label: 'Mar', real: 82, target: 70, value: '8.2k' },
    { label: 'Mer', real: 45, target: 60, value: '4.5k' },
    { label: 'Jeu', real: 91, target: 80, value: '9.1k' },
    { label: 'Ven', real: 73, target: 65, value: '7.3k' },
    { label: 'Sam', real: 56, target: 50, value: '5.6k' },
    { label: 'Dim', real: 38, target: 40, value: '3.8k' },
  ];

  selectedDateRange: '7d' | '30d' | '90d' | 'all' = '7d';
  dateRangeOptions = [
    { value: '7d',  label: '7 jours'  },
    { value: '30d', label: '30 jours' },
    { value: '90d', label: '90 jours' },
    { value: 'all', label: 'Tout'     }
  ];

  sparkRevenue  = [40, 55, 35, 70, 60, 85, 65];
  sparkOrders   = [30, 45, 50, 40, 65, 55, 75];
  sparkProducts = [60, 50, 70, 65, 80, 70, 90];

  kpis: Kpi[] = [
    { label: 'Panier moyen',      value: '38 500 FCFA', icon: 'bi-wallet2',     bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', trend: 5.2  },
    { label: 'Taux conversion',   value: '3.8%',        icon: 'bi-percent',     bg: 'rgba(34,197,94,0.12)',   color: '#4ade80', trend: 1.1  },
    { label: 'Clients actifs',    value: '8 942',       icon: 'bi-people-fill', bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', trend: 8.4  },
    { label: 'Délai livraison',   value: '36h',         icon: 'bi-truck',       bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', trend: -2.3 },
    { label: 'Taux satisfaction', value: '4.8/5',       icon: 'bi-star-fill',   bg: 'rgba(236,72,153,0.12)', color: '#f472b6', trend: 0    },
  ];

  activities: Activity[] = [
    { message: 'Nouvelle commande #ORD-128 reçue',         time: 'Il y a 2 min',  icon: 'bi-cart-check-fill',          bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
    { message: 'Stock critique : Pneu Michelin 205/55R16', time: 'Il y a 12 min', icon: 'bi-exclamation-triangle-fill', bg: 'rgba(239,68,68,0.12)',  color: '#f87171' },
    { message: 'Nouveau client inscrit : Awa Diop',        time: 'Il y a 28 min', icon: 'bi-person-plus-fill',         bg: 'rgba(34,197,94,0.12)',  color: '#4ade80' },
    { message: 'Commande #ORD-124 expédiée',               time: 'Il y a 1h',     icon: 'bi-truck',                    bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
    { message: 'Avis 5★ reçu sur Batterie Bosch 12V',      time: 'Il y a 2h',     icon: 'bi-star-fill',                bg: 'rgba(236,72,153,0.12)', color: '#f472b6' },
  ];

  topProducts: TopProduct[] = [
    { id: 1, nom: 'Pneu Michelin 205/55R16', categorie_nom: 'Pneumatiques', ventes: 248, pct: 100, icon: 'bi-circle-fill',  color: '#60a5fa' },
    { id: 2, nom: 'Batterie Bosch 12V',      categorie_nom: 'Électrique',   ventes: 196, pct: 79,  icon: 'bi-battery-full', color: '#4ade80' },
    { id: 3, nom: 'Huile Mobil 5W-30',       categorie_nom: 'Lubrifiants',  ventes: 172, pct: 69,  icon: 'bi-droplet-fill', color: '#fbbf24' },
    { id: 4, nom: 'Plaquettes Brembo',       categorie_nom: 'Freinage',     ventes: 134, pct: 54,  icon: 'bi-disc-fill',    color: '#a78bfa' },
    { id: 5, nom: 'Filtre à air K&N',        categorie_nom: 'Filtration',   ventes: 98,  pct: 40,  icon: 'bi-funnel-fill',  color: '#f472b6' },
  ];

  recentOrdersFallback: RecentOrder[] = [
    { id: '001', client: 'Ibrahima Diallo', produits: [1,2],   total: 45000, statut: 'validated' },
    { id: '002', client: 'Fatou Touré',     produits: [1],     total: 12000, statut: 'shipped'   },
    { id: '003', client: 'Moussa Ndiaye',   produits: [1,2,3], total: 78000, statut: 'pending'   },
    { id: '004', client: 'Aminata Ba',      produits: [1],     total: 65000, statut: 'validated' },
    { id: '005', client: 'Omar Sow',        produits: [1],     total: 8500,  statut: 'cancelled' },
  ];

  private subs = new Subscription();

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setCurrentDate();
    this.loadAdminName();

    // ✅ Données fallback affichées immédiatement — zéro clignotement
    this.recentOrders    = this.recentOrdersFallback;
    this.lowStockProducts = [
      { nom: 'Pneu Michelin 205/55R16', stock: 5,  seuil: 10 },
      { nom: 'Batterie Bosch 12V',      stock: 8,  seuil: 15 },
      { nom: 'Huile Mobil 5W-30',       stock: 12, seuil: 20 },
    ];

    // ✅ Tentative de chargement depuis l'API — silencieuse si 401
    this.tryLoadFromApi();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private loadAdminName(): void {
    const raw = localStorage.getItem('admin_user');
    if (raw) {
      try { this.adminName = JSON.parse(raw).prenom ?? 'Admin'; } catch { /**/ }
    }
  }

  setCurrentDate(): void {
    this.currentDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // ✅ Appels API silencieux — si 401, on garde les fallbacks sans re-render
  private tryLoadFromApi(): void {

    this.subs.add(
      this.dashboardService.getDashboardStats().subscribe({
        next: (stats: DashboardStats) => {
          this.totalRevenue  = stats.totalRevenue;
          this.totalOrders   = stats.totalCommandes;
          this.totalProducts = stats.totalProduits;
          this.lowStockCount = stats.stockFaible;
          this.cdr.markForCheck();
        },
        error: () => { /* 401 silencieux — garde les valeurs fallback */ }
      })
    );

    this.subs.add(
      this.dashboardService.getWeeklySales().subscribe({
        next: (data) => { this.chartBars = data; this.cdr.markForCheck(); },
        error: () => { /* silencieux */ }
      })
    );

    this.subs.add(
      this.dashboardService.getRecentOrders(5).subscribe({
        next: (orders) => { this.recentOrders = orders; this.cdr.markForCheck(); },
        error: () => { /* silencieux */ }
      })
    );

    this.subs.add(
      this.dashboardService.getLowStockProducts(10).subscribe({
        next: (products) => { this.lowStockProducts = products; this.cdr.markForCheck(); },
        error: () => { /* silencieux */ }
      })
    );

    this.subs.add(
      this.dashboardService.getTopProducts(5).subscribe({
        next: (products) => {
          const colors = ['#60a5fa','#4ade80','#fbbf24','#a78bfa','#f472b6'];
          const icons  = ['bi-circle-fill','bi-battery-full','bi-droplet-fill','bi-disc-fill','bi-funnel-fill'];
          const maxSales = Math.max(...products.map((p: any) => p.ventes || 0), 1);
          this.topProducts = products.map((p: any, i: number) => ({
            id: p.id, nom: p.nom,
            categorie_nom: p.categorie_nom || 'Non classé',
            ventes: p.ventes || 0,
            pct: Math.round(((p.ventes || 0) / maxSales) * 100),
            icon: icons[i % icons.length],
            color: colors[i % colors.length]
          }));
          this.cdr.markForCheck();
        },
        error: () => { /* silencieux */ }
      })
    );

    this.subs.add(
      this.dashboardService.getKPIs().subscribe({
        next: (kpis) => { this.kpis = kpis; this.cdr.markForCheck(); },
        error: () => { /* silencieux */ }
      })
    );
  }

  // Manuel uniquement — plus de polling automatique
  loadDashboardData(): void { this.tryLoadFromApi(); }

  onDateRangeChange(range: string): void {
    this.selectedDateRange = range as '7d' | '30d' | '90d' | 'all';
    this.tryLoadFromApi();
  }

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      shipped: 'shipped', pending: 'pending',
      validated: 'validated', cancelled: 'cancelled'
    };
    return map[statut] ?? 'pending';
  }

  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      shipped: 'Expédié', pending: 'En attente',
      validated: 'Validée', cancelled: 'Annulée'
    };
    return map[statut] ?? statut;
  }

  getStockPct(product: any): number {
    const seuil = product.seuil ?? product.stock_min ?? 20;
    return Math.min(100, Math.round((product.stock / seuil) * 100));
  }

  getStats() {
    const total    = this.recentOrders.length || 1;
    const enAttente = this.recentOrders.filter(o => o.statut === 'pending').length;
    const validees  = this.recentOrders.filter(o => o.statut === 'validated').length;
    const expediees = this.recentOrders.filter(o => o.statut === 'shipped').length;
    const annulees  = this.recentOrders.filter(o => o.statut === 'cancelled').length;
    return { total, enAttente, validees, expediees, annulees };
  }

  getArc(value: number, total: number): number {
    return total ? Math.round((value / total) * 251) : 0;
  }

  toggleOrderMenu(orderId: string): void {
    this.activeOrderMenu = this.activeOrderMenu === orderId ? null : orderId;
  }

  closeOrderMenu(): void { this.activeOrderMenu = null; }

  viewOrderDetails(order: RecentOrder): void  { console.log('View:', order);   this.closeOrderMenu(); }
  updateOrderStatus(order: RecentOrder): void { console.log('Update:', order); this.closeOrderMenu(); }
  printInvoice(order: RecentOrder): void      { console.log('Print:', order);  this.closeOrderMenu(); }

  deleteOrder(order: RecentOrder): void {
    if (confirm(`Supprimer la commande #ORD-${order.id} ?`)) {
      this.recentOrders = this.recentOrders.filter(o => o.id !== order.id);
      this.cdr.markForCheck();
      this.closeOrderMenu();
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.closeOrderMenu(); }
}