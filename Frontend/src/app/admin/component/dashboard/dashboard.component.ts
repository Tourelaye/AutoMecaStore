import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import {
  DashboardService,
  AdminDashboardData,
  Kpi,
  EvolutionVente,
  EvolutionCommande,
  EvolutionInscription,
  CategorieStat,
  RegionStat,
  ActiviteRecente,
  Alerte,
  MagasinItem,
  ProduitItem,
  CommandeItem,
  UtilisateurItem
} from './dashboard.service';
import { AuthService } from '../../../core/services/auth.service';

interface UiKpi extends Kpi {
  targetValue: number;
  displayValue: string;
  meta: string;
  variationClass: 'positive' | 'negative' | 'neutral';
}

interface GraphOption {
  key: 'ventes' | 'commandes' | 'inscriptions';
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatProgressBarModule, MatTabsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  adminName = '';
  todayLabel = '';
  lastUpdated = '';
  loading = true;
  error = '';

  data: AdminDashboardData = this.createEmptyData();
  kpis: UiKpi[] = [];

  graphOptions: GraphOption[] = [
    { key: 'ventes', label: 'Ventes (CA)', icon: 'bi-graph-up' },
    { key: 'commandes', label: 'Commandes', icon: 'bi-cart-check' },
    { key: 'inscriptions', label: 'Inscriptions', icon: 'bi-person-plus' }
  ];
  selectedGraph: GraphOption['key'] = 'ventes';

  readonly chartWidth = 700;
  readonly chartHeight = 220;
  chartPathD = '';
  chartAreaD = '';
  chartDashLength = 0;
  chartCoords: { x: number; y: number; value: number }[] = [];
  chartLabels: string[] = [];
  chartMax = 0;
  chartReady = false;

  raccourcis = [
    { label: 'Valider magasins', icon: 'bi-shop-window', route: '/admin/fournisseurs', color: 'primary' },
    { label: 'Voir commandes', icon: 'bi-cart-check', route: '/admin/commandes', color: '' },
    { label: 'Créer catégorie', icon: 'bi-tags', route: '/admin/categories', color: 'primary' },
    { label: 'Envoyer notification', icon: 'bi-bell', route: '/admin/notifications', color: 'accent' },
    { label: 'Journal / stats', icon: 'bi-graph-up-arrow', route: '/admin/journal', color: '' }
  ];

  readonly statutProduitMap: { [key: string]: { label: string; class: string } } = {
    en_attente: { label: 'En attente', class: 'status-warning' },
    approuve: { label: 'Approuvé', class: 'status-success' },
    rejete: { label: 'Rejeté', class: 'status-danger' }
  };

  readonly statutCommandeMap: { [key: string]: { label: string; class: string } } = {
    nouvelle_commande: { label: 'Nouvelle', class: 'status-info' },
    en_attente_confirmation: { label: 'Confirmation', class: 'status-warning' },
    acceptee: { label: 'Acceptée', class: 'status-success' },
    en_preparation: { label: 'Préparation', class: 'status-primary' },
    prete_a_retirer: { label: 'Prête', class: 'status-primary' },
    en_cours_livraison: { label: 'Livraison', class: 'status-primary' },
    livree: { label: 'Livrée', class: 'status-success' },
    terminee: { label: 'Terminée', class: 'status-success' },
    refusee: { label: 'Refusée', class: 'status-danger' },
    annulee: { label: 'Annulée', class: 'status-muted' }
  };

  readonly statutMagasinMap: { [key: string]: { label: string; class: string } } = {
    attente: { label: 'En attente', class: 'status-warning' },
    actif: { label: 'Actif', class: 'status-success' },
    desactive: { label: 'Suspendu', class: 'status-danger' }
  };

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

    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = '';
    this.chartReady = false;

