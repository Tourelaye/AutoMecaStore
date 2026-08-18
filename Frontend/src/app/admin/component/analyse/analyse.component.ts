import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { AnalyticsService } from '../../../core/services/analytics.service';
import { AnalyticsData, AnalyticsFilters, FilterOptions, EvolutionPoint, ProduitTop, MagasinTop, ClientTop, GeoVille } from '../../../models/analytics.model';

type ChartMetric = 'ca' | 'ventes' | 'commandes' | 'clients_nouveaux' | 'magasins_nouveaux' | 'produits_nouveaux';

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

interface LineChart {
  path: string;
  area: string;
  points: ChartPoint[];
  max: number;
  min: number;
  labels: string[];
}

@Component({
  selector: 'app-analyse',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule,
    MatProgressSpinnerModule, MatTabsModule, MatTableModule, MatIconModule,
    MatTooltipModule, MatChipsModule
  ],
  templateUrl: './analyse.component.html',
  styleUrls: ['./analyse.component.css']
})
export class AnalyseComponent implements OnInit {

  filters: AnalyticsFilters = { period: 'month' };
  data: AnalyticsData | null = null;
  options: FilterOptions = { magasins: [], categories: [], villes: [] };
  loading = false;
  loadingOptions = false;
  error = '';
  lastUpdated = '';

  activeTab = 0;

  chartMetric: ChartMetric = 'ca';
  readonly chartOptions: { key: ChartMetric; label: string; icon: string; color: string }[] = [
    { key: 'ca', label: 'Chiffre d\'affaires', icon: 'bi-cash-coin', color: '#38bdf8' },
    { key: 'ventes', label: 'Ventes', icon: 'bi-box-seam', color: '#4ade80' },
    { key: 'commandes', label: 'Commandes', icon: 'bi-cart-check', color: '#fbbf24' },
    { key: 'clients_nouveaux', label: 'Nouveaux clients', icon: 'bi-person-plus', color: '#c084fc' },
    { key: 'magasins_nouveaux', label: 'Nouveaux magasins', icon: 'bi-shop', color: '#f472b6' },
    { key: 'produits_nouveaux', label: 'Nouveaux produits', icon: 'bi-box', color: '#22d3ee' },
  ];

  chart: LineChart | null = null;
  hoveredPoint: ChartPoint | null = null;
  tooltipX = 0;
  tooltipY = 0;

  readonly svgWidth = 900;
  readonly svgHeight = 260;
  readonly pad = { top: 20, right: 24, bottom: 40, left: 60 };

