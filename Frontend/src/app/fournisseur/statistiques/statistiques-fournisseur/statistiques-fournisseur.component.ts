import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FournisseurService, FournisseurStats } from '../../services/fournisseur.service';

type Periode = 'week' | 'month' | 'quarter' | 'year';

interface SeriePoint {
  label: string;
  valeur: number;
  precedent: number;
}

interface CategorieVente {
  label: string;
  valeur: number;
  pct: number;
  color: string;
}

interface TopProduit {
  nom: string;
  categorie: string;
  ventes: number;
  ca: number;
}

interface JourPerformance {
  jour: number;
  valeur: number; // 0 à 100, intensité
  montant: number;
}

interface KpiCard {
  label: string;
  valeur: string;
  trend: number;
  icon: string;
  color: 'accent' | 'gold' | 'info' | 'violet';
}

@Component({
  selector: 'app-statistiques-fournisseur',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistiques-fournisseur.component.html',
  styleUrls: ['./statistiques-fournisseur.component.css']
})
export class StatistiquesFournisseurComponent implements OnInit {

  constructor(private fournisseurService: FournisseurService) {}

  periods: Periode[] = ['week', 'month', 'quarter', 'year'];
  selectedPeriod: Periode = 'month';
  comparerPeriodePrecedente = true;

  kpis: KpiCard[] = [];
  caSeries: SeriePoint[] = [];
  commandesSeries: SeriePoint[] = [];
  categories: CategorieVente[] = [];
  topProduits: TopProduit[] = [];
  performanceMensuelle: JourPerformance[] = [];

  error: string | null = null;

  noteMoyenne = 4.7;
  totalAvis = 312;
  satisfactionRepartition = [
    { etoiles: 5, pct: 68 },
    { etoiles: 4, pct: 22 },
    { etoiles: 3, pct: 7 },
    { etoiles: 2, pct: 2 },
    { etoiles: 1, pct: 1 }
  ];

  // Dimensions du graphique CA (SVG)
  chartW = 600;
  chartH = 200;
  chartPad = 12;

  ngOnInit(): void {
    this.chargerDonnees();
  }

  onPeriodChange(period: Periode): void {
    this.selectedPeriod = period;
    this.chargerDonnees();
  }

  toggleComparaison(): void {
    this.comparerPeriodePrecedente = !this.comparerPeriodePrecedente;
  }

  // =============================================
  // CHARGEMENT / GÉNÉRATION DES DONNÉES
  // TODO: remplacer par de vrais appels API selon selectedPeriod
  // =============================================
  private chargerDonnees(): void {
    // Appel API centralisé pour récupérer les statistiques
    this.fournisseurService.getStatistics().subscribe({
      next: (s: FournisseurStats) => {
        // Mapper valeurs basiques
        this.noteMoyenne = (s as any)['note_moyenne'] ?? this.noteMoyenne;
        this.totalAvis = (s as any)['nombre_avis'] ?? this.totalAvis;

        // KPIs principaux
        const ca = s.chiffreAffaires ?? 0;
        const commandes = s.commandesMois ?? 0;
        const panierMoyen = commandes > 0 ? Math.round(ca / commandes) : 0;

        this.kpis = [
          { label: "Chiffre d'affaires", valeur: this.formatPrix(ca), trend: 0, icon: 'bi-currency-dollar', color: 'accent' },
          { label: 'Commandes', valeur: `${commandes}`, trend: 0, icon: 'bi-cart3', color: 'info' },
          { label: 'Panier moyen', valeur: this.formatPrix(panierMoyen), trend: 0, icon: 'bi-basket3', color: 'gold' },
          { label: 'Note moyenne', valeur: this.noteMoyenne.toFixed(1) + ' / 5', trend: 0, icon: 'bi-star-fill', color: 'violet' }
        ];

        // Séries CA / commandes: fallback distribution si l'API ne fournit pas de série
        const labels = this.getLabelsForPeriod(this.selectedPeriod);
        this.caSeries = labels.map((label) => ({ label, valeur: Math.round(ca / Math.max(1, labels.length)), precedent: Math.round((ca * 0.85) / Math.max(1, labels.length)) }));
        this.commandesSeries = labels.map((label) => ({ label, valeur: Math.round(commandes / Math.max(1, labels.length)), precedent: Math.max(0, Math.round((commandes * 0.9) / Math.max(1, labels.length))) }));

        // Catégories / top produits : si fournis par l'API utilisez-les
        if ((s as any).categories) {
          this.categories = (s as any).categories.map((c: any) => ({ label: c.label, valeur: c.valeur, pct: c.pct ?? c.valeur, color: c.color ?? 'var(--info)' }));
        }
        if ((s as any).topProduits) {
          this.topProduits = (s as any).topProduits;
        }

        // Performance mensuelle : si exposée, mappez sinon initialisez vide
        if ((s as any).performanceMensuelle) {
          this.performanceMensuelle = (s as any).performanceMensuelle;
        } else {
          this.performanceMensuelle = [];
        }
      },
      error: (err: any) => {
        console.error('Erreur chargement statistiques fournisseur:', err);
        this.error = 'Impossible de charger les statistiques';
      }
    });
  }

