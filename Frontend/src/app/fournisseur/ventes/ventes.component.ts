import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { FournisseurService, Vente } from '../services/fournisseur.service';

export interface Transaction {
  id:                 string;
  commande:           string;
  produit:            string;
  client:             string;
  quantite:           number;
  prixUnitaire:       number;
  montantBrut:        number;
  commission:         number;
  revenuNet:          number;
  date:               string;
  statutReversement:  'paye' | 'en_cours' | 'en_attente';
  dateVersement?:     string;
  reference?:         string;
}

@Component({
  selector: 'app-ventes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventes.component.html',
  styleUrls: ['./ventes.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease', style({ opacity: 0 }))])
    ]),
    trigger('slideRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.34,1.56,0.64,1)', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [animate('200ms ease', style({ opacity: 0, transform: 'translateX(100%)' }))])
    ]),
    trigger('toastIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.34,1.56,0.64,1)', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [animate('200ms ease', style({ opacity: 0, transform: 'translateX(100%)' }))])
    ])
  ]
})
export class VentesComponent implements OnInit, OnDestroy {

  Math = Math;

  constructor(private fournisseurService: FournisseurService) {}

  // ── État ─────────────────────────────────────────────────────────────
  isLoading = false;
  selectedTransaction: Transaction | null = null;
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  // ── Config ────────────────────────────────────────────────────────────
  tauxCommission = 5;

  // ── Filtres ───────────────────────────────────────────────────────────
  searchTerm         = '';
  selectedReversement = '';
  selectedPeriod     = 'all';
  sortField          = 'date';
  sortDir: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  pageSize    = 8;

  periods = [
    { value: '7d',  label: '7j'   },
    { value: '30d', label: '30j'  },
    { value: '90d', label: '3 mois'},
    { value: 'all', label: 'Tout' },
  ];

  reversementTabs = [
    { value: '',          label: 'Tous',               cls: ''          },
    { value: 'paye',      label: '✓ Payé',             cls: 'rt-paye'   },
    { value: 'en_cours',  label: '↻ En cours',         cls: 'rt-encours'},
    { value: 'en_attente',label: '⏳ En attente',       cls: 'rt-attente'},
  ];

  // ── Graphique ─────────────────────────────────────────────────────────
  chartData: { mois: string; brut: number; net: number; }[] = [];

