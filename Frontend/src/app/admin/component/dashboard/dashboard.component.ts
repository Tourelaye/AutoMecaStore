import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DashboardService,
  DashboardStats,
  CategorySales,
  TopFournisseur,
  TopProduit
} from './dashboard.service';
import { AuthService } from '../../../core/services/auth.service';

type Variant = 'default' | 'success' | 'warning' | 'danger';

interface StatCard {
  key: string;
  label: string;
  icon: string;
  variant: Variant;
  targetValue: number;
  decimals: number;
  suffix: string;
  displayValue: string;
  meta: string;
  metaVariant: Variant | 'muted';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  adminName = '';

  todayLabel = '';
  periods = ['7 jours', '30 jours', '90 jours', 'Tout'];
  selectedPeriod = '7 jours';

  loading = true;
  refreshing = false;
  lastUpdatedLabel = '';
  stats: DashboardStats = this.createEmptyStats();
  statCards: StatCard[] = [];
  categories: CategorySales[] = [];
  topFournisseurs: TopFournisseur[] = [];
  topProduits: TopProduit[] = [];

  // --- Graphique SVG (aucune dépendance externe) ---
  readonly chartWidth = 700;
  readonly chartHeight = 220;
  chartPointsAttr = '';
  chartPathD = '';
  chartAreaD = '';
  chartDashLength = 0;
  chartCoords: { x: number; y: number }[] = [];
  chartLabels: string[] = [];
  chartReady = false;
  categoriesReady = false;

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.adminName = user ? `${user.prenom} ${user.nom}`.trim() : 'Admin';