  readonly displayedProductColumns = ['position', 'nom', 'quantite', 'ca', 'prix'];
  readonly displayedMagasinColumns = ['position', 'nom', 'ca', 'commandes', 'note'];
  readonly displayedClientColumns = ['position', 'nom', 'ca', 'commandes'];

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.loadOptions();
    this.loadAnalytics();
  }

  loadOptions(): void {
    this.loadingOptions = true;
    this.analyticsService.getFilterOptions().subscribe({
      next: (res) => { this.options = res; this.loadingOptions = false; },
      error: () => { this.loadingOptions = false; }
    });
  }

  loadAnalytics(): void {
    this.loading = true;
    this.error = '';
    this.analyticsService.getAnalytics(this.filters).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.lastUpdated = new Date().toLocaleString('fr-FR');
        this.buildChart();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Erreur lors du chargement des analyses.';
      }
    });
  }

  onPeriodChange(): void {
    // Reset custom range if not custom
    if (this.filters.period !== 'custom') {
      this.filters.start = undefined;
      this.filters.end = undefined;
    }
    this.loadAnalytics();
  }

  onFilterChange(): void {
    this.loadAnalytics();
  }

  selectMetric(metric: ChartMetric): void {
    this.chartMetric = metric;
    this.buildChart();
  }

  exportFile(format: 'csv' | 'excel' | 'pdf'): void {
    this.analyticsService.export(format, this.filters).subscribe({
      next: (blob) => this.downloadBlob(blob, `automeca-analyse.${format === 'excel' ? 'xlsx' : format}`),
      error: () => this.error = 'Erreur lors de l\'export.'
    });
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  buildChart(): void {
    if (!this.data?.evolutions?.length) {
      this.chart = null;
      return;
    }
    const evol = this.data.evolutions;
    const metric = this.chartMetric;
    const values = evol.map(d => (d as any)[metric] as number);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    const innerW = this.svgWidth - this.pad.left - this.pad.right;
    const innerH = this.svgHeight - this.pad.top - this.pad.bottom;
    const n = evol.length;
    const step = n > 1 ? innerW / (n - 1) : innerW;

    const points: ChartPoint[] = [];
    const pathPts: string[] = [];
    for (let i = 0; i < n; i++) {
      const v = values[i];
      const x = this.pad.left + i * step;
      const y = this.pad.top + innerH - ((v - min) / range) * innerH;
      points.push({ x, y, value: v, label: evol[i].label });
      pathPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    const area = `${pathPts.join(' ')} L ${(this.pad.left + (n - 1) * step).toFixed(1)} ${this.pad.top + innerH} L ${this.pad.left} ${this.pad.top + innerH} Z`;

    this.chart = {
      path: pathPts.join(' '),
      area,
      points,
      max,
      min,
      labels: evol.map(e => e.label)
    };
  }

  onPointHover(event: MouseEvent, point: ChartPoint): void {
    this.hoveredPoint = point;
    this.tooltipX = event.clientX;
    this.tooltipY = event.clientY - 12;
  }

  onPointLeave(): void {
    this.hoveredPoint = null;
  }

  metricColor(): string {
    return this.chartOptions.find(o => o.key === this.chartMetric)?.color || '#38bdf8';
  }

  metricLabel(): string {
    return this.chartOptions.find(o => o.key === this.chartMetric)?.label || '';
  }

  formatMoney(value?: number): string {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  }

  formatNumber(value?: number): string {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat('fr-FR').format(Math.round(value));
  }

  formatPercent(value?: number): string {
    if (value === undefined || value === null) return '—';
    return `${value}%`;
  }

  variationClass(value?: number): string {
    if (!value) return 'neutral';
    return value > 0 ? 'positive' : 'negative';
  }

  yAxisTicks(): number[] {
    if (!this.chart) return [];
    const ticks = 5;
    const arr: number[] = [];
    for (let i = 0; i <= ticks; i++) {
      arr.push(this.chart.min + (this.chart.max - this.chart.min) * (i / ticks));
    }
    return arr.reverse();
  }

  yTickValue(v: number): string {
    return this.chartMetric === 'ca' ? this.formatMoney(v) : this.formatNumber(v);
  }

  donutGradient(items: { value: number; color: string }[]): string {
    const total = items.reduce((sum, i) => sum + i.value, 0) || 1;
    let deg = 0;
    const parts: string[] = [];
    for (const item of items) {
      const next = deg + (item.value / total) * 360;
      parts.push(`${item.color} ${deg}deg ${next}deg`);
      deg = next;
    }
    return `conic-gradient(${parts.join(', ')})`;
  }

  geoItems(): { value: number; color: string; label: string }[] {
    if (!this.data?.geographie?.commandes_par_ville?.length) return [];
    const colors = ['#38bdf8', '#4ade80', '#fbbf24', '#f87171', '#c084fc', '#22d3ee', '#f472b6', '#94a3b8', '#10b981', '#60a5fa'];
    return this.data.geographie.commandes_par_ville.slice(0, 10).map((g, i) => ({
      value: g.commandes || 0,
      color: colors[i % colors.length],
      label: g.ville
    }));
  }

  alertIcon(severity: string): string {
    switch (severity) {
      case 'success': return 'bi-check-circle';
      case 'info': return 'bi-info-circle';
      case 'warning': return 'bi-exclamation-triangle';
      case 'error': return 'bi-x-octagon';
      default: return 'bi-info-circle';
    }
  }
}
