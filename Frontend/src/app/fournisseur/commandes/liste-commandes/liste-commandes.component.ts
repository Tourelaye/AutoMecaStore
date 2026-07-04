import {
  Component, OnInit, OnDestroy, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  trigger, transition, style, animate
} from '@angular/animations';

export interface Commande {
  id:           number;
  numero:       string;
  client:       string;
  adresse:      string;
  telephone?:   string;
  produit:      string;
  produitImage?:string;
  reference?:   string;
  quantite:     number;
  prixUnitaire: number;
  total:        number;
  date:         string;
  statut:       'en_attente' | 'confirmee' | 'expediee' | 'livree' | 'annulee';
}

type StatutType = 'en_attente' | 'confirmee' | 'expediee' | 'livree' | 'annulee';

@Component({
  selector: 'app-liste-commandes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './liste-commandes.component.html',
  styleUrls: ['./liste-commandes.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease', style({ opacity: 0 }))]),
    ]),
    trigger('slideRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.34,1.56,0.64,1)', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease', style({ opacity: 0, transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('dropDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px) scaleY(0.9)' }),
        animate('180ms ease', style({ opacity: 1, transform: 'translateY(0) scaleY(1)' }))
      ]),
      transition(':leave', [
        animate('120ms ease', style({ opacity: 0, transform: 'translateY(-6px) scaleY(0.95)' }))
      ])
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
export class ListeCommandesComponent implements OnInit, OnDestroy {

  Math = Math;

  // ── État ─────────────────────────────────────────────────────────────
  isLoading    = false;
  updatingId: number | null = null;
  dropdownOpenId: number | null = null;

  // ── Drawer détail ─────────────────────────────────────────────────────
  selectedCommande: Commande | null = null;

  // ── Toast ─────────────────────────────────────────────────────────────
  toastMsg  = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  // ── Filtres ───────────────────────────────────────────────────────────
  searchTerm      = '';
  selectedStatut  = '';
  selectedPeriode = '';
  sortField       = 'date';
  sortDir: 'asc' | 'desc' = 'desc';

  // ── Pagination ────────────────────────────────────────────────────────
  currentPage = 1;
  pageSize    = 8;

  // ── Tabs statut ───────────────────────────────────────────────────────
  statutTabs = [
    { value: '',           label: 'TOUS',        activeCls: 'stab-all'      },
    { value: 'en_attente', label: 'En attente',  activeCls: 'stab-attente'  },
    { value: 'confirmee',  label: 'Confirmée',   activeCls: 'stab-confirmee'},
    { value: 'expediee',   label: 'Expédiée',    activeCls: 'stab-expediee' },
    { value: 'livree',     label: 'Livrée',      activeCls: 'stab-livree'   },
    { value: 'annulee',    label: 'Annulée',     activeCls: 'stab-annulee'  },
  ];

  // ── Timeline ──────────────────────────────────────────────────────────
  statutTimeline = [
    { value: 'en_attente', label: 'En attente',  icon: 'bi-clock-fill'         },
    { value: 'confirmee',  label: 'Confirmée',   icon: 'bi-check-circle-fill'  },
    { value: 'expediee',   label: 'Expédiée',    icon: 'bi-truck'              },
    { value: 'livree',     label: 'Livrée',      icon: 'bi-house-check-fill'   },
  ];