    this.todayLabel = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    this.loadDashboard(this.selectedPeriod);
  }

  selectPeriod(period: string): void {
    if (this.selectedPeriod === period) {
      return;
    }

    this.selectedPeriod = period;
    this.loadDashboard(period);
  }

  refreshDashboard(): void {
    this.loadDashboard(this.selectedPeriod);
  }

  private loadDashboard(period: string): void {
    this.loading = true;
    this.refreshing = true;
    this.chartReady = false;
    this.categoriesReady = false;

    this.dashboardService.getStats(period).subscribe({
      next: stats => {
        this.stats = stats;
        this.categories = stats.categories;
        this.topFournisseurs = stats.topFournisseurs;
        this.topProduits = stats.topProduits;
        this.buildStatCards(stats);
        this.buildChart(stats.chart.map(p => p.value));
        this.chartLabels = stats.chart.map(p => p.label);
        this.lastUpdatedLabel = `Dernière mise à jour : ${new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      },
      complete: () => {
        this.loading = false;
        this.refreshing = false;

        setTimeout(() => {
          this.chartReady = true;
          this.categoriesReady = true;
          this.statCards.forEach((card, i) => this.animateCard(card, i));
        }, 60);
      },
      error: () => {
        this.loading = false;
        this.refreshing = false;
      }
    });
  }

  private buildStatCards(s: DashboardStats): void {
    this.statCards = [
      {
        key: 'ca', label: 'CA Cumulé', icon: 'currency', variant: 'default',
        targetValue: s.caCumule, decimals: 2, suffix: ' €',
        displayValue: '0,00 €', meta: `Commissions : ${s.commissions.toFixed(2).replace('.', ',')} €`, metaVariant: 'success'
      },
      {
        key: 'fournisseurs', label: 'Fournisseurs', icon: 'users', variant: 'default',
        targetValue: s.fournisseursTotal, decimals: 0, suffix: ' total',
        displayValue: '0', meta: `${s.fournisseursActifs} Actifs | ${s.fournisseursAttente} Attente`, metaVariant: 'success'
      },
      {
        key: 'clients', label: 'Clients', icon: 'user', variant: 'default',
        targetValue: s.clientsTotal, decimals: 0, suffix: '',
        displayValue: '0', meta: '+ Inscriptions stables', metaVariant: 'muted'
      },
      {
        key: 'produits', label: 'Total Produits', icon: 'box', variant: 'default',
        targetValue: s.produitsTotal, decimals: 0, suffix: '',
        displayValue: '0', meta: `${s.produitsActifs} Actifs en ligne`, metaVariant: 'warning'
      },
      {
        key: 'validation', label: 'Attente Validation', icon: 'check', variant: 'warning',
        targetValue: s.attenteValidation, decimals: 0, suffix: '',
        displayValue: '0', meta: `Validation requise d'urgence`, metaVariant: 'warning'
      },
      {
        key: 'commandes', label: 'Commandes Jour', icon: 'cart', variant: 'default',
        targetValue: s.commandesJour, decimals: 0, suffix: '',
        displayValue: '0', meta: `Mois en cours : ${s.commandesMois}`, metaVariant: 'muted'
      },
      {
        key: 'reclamations', label: 'Réclamations', icon: 'alert', variant: 'danger',
        targetValue: s.reclamationsActives, decimals: 0, suffix: ' actives',
        displayValue: '0', meta: 'Litiges à arbitrer', metaVariant: 'danger'
      },
      {
        key: 'ruptures', label: 'Ruptures Stock', icon: 'warning', variant: 'warning',
        targetValue: s.rupturesStock, decimals: 0, suffix: '',
        displayValue: '0', meta: 'Alerte réapprovisionnement', metaVariant: 'warning'
      },
      {
        key: 'signales', label: 'Produits Signalés', icon: 'flag', variant: 'danger',
        targetValue: s.produitsSignales, decimals: 0, suffix: '',
        displayValue: '0', meta: 'Incompatibilité / non-conforme', metaVariant: 'danger'
      },
      {
        key: 'suspendus', label: 'Fourn. Suspendus', icon: 'block', variant: 'danger',
        targetValue: s.fournisseursSuspendus, decimals: 0, suffix: '',
        displayValue: '0', meta: 'Modération de sécurité', metaVariant: 'danger'
      }
    ];
  }

  /** Anime un compteur de 0 vers sa valeur cible avec un easing doux. */
  private animateCard(card: StatCard, index: number): void {
    const duration = 900;
    const start = performance.now() + index * 60; // léger décalage en cascade
    const target = card.targetValue;

    const step = (now: number) => {
      const elapsed = now - start;
      if (elapsed < 0) {
        requestAnimationFrame(step);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = target * eased;
      card.displayValue = this.formatNumber(current, card.decimals) + card.suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  private formatNumber(value: number, decimals: number): string {
    return value.toLocaleString('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /** Calcule les coordonnées SVG et les chemins (ligne + zone) du graphique de CA. */
  private buildChart(values: number[]): void {
    if (!values.length) {
      this.chartCoords = [];
      this.chartPathD = '';
      this.chartAreaD = '';
      this.chartDashLength = 0;
      return;
    }

    const max = Math.max(...values) * 1.1;
    const stepX = this.chartWidth / (values.length - 1);

    this.chartCoords = values.map((v, i) => ({
      x: Math.round(i * stepX),
      y: Math.round(this.chartHeight - (v / max) * this.chartHeight)
    }));

    this.chartPathD = this.chartCoords
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    this.chartAreaD =
      this.chartPathD +
      ` L ${this.chartWidth} ${this.chartHeight} L 0 ${this.chartHeight} Z`;

    // Longueur approximative du tracé, utilisée pour l'animation de "dessin" du trait
    let length = 0;
    for (let i = 1; i < this.chartCoords.length; i++) {
      const dx = this.chartCoords[i].x - this.chartCoords[i - 1].x;
      const dy = this.chartCoords[i].y - this.chartCoords[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    this.chartDashLength = Math.ceil(length);
  }

  private createEmptyStats(): DashboardStats {
    return {
      caCumule: 0,
      commissions: 0,
      fournisseursTotal: 0,
      fournisseursActifs: 0,
      fournisseursAttente: 0,
      clientsTotal: 0,
      produitsTotal: 0,
      produitsActifs: 0,
      attenteValidation: 0,
      commandesJour: 0,
      commandesMois: 0,
      reclamationsActives: 0,
      rupturesStock: 0,
      produitsSignales: 0,
      fournisseursSuspendus: 0,
      commissionRate: '0%',
      evolutionPct: 0,
      categories: [],
      chart: [],
      topFournisseurs: [],
      topProduits: []
    };
  }

  trackByKey(_index: number, item: StatCard): string {
    return item.key;
  }
}