  private getLabelsForPeriod(period: Periode): string[] {
    if (period === 'week') {
      return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    }
    if (period === 'month') {
      return Array.from({ length: 10 }, (_, i) => `${(i * 3) + 1}`);
    }
    if (period === 'quarter') {
      return ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8', 'Sem 9', 'Sem 10', 'Sem 11', 'Sem 12', 'Sem 13'];
    }
    return ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  }

  private calcTrend(actuel: number, precedent: number): number {
    if (precedent === 0) {
      return 0;
    }
    return Math.round(((actuel - precedent) / precedent) * 1000) / 10;
  }

  // =============================================
  // GRAPHIQUE CA — génération du SVG (line + area)
  // =============================================
  private scaleX(i: number, n: number): number {
    return this.chartPad + (i * (this.chartW - this.chartPad * 2)) / (n - 1);
  }

  private scaleY(valeur: number, max: number): number {
    const usable = this.chartH - this.chartPad * 2;
    return this.chartH - this.chartPad - (valeur / max) * usable;
  }

  get caMax(): number {
    if (!this.caSeries.length) {
      return 1;
    }
    const all = this.caSeries.flatMap(p => [p.valeur, p.precedent]);
    return Math.max(...all) * 1.1;
  }

  getLinePoints(key: 'valeur' | 'precedent'): string {
    const n = this.caSeries.length;
    return this.caSeries
      .map((p, i) => `${this.scaleX(i, n)},${this.scaleY(p[key], this.caMax)}`)
      .join(' ');
  }

  getAreaPath(): string {
    const n = this.caSeries.length;
    if (!n) {
      return '';
    }
    const base = this.chartH - this.chartPad;
    const points = this.caSeries.map((p, i) => `${this.scaleX(i, n)},${this.scaleY(p.valeur, this.caMax)}`);
    return `M ${this.scaleX(0, n)},${base} L ${points.join(' L ')} L ${this.scaleX(n - 1, n)},${base} Z`;
  }

  getPointsCoords(key: 'valeur' | 'precedent'): { x: number; y: number; valeur: number; label: string }[] {
    const n = this.caSeries.length;
    return this.caSeries.map((p, i) => ({
      x: this.scaleX(i, n),
      y: this.scaleY(p[key], this.caMax),
      valeur: p[key],
      label: p.label
    }));
  }

  // =============================================
  // DONUT CATÉGORIES
  // =============================================
  get donutGradient(): string {
    let cumulative = 0;
    const segments = this.categories.map(c => {
      const start = cumulative;
      cumulative += c.pct;
      return `${c.color} ${start}% ${cumulative}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }

  // =============================================
  // BAR CHART COMMANDES
  // =============================================
  get commandesMax(): number {
    if (!this.commandesSeries.length) {
      return 1;
    }
    return Math.max(...this.commandesSeries.map(p => p.valeur)) * 1.15;
  }

  getBarPct(valeur: number): number {
    return (valeur / this.commandesMax) * 100;
  }

  isPeakCommande(valeur: number): boolean {
    if (!this.commandesSeries.length) {
      return false;
    }
    return valeur === Math.max(...this.commandesSeries.map(p => p.valeur));
  }

  // =============================================
  // TOP PRODUITS
  // =============================================
  get maxVentesTop(): number {
    if (!this.topProduits.length) {
      return 1;
    }
    return Math.max(...this.topProduits.map(p => p.ventes));
  }

  // =============================================
  // EXPORT
  // =============================================
  exporterCSV(): void {
    const rows = [
      ['Période', this.caSeries.map(p => p.label).join(' | ')],
      ['CA', this.caSeries.map(p => p.valeur).join(' | ')],
      ['Commandes', this.commandesSeries.map(p => p.valeur).join(' | ')]
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques-${this.selectedPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // =============================================
  // UTILITAIRES
  // =============================================
  formatPrix(valeur: number): string {
    return Math.round(valeur).toLocaleString('fr-FR').replace(/,/g, ' ') + ' FCFA';
  }

  getPeriodLabel(period: Periode): string {
    if (period === 'week') { return 'Semaine'; }
    if (period === 'month') { return 'Mois'; }
    if (period === 'quarter') { return 'Trimestre'; }
    return 'Année';
  }

  getHeatColor(valeur: number): string {
    // 0-100 -> opacité du mint
    const opacity = 0.06 + (valeur / 100) * 0.55;
    return `rgba(73, 224, 200, ${opacity.toFixed(2)})`;
  }
}