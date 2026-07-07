import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

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
  imports: [CommonModule, FormsModule, RouterLink],
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

  // ── KPI strip ─────────────────────────────────────────────────────────
  kpiStrip = [
    { label: 'Panier moyen',     value: '108 500 FCFA', icon: 'bi-wallet2',     bg: 'rgba(59,130,246,.1)',  color: '#3b82f6', trend: 8.2  },
    { label: 'Produits vendus',  value: '142',          icon: 'bi-box-seam',    bg: 'rgba(29,185,84,.1)',   color: '#1db954', trend: 12.5 },
    { label: 'Clients uniques',  value: '38',           icon: 'bi-people-fill', bg: 'rgba(139,92,246,.1)',  color: '#8b5cf6', trend: 5.1  },
    { label: 'Taux commission',  value: '5%',           icon: 'bi-percent',     bg: 'rgba(245,158,11,.1)',  color: '#f59e0b', trend: 0    },
    { label: 'Versements faits', value: '8',            icon: 'bi-bank',        bg: 'rgba(236,72,153,.1)',  color: '#ec4899', trend: 3    },
  ];

  // ── Graphique ─────────────────────────────────────────────────────────
  chartData = [
    { mois: 'Jan', brut: 850000,  net: 807500  },
    { mois: 'Fév', brut: 920000,  net: 874000  },
    { mois: 'Mar', brut: 780000,  net: 741000  },
    { mois: 'Avr', brut: 1100000, net: 1045000 },
    { mois: 'Mai', brut: 950000,  net: 902500  },
    { mois: 'Jun', brut: 1085000, net: 1030750 },
  ];

  // ── Transactions ──────────────────────────────────────────────────────
  transactions: Transaction[] = [
    {
      id: 'TRX-AM-99421', commande: 'CMD-2026-0885',
      produit: 'Dérailleur Arrière Shimano Deore XT 1x12', client: 'Ousmane Sow',
      quantite: 1, prixUnitaire: 58000, montantBrut: 58000,
      commission: 2900, revenuNet: 55100, date: '2026-06-21',
      statutReversement: 'paye', dateVersement: '2026-06-22', reference: 'VIR-2026-06-22-001'
    },
    {
      id: 'TRX-AM-99410', commande: 'CMD-2026-0875',
      produit: 'Bougie d\'allumage Iridium NGK Laser Iridium BKR6EIX', client: 'Mamadou Diouf',
      quantite: 4, prixUnitaire: 12000, montantBrut: 48000,
      commission: 2400, revenuNet: 45600, date: '2026-06-19',
      statutReversement: 'paye', dateVersement: '2026-06-20', reference: 'VIR-2026-06-20-003'
    },
    {
      id: 'TRX-AM-99388', commande: 'CMD-2026-0860',
      produit: 'Pneu Michelin Primacy 4 205/55 R16 91H', client: 'Saliou Fall',
      quantite: 8, prixUnitaire: 68000, montantBrut: 544000,
      commission: 27200, revenuNet: 516800, date: '2026-06-15',
      statutReversement: 'paye', dateVersement: '2026-06-16', reference: 'VIR-2026-06-16-001'
    },
    {
      id: 'TRX-AM-99350', commande: 'CMD-2026-0842',
      produit: 'Vanne de Freinage Pneumatique Wabco Premium', client: 'Transport Logistique Ndiaye',
      quantite: 2, prixUnitaire: 185000, montantBrut: 370000,
      commission: 18500, revenuNet: 351500, date: '2026-06-10',
      statutReversement: 'en_cours'
    },
    {
      id: 'TRX-AM-99320', commande: 'CMD-2026-0810',
      produit: 'Kit Chaîne DID 520 Renforcé (1x)', client: 'Fatou Mbaye',
      quantite: 1, prixUnitaire: 65000, montantBrut: 65000,
      commission: 3250, revenuNet: 61750, date: '2026-06-05',
      statutReversement: 'paye', dateVersement: '2026-06-06', reference: 'VIR-2026-06-06-002'
    },
    {
      id: 'TRX-AM-99290', commande: 'CMD-2026-0788',
      produit: 'Amortisseur Avant Gaz Sachs Ultra Premium', client: 'Ibrahima Ba',
      quantite: 2, prixUnitaire: 75000, montantBrut: 150000,
      commission: 7500, revenuNet: 142500, date: '2026-05-28',
      statutReversement: 'paye', dateVersement: '2026-05-29', reference: 'VIR-2026-05-29-001'
    },
    {
      id: 'TRX-AM-99260', commande: 'CMD-2026-0765',
      produit: 'Courroie de Distribution Gates PowerGrip K015500XS', client: 'Garage Central',
      quantite: 3, prixUnitaire: 28000, montantBrut: 84000,
      commission: 4200, revenuNet: 79800, date: '2026-05-20',
      statutReversement: 'en_attente'
    },
    {
      id: 'TRX-AM-99230', commande: 'CMD-2026-0740',
      produit: 'Filtre à Huile Moteur Bosch F026407006 Premium', client: 'Cheikh Anta Sylla',
      quantite: 6, prixUnitaire: 8500, montantBrut: 51000,
      commission: 2550, revenuNet: 48450, date: '2026-05-15',
      statutReversement: 'paye', dateVersement: '2026-05-16', reference: 'VIR-2026-05-16-003'
    },
    {
      id: 'TRX-AM-99200', commande: 'CMD-2026-0720',
      produit: 'Batterie Lithium Vélo Électrique 36V 10Ah', client: 'Club Vélo Dakar',
      quantite: 2, prixUnitaire: 120000, montantBrut: 240000,
      commission: 12000, revenuNet: 228000, date: '2026-05-08',
      statutReversement: 'paye', dateVersement: '2026-05-09', reference: 'VIR-2026-05-09-001'
    },
    {
      id: 'TRX-AM-99170', commande: 'CMD-2026-0700',
      produit: 'Disque de Frein Brembo Sport 280mm UV Coated', client: 'Auto Pro Thiès',
      quantite: 4, prixUnitaire: 55000, montantBrut: 220000,
      commission: 11000, revenuNet: 209000, date: '2026-05-01',
      statutReversement: 'en_cours'
    },
  ];

  filteredTransactions: Transaction[] = [];

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

  ngOnInit(): void { this.applyFilters(); }
  ngOnDestroy(): void { if (this.toastTimer) clearTimeout(this.toastTimer); }

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