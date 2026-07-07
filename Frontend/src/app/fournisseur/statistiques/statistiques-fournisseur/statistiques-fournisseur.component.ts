import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

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

  periods: Periode[] = ['week', 'month', 'quarter', 'year'];
  selectedPeriod: Periode = 'month';
  comparerPeriodePrecedente = true;

  kpis: KpiCard[] = [];
  caSeries: SeriePoint[] = [];
  commandesSeries: SeriePoint[] = [];
  categories: CategorieVente[] = [];
  topProduits: TopProduit[] = [];
  performanceMensuelle: JourPerformance[] = [];

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
    const labels = this.getLabelsForPeriod(this.selectedPeriod);

    this.caSeries = labels.map((label, i) => {
      const base = 800000 + Math.sin(i / 2) * 250000 + i * 15000;
      return {
        label,
        valeur: Math.round(base + Math.random() * 100000),
        precedent: Math.round(base * 0.82 + Math.random() * 90000)
      };
    });

    this.commandesSeries = labels.map((label, i) => ({
      label,
      valeur: Math.round(20 + Math.sin(i / 1.5) * 8 + Math.random() * 6),
      precedent: Math.round(16 + Math.sin(i / 1.5) * 6)
    }));

    const totalCa = this.caSeries.reduce((s, p) => s + p.valeur, 0);
    const totalCaPrec = this.caSeries.reduce((s, p) => s + p.precedent, 0);
    const totalCommandes = this.commandesSeries.reduce((s, p) => s + p.valeur, 0);
    const totalCommandesPrec = this.commandesSeries.reduce((s, p) => s + p.precedent, 0);
    const panierMoyen = totalCommandes > 0 ? totalCa / totalCommandes : 0;
    const panierMoyenPrec = totalCommandesPrec > 0 ? totalCaPrec / totalCommandesPrec : 0;

    this.kpis = [
      {
        label: "Chiffre d'affaires",
        valeur: this.formatPrix(totalCa),
        trend: this.calcTrend(totalCa, totalCaPrec),
        icon: 'bi-currency-dollar',
        color: 'accent'
      },
      {
        label: 'Commandes',
        valeur: totalCommandes.toString(),
        trend: this.calcTrend(totalCommandes, totalCommandesPrec),
        icon: 'bi-cart3',
        color: 'info'
      },
      {
        label: 'Panier moyen',
        valeur: this.formatPrix(panierMoyen),
        trend: this.calcTrend(panierMoyen, panierMoyenPrec),
        icon: 'bi-basket3',
        color: 'gold'
      },
      {
        label: 'Note moyenne',
        valeur: this.noteMoyenne.toFixed(1) + ' / 5',
        trend: 3.2,
        icon: 'bi-star-fill',
        color: 'violet'
      }
    ];

    // Catégories (répartition CA)
    const rawCats = [
      { label: 'Automobile', valeur: 52, color: 'var(--info)' },
      { label: 'Moto & Scooter', valeur: 21, color: 'var(--violet)' },
      { label: 'Poids Lourds', valeur: 18, color: 'var(--gold)' },
      { label: 'Vélo', valeur: 9, color: 'var(--accent)' }
    ];
    this.categories = rawCats.map(c => ({ ...c, pct: c.valeur }));

    // Top produits
    this.topProduits = [
      { nom: 'Filtre à Huile Bosch Premium', categorie: 'Automobile', ventes: 142, ca: 1704000 },
      { nom: 'Jeu Plaquettes Frein Brembo', categorie: 'Automobile', ventes: 98, ca: 4410000 },
      { nom: 'Kit Chaîne DID 520', categorie: 'Moto & Scooter', ventes: 61, ca: 2318000 },
      { nom: 'Vanne Freinage Wabco', categorie: 'Poids Lourds', ventes: 24, ca: 3720000 },
      { nom: 'Dérailleur Shimano Deore XT', categorie: 'Vélo', ventes: 19, ca: 1102000 }
    ].sort((a, b) => b.ca - a.ca);

    // Calendrier de performance (jours du mois en cours, mock)
    const joursDansMois = 30;
    this.performanceMensuelle = Array.from({ length: joursDansMois }, (_, i) => {
      const valeur = Math.round(Math.random() * 100);
      return { jour: i + 1, valeur, montant: Math.round(valeur * 8500) };
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