  // ── Transactions ──────────────────────────────────────────────────────
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];

  // ── KPI ───────────────────────────────────────────────────────────────
  kpiStrip: Array<{ label: string; value: string; icon: string; bg: string; color: string; trend: number }> = [];

  ngOnInit(): void {
    this.loadVentes();
    this.applyFilters();
  }

  ngOnDestroy(): void { if (this.toastTimer) clearTimeout(this.toastTimer); }

  loadVentes(): void {
    this.isLoading = true;
    this.fournisseurService.getVentes().subscribe({
      next: (ventes: Vente[]) => {
        this.transactions = ventes.map(v => ({
          id: v.id.toString(),
          commande: v.commande_ref,
          produit: v.produit_nom,
          client: 'Client',
          quantite: v.quantite,
          prixUnitaire: v.prix_unitaire,
          montantBrut: v.total,
          commission: Math.round(v.total * (this.tauxCommission / 100)),
          revenuNet: Math.round(v.total * (1 - this.tauxCommission / 100)),
          date: this.formatDate(v.date),
          statutReversement: this.mapStatutReversement(v.statut),
          dateVersement: undefined,
          reference: undefined,
        }));
        this.chartData = this.buildChartData(this.transactions);
        this.updateKPIs();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement ventes :', err);
        this.isLoading = false;
        this.showToast('Impossible de charger les ventes.', 'error');
      }
    });
  }

  private formatDate(date: string | Date): string {
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  private mapStatutReversement(statut: string): 'paye' | 'en_cours' | 'en_attente' {
    if (statut === 'paye') return 'paye';
    if (statut === 'expediee' || statut === 'livree') return 'en_cours';
    return 'en_attente';
  }

  private buildChartData(transactions: Transaction[]): { mois: string; brut: number; net: number; }[] {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const grouped: Record<string, { brut: number; net: number }> = {};

    transactions.forEach(t => {
      const date = new Date(t.date);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      grouped[key] = grouped[key] || { brut: 0, net: 0 };
      grouped[key].brut += t.montantBrut;
      grouped[key].net += t.revenuNet;
    });

    const entries = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => {
        const [year, month] = key.split('-').map(Number);
        return { mois: months[month], brut: value.brut, net: value.net };
      });

    return entries.length ? entries : [{ mois: '#1', brut: 0, net: 0 }, { mois: '#2', brut: 0, net: 0 }];
  }

  private updateKPIs(): void {
    const totalVentes = this.transactions.length;
    const totalProduitsVendues = this.transactions.reduce((sum, t) => sum + t.quantite, 0);
    const totalBrut = this.transactions.reduce((sum, t) => sum + t.montantBrut, 0);
    const totalCommission = this.transactions.reduce((sum, t) => sum + t.commission, 0);
    const totalNet = this.transactions.reduce((sum, t) => sum + t.revenuNet, 0);
    const versementsFaits = this.transactions.filter(t => t.statutReversement === 'paye').length;

    this.kpiStrip = [
      { label: 'Panier moyen',     value: totalVentes ? `${new Intl.NumberFormat('fr-FR').format(Math.round(totalBrut / totalVentes))} FCFA` : '0 FCFA', icon: 'bi-wallet2',     bg: 'rgba(59,130,246,.1)',  color: '#3b82f6', trend: 0  },
      { label: 'Produits vendus',  value: `${totalProduitsVendues}`, icon: 'bi-box-seam',    bg: 'rgba(29,185,84,.1)',   color: '#1db954', trend: 0 },
      { label: 'Clients uniques',  value: `${new Set(this.transactions.map(t => t.commande)).size}`, icon: 'bi-people-fill', bg: 'rgba(139,92,246,.1)',  color: '#8b5cf6', trend: 0  },
      { label: 'Taux commission',  value: `${this.tauxCommission}%`, icon: 'bi-percent',     bg: 'rgba(245,158,11,.1)',  color: '#f59e0b', trend: 0    },
      { label: 'Versements faits', value: `${versementsFaits}`, icon: 'bi-bank',        bg: 'rgba(236,72,153,.1)',  color: '#ec4899', trend: 0    },
    ];
  }

  // ── Financier calculé ─────────────────────────────────────────────────
  get totalBrut(): number       { return this.transactions.reduce((s, t) => s + t.montantBrut, 0); }
  get totalCommission(): number { return this.transactions.reduce((s, t) => s + t.commission, 0); }
  get totalNet(): number        { return this.transactions.reduce((s, t) => s + t.revenuNet, 0); }
  get tendanceBrut(): number    { return 12.4; }
  get totalPaye(): number       { return this.transactions.filter(t => t.statutReversement === 'paye').reduce((s, t) => s + t.revenuNet, 0); }
  get totalEnCours(): number    { return this.transactions.filter(t => t.statutReversement === 'en_cours').reduce((s, t) => s + t.revenuNet, 0); }

  get sumBrut():       number { return this.filteredTransactions.reduce((s, t) => s + t.montantBrut, 0); }
  get sumCommission(): number { return this.filteredTransactions.reduce((s, t) => s + t.commission,  0); }
  get sumNet():        number { return this.filteredTransactions.reduce((s, t) => s + t.revenuNet,   0); }

  get totalPages(): number  { return Math.ceil(this.filteredTransactions.length / this.pageSize); }
  get pageNumbers(): number[]{ return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get paginatedTransactions(): Transaction[] {
    const s = (this.currentPage - 1) * this.pageSize;
    return this.filteredTransactions.slice(s, s + this.pageSize);
  }

  // ── Filtres ────────────────────────────────────────────────────────────
  applyFilters(): void {
    let r = [...this.transactions];

    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter(tx =>
        tx.id.toLowerCase().includes(t) ||
        tx.commande.toLowerCase().includes(t) ||
        tx.produit.toLowerCase().includes(t) ||
        tx.client.toLowerCase().includes(t)
      );
    }

    if (this.selectedReversement) {
      r = r.filter(tx => tx.statutReversement === this.selectedReversement);
    }

    // Tri
    r.sort((a: any, b: any) => {
      let va = a[this.sortField], vb = b[this.sortField];
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    this.filteredTransactions = r;
    this.currentPage = 1;
  }

  selectPeriod(v: string): void { this.selectedPeriod = v; }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir   = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'bi-chevron-expand';
    return this.sortDir === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down';
  }

  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages) this.currentPage = p; }

  getReversementCount(v: string): number { return this.transactions.filter(t => t.statutReversement === v).length; }

  // ── Drawer ─────────────────────────────────────────────────────────────
  openDetail(t: Transaction): void  { this.selectedTransaction = t; }
  closeDetail(): void               { this.selectedTransaction = null; }

  // ── Graphique ──────────────────────────────────────────────────────────
  getBarPct(val: number, type: 'brut' | 'net'): number {
    const max = Math.max(...this.chartData.map(d => d.brut));
    return Math.round((val / max) * 100);
  }

  // ── Export CSV ─────────────────────────────────────────────────────────
  exportCSV(): void {
    const headers = ['Transaction ID', 'Commande', 'Produit', 'Client', 'Montant Brut', 'Commission', 'Revenu Net', 'Date', 'Statut'];
    const rows = this.filteredTransactions.map(t => [
      t.id, t.commande, `"${t.produit}"`, t.client,
      t.montantBrut, t.commission, t.revenuNet, t.date,
      this.getReversementLabel(t.statutReversement)
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'ventes-automecastore.csv';
    link.click(); URL.revokeObjectURL(url);
    this.showToast('Fichier CSV exporté !', 'success');
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  getReversementClass(s: string): string {
    return { paye: 'rev-paye', en_cours: 'rev-encours', en_attente: 'rev-attente' }[s] ?? '';
  }

  getReversementIcon(s: string): string {
    return { paye: 'bi-check-circle-fill', en_cours: 'bi-hourglass-split', en_attente: 'bi-clock-fill' }[s] ?? '';
  }

  getReversementLabel(s: string): string {
    return { paye: 'Payé', en_cours: 'En cours de virement', en_attente: 'En attente' }[s] ?? s;
  }

  formatPrix(v: number): string {
    return new Intl.NumberFormat('fr-FR').format(v) + ' FCFA';
  }

  showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg; this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMsg = ''; }, 3500);
  }
}