  // ── Données ───────────────────────────────────────────────────────────
  commandes: Commande[] = [
    {
      id:1, numero:'CMD-2026-0891', client:'Moussa Diop (Garage Teranga)',
      adresse:'Avenue Bourguiba, Grand Dakar', telephone:'+221 77 123 45 67',
      produit:'Jeu de 4 Plaquettes de Frein Brembo Sport',
      produitImage:'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=60&h=60&fit=crop',
      reference:'REF-BRM-P85020', quantite:2, prixUnitaire:45000, total:90000,
      date:'2026-06-23T14:30:00', statut:'confirmee'
    },
    {
      id:2, numero:'CMD-2026-0890', client:'Saliou Fall',
      adresse:'Almadies, Zone 12, Dakar', telephone:'+221 76 234 56 78',
      produit:'Pneu Michelin Primacy 4 205/55 R16',
      produitImage:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=60&h=60&fit=crop',
      reference:'REF-MCH-PR4-205', quantite:4, prixUnitaire:68000, total:272000,
      date:'2026-06-23T11:15:00', statut:'confirmee'
    },
    {
      id:3, numero:'CMD-2026-0888', client:'Transport Logistique Ndiaye & Fils',
      adresse:'Port Autonome de Dakar, Môle 3', telephone:'+221 33 456 78 90',
      produit:'Vanne de Freinage Pneumatique Wabco',
      produitImage:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop',
      reference:'REF-WBC-9710021500', quantite:1, prixUnitaire:185000, total:185000,
      date:'2026-06-22T16:45:00', statut:'expediee'
    },
    {
      id:4, numero:'CMD-2026-0885', client:'Ousmane Sow (Club Cycliste Dakar)',
      adresse:'Mermoz Pyrotechnie', telephone:'+221 78 345 67 89',
      produit:'Dérailleur Arrière Shimano Deore XT',
      produitImage:'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=60&h=60&fit=crop',
      reference:'REF-SHM-M8100', quantite:1, prixUnitaire:58000, total:58000,
      date:'2026-06-21T09:20:00', statut:'livree'
    },
    {
      id:5, numero:'CMD-2026-0880', client:'Cheikh Anta Sylla',
      adresse:'Parcelles Assainies Unité 18', telephone:'+221 77 456 78 90',
      produit:'Filtre à Huile Moteur Bosch Premium',
      produitImage:'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=60&h=60&fit=crop',
      reference:'REF-BSH-0451103079', quantite:3, prixUnitaire:8500, total:25500,
      date:'2026-06-20T18:10:00', statut:'annulee'
    },
    {
      id:6, numero:'CMD-2026-0877', client:'Fatou Mbaye (Garage Fatou)',
      adresse:'Thiès, Quartier Industriel', telephone:'+221 76 567 89 01',
      produit:'Kit Chaîne DID 520 Renforcé O-Ring',
      reference:'REF-DID-520VX3', quantite:2, prixUnitaire:65000, total:130000,
      date:'2026-06-19T10:00:00', statut:'en_attente'
    },
    {
      id:7, numero:'CMD-2026-0875', client:'Ibrahima Ba Auto Service',
      adresse:'Rufisque, Zone Industrielle', telephone:'+221 33 567 89 01',
      produit:'Amortisseur Avant Gaz Sachs Ultra',
      reference:'REF-SCH-314718', quantite:2, prixUnitaire:75000, total:150000,
      date:'2026-06-18T15:30:00', statut:'en_attente'
    },
    {
      id:8, numero:'CMD-2026-0872', client:'Garage Central Dakar',
      adresse:'Medina, Rue 19', telephone:'+221 77 678 90 12',
      produit:'Courroie de Distribution Gates PowerGrip',
      reference:'REF-GAT-5479XS', quantite:5, prixUnitaire:28000, total:140000,
      date:'2026-06-17T08:45:00', statut:'livree'
    },
  ];

  filteredCommandes: Commande[] = [];

  // ── Computed ──────────────────────────────────────────────────────────
  get statsCards() {
    return [
      { label: 'En attente', count: this.getCount('en_attente'), icon: 'bi-clock-fill',         bg: '#fff7ed', color: '#f97316', trend: 12  },
      { label: 'Confirmées', count: this.getCount('confirmee'),  icon: 'bi-check-circle-fill',  bg: '#eff6ff', color: '#3b82f6', trend: 8   },
      { label: 'Expédiées',  count: this.getCount('expediee'),   icon: 'bi-truck',              bg: '#f5f3ff', color: '#8b5cf6', trend: 5   },
      { label: 'Livrées',    count: this.getCount('livree'),     icon: 'bi-house-check-fill',   bg: '#f0fdf4', color: '#16a34a', trend: 0   },
      { label: 'Annulées',   count: this.getCount('annulee'),    icon: 'bi-x-circle-fill',      bg: '#fff1f2', color: '#e11d48', trend: -3  },
    ];
  }

