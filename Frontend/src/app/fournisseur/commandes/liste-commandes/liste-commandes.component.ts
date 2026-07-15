import {
  Component, OnInit, OnDestroy, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// RouterLink removed — not used in template
import {
  trigger, transition, style, animate
} from '@angular/animations';
import { CommandeService } from '../../services/commande.service';

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
  statut:       'en_attente' | 'validee' | 'expediee' | 'livree' | 'annulee';
}

type StatutType = 'en_attente' | 'validee' | 'expediee' | 'livree' | 'annulee';

@Component({
  selector: 'app-liste-commandes',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    { value: 'validee',    label: 'Confirmée',   activeCls: 'stab-confirmee'},
    { value: 'expediee',   label: 'Expédiée',    activeCls: 'stab-expediee' },
    { value: 'livree',     label: 'Livrée',      activeCls: 'stab-livree'   },
    { value: 'annulee',    label: 'Annulée',     activeCls: 'stab-annulee'  },
  ];

  // ── Timeline ──────────────────────────────────────────────────────────
  statutTimeline = [
    { value: 'en_attente', label: 'En attente',  icon: 'bi-clock-fill'         },
    { value: 'validee',    label: 'Confirmée',   icon: 'bi-check-circle-fill'  },
    { value: 'expediee',   label: 'Expédiée',    icon: 'bi-truck'              },
    { value: 'livree',     label: 'Livrée',      icon: 'bi-house-check-fill'   },
  ];

  // ── Données ───────────────────────────────────────────────────────────
  commandes: Commande[] = [];
  filteredCommandes: Commande[] = [];

  constructor(private commandeService: CommandeService) {}

  ngOnInit(): void {
    this.loadCommandes();
  }

  private loadCommandes(): void {
    this.isLoading = true;
    this.commandeService.getCommandes().subscribe({
      next: (data) => {
        this.commandes = data.map(c => this.mapApiCommande(c));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.showToast('Erreur lors du chargement des commandes', 'error');
        this.isLoading = false;
      }
    });
  }

  private mapApiCommande(apiCommande: any): Commande {
    const ligne = apiCommande.lignes?.[0];
    const produit = ligne?.produit;
    return {
      id: apiCommande.id,
      numero: apiCommande.reference || 'CMD-' + apiCommande.id,
      client: apiCommande.client ? `${apiCommande.client.prenom} ${apiCommande.client.nom}` : 'Client',
      adresse: apiCommande.client?.adresse || apiCommande.client?.ville || 'Adresse inconnue',
      telephone: apiCommande.client?.telephone || '',
      produit: produit?.nom || 'Produit',
      produitImage: produit?.image_url || produit?.image || '',
      reference: apiCommande.reference || '',
      quantite: ligne?.quantite || 0,
      prixUnitaire: ligne?.prix_unitaire || 0,
      total: apiCommande.montant_total || 0,
      date: apiCommande.date_commande,
      statut: apiCommande.statut
    };
  }

  // ── Computed ──────────────────────────────────────────────────────────
  get statsCards() {
    return [
      { label: 'En attente', count: this.getCount('en_attente'), icon: 'bi-clock-fill',         bg: '#fff7ed', color: '#f97316', trend: 12  },
      { label: 'Confirmées', count: this.getCount('validee'),    icon: 'bi-check-circle-fill',  bg: '#eff6ff', color: '#3b82f6', trend: 8   },
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
        { value: 'validee', label: 'Confirmer',  icon: 'bi-check-circle-fill' },
        { value: 'annulee', label: 'Annuler',    icon: 'bi-x-circle-fill'     },
      ],
      validee: [
        { value: 'expediee', label: 'Expédier',   icon: 'bi-truck'             },
        { value: 'annulee',  label: 'Annuler',    icon: 'bi-x-circle-fill'     },
      ],
      expediee: [
        { value: 'livree',   label: 'Marquer livrée', icon: 'bi-house-check-fill' },
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
    this.commandeService.updateCommandeStatut(cmd.id, newStatut).subscribe({
      next: (updated) => {
        const idx = this.commandes.findIndex(c => c.id === cmd.id);
        if (idx !== -1) {
          this.commandes[idx].statut = updated.statut as StatutType;
          if (this.selectedCommande?.id === cmd.id) {
            this.selectedCommande = { ...this.commandes[idx] };
          }
        }
        this.applyFilters();
        this.updatingId = null;
        this.showToast(`Statut mis à jour : ${this.getStatutLabel(updated.statut as StatutType)}`, 'success');
      },
      error: () => {
        this.showToast('Impossible de mettre à jour le statut', 'error');
        this.updatingId = null;
      }
    });
  }

  getNextStatutLabel(statut: StatutType): string {
    const map: Partial<Record<StatutType, string>> = {
      en_attente: 'Confirmée',
      validee:    'Expédiée',
      expediee:   'Livrée',
      livree:     'Livrée ✓',
      annulee:    'Annulée ✕',
    };
    return map[statut] ?? '';
  }

  getNextStatutBtnClass(statut: StatutType): string {
    const map: Partial<Record<StatutType, string>> = {
      en_attente: 'nsb-attente',
      validee:    'nsb-confirmee',
      expediee:   'nsb-expediee',
      livree:     'nsb-livree',
      annulee:    'nsb-annulee',
    };
    return map[statut] ?? '';
  }

  // ── Timeline ──────────────────────────────────────────────────────────
  isStepDone(step: string, currentStatut: string): boolean {
    const order = ['en_attente', 'validee', 'expediee', 'livree'];
    return order.indexOf(step) <= order.indexOf(currentStatut);
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      en_attente: 'st-attente',
      validee:    'st-confirmee',
      expediee:   'st-expediee',
      livree:     'st-livree',
      annulee:    'st-annulee',
    };
    return map[statut] ?? '';
  }

  getStatutIcon(statut: string): string {
    const map: Record<string, string> = {
      en_attente: 'bi-clock-fill',
      validee:    'bi-check-circle-fill',
      expediee:   'bi-truck',
      livree:     'bi-house-check-fill',
      annulee:    'bi-x-circle-fill',
    };
    return map[statut] ?? '';
  }

  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      en_attente: 'En attente',
      validee:    'Confirmée',
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