    this.dashboardService.getDashboard().subscribe({
      next: data => {
        this.data = data;
        this.buildKpis(data.kpis);
        this.selectGraph(this.selectedGraph);
        this.lastUpdated = `Mis à jour à ${new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      },
      error: () => {
        this.error = 'Impossible de charger les données du tableau de bord.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
        setTimeout(() => {
          this.chartReady = true;
          this.animateKpis();
        }, 60);
      }
    });
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  private buildKpis(kpis: Kpi[]): void {
    this.kpis = kpis.map(k => ({
      ...k,
      targetValue: k.value,
      displayValue: this.formatValue(k, 0),
      meta: this.buildMeta(k),
      variationClass: k.variation > 0 ? 'positive' : k.variation < 0 ? 'negative' : 'neutral'
    }));
  }

  private formatValue(kpi: Kpi, value: number): string {
    const rounded = kpi.currency ? value : Math.round(value);
    const formatted = rounded.toLocaleString('fr-FR', {
      minimumFractionDigits: kpi.currency ? 2 : 0,
      maximumFractionDigits: kpi.currency ? 2 : 0
    });
    return kpi.currency ? `${formatted} FCFA` : formatted;
  }

  private buildMeta(kpi: Kpi): string {
    const sign = kpi.variation >= 0 ? '+' : '';
    const suffix = kpi.currency ? ' vs mois dernier' : ' vs période précédente';
    return `${sign}${kpi.variation.toFixed(1)}%${suffix}`;
  }

  private animateKpis(): void {
    const duration = 900;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      if (elapsed < 0) {
        requestAnimationFrame(step);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      for (const kpi of this.kpis) {
        const current = kpi.targetValue * eased;
        kpi.displayValue = this.formatValue(kpi, current);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  selectGraph(key: GraphOption['key']): void {
    this.selectedGraph = key;
    this.chartReady = false;

    let values: number[] = [];
    let labels: string[] = [];

    if (key === 'ventes') {
      values = this.data.evolution_ventes.map(v => v.ca);
      labels = this.data.evolution_ventes.map(v => v.mois);
    } else if (key === 'commandes') {
      values = this.data.evolution_commandes.map(v => v.commandes);
      labels = this.data.evolution_commandes.map(v => v.mois);
    } else {
      values = this.data.evolution_inscriptions.map(v => v.inscriptions);
      labels = this.data.evolution_inscriptions.map(v => v.mois);
    }

    this.chartLabels = labels;
    this.buildLineChart(values);

    setTimeout(() => {
      this.chartReady = true;
    }, 60);
  }

  private buildLineChart(values: number[]): void {
    if (!values.length) {
      this.chartCoords = [];
      this.chartPathD = '';
      this.chartAreaD = '';
      this.chartMax = 0;
      return;
    }

    const max = Math.max(...values) * 1.1 || 1;
    this.chartMax = max;
    const stepX = this.chartWidth / (values.length - 1);

    this.chartCoords = values.map((v, i) => ({
      x: Math.round(i * stepX),
      y: Math.round(this.chartHeight - (v / max) * this.chartHeight),
      value: v
    }));

    this.chartPathD = this.chartCoords
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    this.chartAreaD =
      this.chartPathD +
      ` L ${this.chartWidth} ${this.chartHeight} L 0 ${this.chartHeight} Z`;

    let length = 0;
    for (let i = 1; i < this.chartCoords.length; i++) {
      const dx = this.chartCoords[i].x - this.chartCoords[i - 1].x;
      const dy = this.chartCoords[i].y - this.chartCoords[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    this.chartDashLength = Math.ceil(length);
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '-';
    const now = new Date().getTime();
    const d = new Date(dateStr).getTime();
    const diff = Math.floor((now - d) / 1000);

    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} j`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  productStatus(statut: string): { label: string; class: string } {
    return this.statutProduitMap[statut] || { label: statut, class: 'status-muted' };
  }

  orderStatus(statut: string): { label: string; class: string } {
    return this.statutCommandeMap[statut] || { label: statut, class: 'status-muted' };
  }

  storeStatus(statut: string): { label: string; class: string } {
    return this.statutMagasinMap[statut] || { label: statut, class: 'status-muted' };
  }

  severityClass(severity: string): string {
    switch (severity) {
      case 'error': return 'alert-error';
      case 'warning': return 'alert-warning';
      case 'success': return 'alert-success';
      default: return 'alert-info';
    }
  }

  severityIcon(severity: string): string {
    switch (severity) {
      case 'error': return 'bi-exclamation-octagon-fill';
      case 'warning': return 'bi-exclamation-triangle-fill';
      case 'success': return 'bi-check-circle-fill';
      default: return 'bi-info-circle-fill';
    }
  }

  trackByKey(_index: number, item: UiKpi): string {
    return item.key;
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  private createEmptyData(): AdminDashboardData {
    return {
      kpis: [],
      evolution_ventes: [],
      evolution_commandes: [],
      evolution_inscriptions: [],
      repartition_categories: [],
      ventes_par_region: [],
      top_categories: [],
      activites_recentes: [],
      alertes: [],
      derniers_magasins: [],
      derniers_produits: [],
      dernieres_commandes: [],
      derniers_utilisateurs: []
    };
  }
}