  get totalPages() { return Math.ceil(this.filteredCommandes.length / this.pageSize); }
  get pageNumbers() { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get paginatedCommandes() {
    const s = (this.currentPage - 1) * this.pageSize;
    return this.filteredCommandes.slice(s, s + this.pageSize);
  }

  ngOnInit(): void { this.applyFilters(); }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Filtres ────────────────────────────────────────────────────────────
  applyFilters(): void {
    let r = [...this.commandes];

    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter(c =>
        c.numero.toLowerCase().includes(t) ||
        c.client.toLowerCase().includes(t) ||
        c.produit.toLowerCase().includes(t)
      );
    }

    if (this.selectedStatut) r = r.filter(c => c.statut === this.selectedStatut);

    if (this.selectedPeriode) {
      const days = parseInt(this.selectedPeriode);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      r = r.filter(c => new Date(c.date) >= cutoff);
    }

    // Tri
    r.sort((a: any, b: any) => {
      let va = a[this.sortField], vb = b[this.sortField];
      if (this.sortField === 'date') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    this.filteredCommandes = r;
    this.currentPage = 1;
  }

  selectStatut(v: string): void { this.selectedStatut = v; this.applyFilters(); }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field; this.sortDir = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'bi-chevron-expand';
    return this.sortDir === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down';
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  getCount(statut: string): number {
    return this.commandes.filter(c => c.statut === statut).length;
  }

  // ── Drawer ────────────────────────────────────────────────────────────
  openDetail(cmd: Commande): void  { this.selectedCommande = cmd; }
  closeDetail(): void              { this.selectedCommande = null; }

  // ── Dropdown statut ───────────────────────────────────────────────────
  openStatutDropdown(cmd: Commande, event: Event): void {
    event.stopPropagation();
    this.dropdownOpenId = this.dropdownOpenId === cmd.id ? null : cmd.id;
  }

  @HostListener('document:click')
  onDocClick(): void { this.dropdownOpenId = null; }

  getStatutOptions(statut: StatutType): { value: StatutType; label: string; icon: string }[] {
    const all: Record<StatutType, { value: StatutType; label: string; icon: string }[]> = {
      en_attente: [
        { value: 'confirmee', label: 'Confirmer',  icon: 'bi-check-circle-fill' },
        { value: 'annulee',   label: 'Annuler',    icon: 'bi-x-circle-fill'     },
      ],
      confirmee: [
        { value: 'expediee',  label: 'Expédier',   icon: 'bi-truck'             },
        { value: 'annulee',   label: 'Annuler',    icon: 'bi-x-circle-fill'     },
      ],
      expediee: [
        { value: 'livree',    label: 'Marquer livrée', icon: 'bi-house-check-fill' },
      ],
      livree:   [],
      annulee:  [],
    };
    return all[statut] || [];
  }

  changeStatut(cmd: Commande, newStatut: StatutType, event: Event): void {
    event.stopPropagation();
    this.dropdownOpenId = null;
    this.doChangeStatut(cmd, newStatut);
  }

  changeStatutFromDrawer(cmd: Commande, newStatut: StatutType): void {
    this.doChangeStatut(cmd, newStatut);
  }

  private doChangeStatut(cmd: Commande, newStatut: StatutType): void {
    this.updatingId = cmd.id;
    setTimeout(() => {
      const idx = this.commandes.findIndex(c => c.id === cmd.id);
      if (idx !== -1) {
        this.commandes[idx].statut = newStatut;
        if (this.selectedCommande?.id === cmd.id) {
          this.selectedCommande = { ...this.commandes[idx] };
        }
      }
      this.applyFilters();
      this.updatingId = null;
      this.showToast(`Statut mis à jour : ${this.getStatutLabel(newStatut)}`, 'success');
    }, 800);
  }

  getNextStatutLabel(statut: StatutType): string {
    const map: Partial<Record<StatutType, string>> = {
      en_attente: 'Confirmée',
      confirmee:  'Expédiée',
      expediee:   'Livrée',
      livree:     'Livrée ✓',
      annulee:    'Annulée ✕',
    };
    return map[statut] ?? '';
  }

  getNextStatutBtnClass(statut: StatutType): string {
    const map: Partial<Record<StatutType, string>> = {
      en_attente: 'nsb-attente',
      confirmee:  'nsb-confirmee',
      expediee:   'nsb-expediee',
      livree:     'nsb-livree',
      annulee:    'nsb-annulee',
    };
    return map[statut] ?? '';
  }

  // ── Timeline ──────────────────────────────────────────────────────────
  isStepDone(step: string, currentStatut: string): boolean {
    const order = ['en_attente', 'confirmee', 'expediee', 'livree'];
    return order.indexOf(step) <= order.indexOf(currentStatut);
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      en_attente: 'st-attente',
      confirmee:  'st-confirmee',
      expediee:   'st-expediee',
      livree:     'st-livree',
      annulee:    'st-annulee',
    };
    return map[statut] ?? '';
  }

  getStatutIcon(statut: string): string {
    const map: Record<string, string> = {
      en_attente: 'bi-clock-fill',
      confirmee:  'bi-check-circle-fill',
      expediee:   'bi-truck',
      livree:     'bi-house-check-fill',
      annulee:    'bi-x-circle-fill',
    };
    return map[statut] ?? '';
  }

  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      en_attente: 'En attente',
      confirmee:  'Confirmée',
      expediee:   'Expédiée',
      livree:     'Livrée',
      annulee:    'Annulée',
    };
    return map[statut] ?? statut;
  }

  formatPrix(v: number): string {
    return new Intl.NumberFormat('fr-FR').format(v) + ' FCFA';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  formatTime(d: string): string {
    return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  onImgError(e: Event): void {
    (e.target as HTMLImageElement).style.display = 'none';
  }

  showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg; this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMsg = ''; }, 3500);
  }
}