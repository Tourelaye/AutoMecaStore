import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Paiement,
  PaiementAction,
  PaiementActionPayload,
  PaiementService,
  PaiementStatut
} from './paiement.service';

type StatutFilter = 'tous' | PaiementStatut;
type MoyenFilter = string;
type PeriodeFilter = 'tous' | '7' | '30' | '90';
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface StatutConfig {
  label: string;
  badge: string;
  icon: string;
}

interface ActionConfig {
  action: PaiementAction;
  label: string;
  icon: string;
  tone: 'neutral' | 'success' | 'danger';
  group: 'Encaissement' | 'Remboursement';
  needsMotif: boolean;
  needsMontant: boolean;
}

export const COMMISSION_RATE = 0.1;

@Component({
  selector: 'app-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paiement.component.html',
  styleUrls: ['./paiement.component.css']
})
export class PaiementComponent implements OnInit {
  loading = true;
  error = '';
  paiements: Paiement[] = [];
  filtered: Paiement[] = [];

  searchTerm = '';
  statutFilter: StatutFilter = 'tous';
  moyenFilter: MoyenFilter = 'tous';
  periodeFilter: PeriodeFilter = 'tous';

  readonly statutConfig: Record<PaiementStatut, StatutConfig> = {
    en_attente:             { label: 'En attente',             badge: 'badge-gray',   icon: 'bi-hourglass-split' },
    en_cours:               { label: 'En cours',               badge: 'badge-blue',   icon: 'bi-arrow-repeat' },
    reussi:                 { label: 'Réussi',                 badge: 'badge-green',  icon: 'bi-check-circle-fill' },
    echoue:                 { label: 'Échoué',                 badge: 'badge-red',    icon: 'bi-x-circle-fill' },
    annule:                 { label: 'Annulé',                 badge: 'badge-gray',   icon: 'bi-slash-circle' },
    remboursement_demande:  { label: 'Remb. demandé',          badge: 'badge-yellow', icon: 'bi-arrow-counterclockwise' },
    remboursement_en_cours: { label: 'Remb. en cours',         badge: 'badge-orange', icon: 'bi-arrow-repeat' },
    rembourse:              { label: 'Remboursé',              badge: 'badge-purple', icon: 'bi-arrow-return-left' },
    remboursement_refuse:   { label: 'Remb. refusé',           badge: 'badge-red',    icon: 'bi-shield-x' }
  };

  readonly statutOptions: { value: StatutFilter; label: string }[] = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'reussi', label: 'Réussi' },
    { value: 'echoue', label: 'Échoué' },
    { value: 'annule', label: 'Annulé' },
    { value: 'remboursement_demande', label: 'Remboursement demandé' },
    { value: 'remboursement_en_cours', label: 'Remboursement en cours' },
    { value: 'rembourse', label: 'Remboursé' },
    { value: 'remboursement_refuse', label: 'Remboursement refusé' }
  ];

  readonly periodeOptions: { value: PeriodeFilter; label: string }[] = [
    { value: 'tous', label: 'Toutes les périodes' },
    { value: '7', label: '7 derniers jours' },
    { value: '30', label: '30 derniers jours' },
    { value: '90', label: '90 derniers jours' }
  ];

  private readonly transitions: Record<PaiementStatut, PaiementStatut[]> = {
    en_attente: ['reussi', 'echoue', 'annule'],
    en_cours: ['reussi', 'echoue', 'annule'],
    reussi: ['remboursement_demande'],
    remboursement_demande: ['remboursement_en_cours', 'remboursement_refuse'],
    remboursement_en_cours: ['rembourse', 'remboursement_refuse'],
    echoue: [],
    annule: [],
    remboursement_refuse: [],
    rembourse: []
  };

  private readonly actionCatalog: Record<PaiementAction, ActionConfig & { cible: PaiementStatut }> = {
    confirmer:              { action: 'confirmer',              cible: 'reussi',                 label: 'Confirmer le paiement',    icon: 'bi-check2-circle',           tone: 'success', group: 'Encaissement',  needsMotif: false, needsMontant: false },
    echouer:                { action: 'echouer',                cible: 'echoue',                 label: 'Marquer comme échoué',     icon: 'bi-x-octagon',               tone: 'danger',  group: 'Encaissement',  needsMotif: true,  needsMontant: false },
    annuler:                { action: 'annuler',                cible: 'annule',                 label: 'Annuler le paiement',      icon: 'bi-slash-circle',            tone: 'danger',  group: 'Encaissement',  needsMotif: true,  needsMontant: false },
    demander_remboursement: { action: 'demander_remboursement', cible: 'remboursement_demande',  label: 'Demander un remboursement',icon: 'bi-arrow-counterclockwise',  tone: 'neutral', group: 'Remboursement', needsMotif: true,  needsMontant: true },
    demarrer_remboursement: { action: 'demarrer_remboursement', cible: 'remboursement_en_cours', label: 'Démarrer le remboursement',icon: 'bi-play-circle',             tone: 'neutral', group: 'Remboursement', needsMotif: true,  needsMontant: true },
    rembourser:             { action: 'rembourser',             cible: 'rembourse',              label: 'Rembourser',               icon: 'bi-arrow-return-left',       tone: 'success', group: 'Remboursement', needsMotif: true,  needsMontant: true },
    refuser_remboursement:  { action: 'refuser_remboursement',  cible: 'remboursement_refuse',   label: 'Refuser le remboursement', icon: 'bi-shield-x',                tone: 'danger',  group: 'Remboursement', needsMotif: true,  needsMontant: false }
  };

  // Menu ⋮
  @ViewChild('dropdownMenu') dropdownMenuRef?: ElementRef<HTMLElement>;
  dropdownOpenId: number | null = null;
  dropdownPaiement: Paiement | null = null;
  dropdownMenuUp = false;
  dropdownTop = 0;
  dropdownLeft = 0;

  private dropdownAnchor: HTMLElement | null = null;
  private readonly dropdownFallbackWidth = 250;
  private readonly dropdownFallbackHeight = 320;
  private readonly dropdownGap = 6;
  private readonly viewportMargin = 12;

  // Drawer
  showDetail = false;
  selected: Paiement | null = null;
  detailTab: 'infos' | 'facture' = 'infos';

  // Modale d'action
  activeAction: ActionConfig | null = null;
  actionTarget: Paiement | null = null;
  actionMotif = '';
  actionMontant: number | null = null;
  submitting = false;

  toasts: Toast[] = [];
  private toastSeq = 0;

  constructor(private paiementService: PaiementService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.paiementService.getAll().subscribe({
      next: list => {
        this.paiements = list;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les transactions.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const limite = this.periodeLimite();

    this.filtered = this.paiements.filter(p => {
      const matchSearch =
        !term ||
        p.reference.toLowerCase().includes(term) ||
        p.commande_reference.toLowerCase().includes(term) ||
        p.client_nom.toLowerCase().includes(term) ||
        p.moyen_libelle.toLowerCase().includes(term);
      const matchStatut = this.statutFilter === 'tous' || p.statut === this.statutFilter;
      const matchMoyen = this.moyenFilter === 'tous' || p.moyen === this.moyenFilter;
      const matchPeriode = !limite || new Date(p.date_creation).getTime() >= limite;
      return matchSearch && matchStatut && matchMoyen && matchPeriode;
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statutFilter = 'tous';
    this.moyenFilter = 'tous';
    this.periodeFilter = 'tous';
    this.applyFilters();
  }

  get hasFilters(): boolean {
    return (
      !!this.searchTerm.trim() ||
      this.statutFilter !== 'tous' ||
      this.moyenFilter !== 'tous' ||
      this.periodeFilter !== 'tous'
    );
  }

  get moyenOptions(): { value: string; label: string }[] {
    const seen = new Map<string, string>();
    this.paiements.forEach(p => seen.set(p.moyen, p.moyen_libelle || p.moyen));
    return [{ value: 'tous', label: 'Tous les moyens' }, ...Array.from(seen, ([value, label]) => ({ value, label }))];
  }

  private periodeLimite(): number | null {
    if (this.periodeFilter === 'tous') return null;
    const jours = Number(this.periodeFilter);
    return Date.now() - jours * 24 * 60 * 60 * 1000;
  }

  // ─── KPIs ───
  get volumeEncaisse(): number {
    return this.somme(['reussi']);
  }

  get commissions(): number {
    return this.volumeEncaisse * COMMISSION_RATE;
  }

  get montantEnAttente(): number {
    return this.somme(['en_attente', 'en_cours']);
  }

  get montantRembourse(): number {
    return this.somme(['rembourse']);
  }

  get nbEchecs(): number {
    return this.paiements.filter(p => p.statut === 'echoue' || p.statut === 'annule').length;
  }

  get nbRemboursementsEnCours(): number {
    return this.paiements.filter(
      p => p.statut === 'remboursement_demande' || p.statut === 'remboursement_en_cours'
    ).length;
  }

  private somme(statuts: PaiementStatut[]): number {
    return this.paiements
      .filter(p => statuts.includes(p.statut))
      .reduce((total, p) => total + p.montant, 0);
  }

  commissionDe(p: Paiement): number {
    return p.montant * COMMISSION_RATE;
  }

  netFournisseur(p: Paiement): number {
    return p.montant - this.commissionDe(p);
  }

  statut(p: Paiement): StatutConfig {
    return this.statutConfig[p.statut] || { label: p.statut_libelle, badge: 'badge-gray', icon: 'bi-question-circle' };
  }

  initiales(nom: string): string {
    const parts = (nom || '?').trim().split(/[\s@.]+/).filter(Boolean);
    return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
  }

  actionsFor(p: Paiement): ActionConfig[] {
    const cibles = this.transitions[p.statut] || [];
    return Object.values(this.actionCatalog).filter(a => cibles.includes(a.cible));
  }

  actionsGroupees(p: Paiement, group: ActionConfig['group']): ActionConfig[] {
    return this.actionsFor(p).filter(a => a.group === group);
  }

  // ─── Menu ⋮ ───
  toggleDropdown(p: Paiement, event: MouseEvent): void {
    event.stopPropagation();
    if (this.dropdownOpenId === p.id) {
      this.closeDropdown();
      return;
    }
    this.dropdownOpenId = p.id;
    this.dropdownPaiement = p;
    this.dropdownAnchor = event.currentTarget as HTMLElement;
    this.positionDropdown();
    setTimeout(() => this.positionDropdown());
  }

  closeDropdown(): void {
    this.dropdownOpenId = null;
    this.dropdownPaiement = null;
    this.dropdownAnchor = null;
  }

  private positionDropdown(): void {
    if (!this.dropdownAnchor) return;
    const anchor = this.dropdownAnchor.getBoundingClientRect();
    const menu = this.dropdownMenuRef?.nativeElement;
    const height = menu?.offsetHeight || this.dropdownFallbackHeight;
    const width = menu?.offsetWidth || this.dropdownFallbackWidth;

    const spaceBelow = window.innerHeight - anchor.bottom - this.viewportMargin;
    const spaceAbove = anchor.top - this.viewportMargin;
    this.dropdownMenuUp = spaceBelow < height && spaceAbove > spaceBelow;

    const top = this.dropdownMenuUp
      ? anchor.top - height - this.dropdownGap
      : anchor.bottom + this.dropdownGap;

    this.dropdownTop = this.clamp(top, this.viewportMargin, window.innerHeight - height - this.viewportMargin);
    this.dropdownLeft = this.clamp(
      anchor.right - width,
      this.viewportMargin,
      window.innerWidth - width - this.viewportMargin
    );
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown') && !target.closest('.dropdown-menu')) {
      this.closeDropdown();
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.dropdownOpenId !== null) this.closeDropdown();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dropdownOpenId !== null) {
      this.closeDropdown();
      return;
    }
    if (this.activeAction) {
      this.closeActionModal();
      return;
    }
    if (this.showDetail) this.closeDetail();
  }

  // ─── Drawer ───
  openDetail(p: Paiement, tab: 'infos' | 'facture' = 'infos'): void {
    this.selected = p;
    this.detailTab = tab;
    this.showDetail = true;
    this.closeDropdown();
  }

  closeDetail(): void {
    this.showDetail = false;
    this.selected = null;
  }

  // ─── Actions ───
  openActionModal(p: Paiement, action: ActionConfig): void {
    this.actionTarget = p;
    this.activeAction = action;
    this.actionMotif = '';
    this.actionMontant = action.needsMontant ? p.montant : null;
    this.closeDropdown();
  }

  closeActionModal(): void {
    if (this.submitting) return;
    this.activeAction = null;
    this.actionTarget = null;
    this.actionMotif = '';
    this.actionMontant = null;
  }

  confirmAction(): void {
    const cible = this.actionTarget;
    const action = this.activeAction;
    if (!cible || !action) return;

    const payload: PaiementActionPayload = { action: action.action };
    if (this.actionMotif.trim()) payload.motif = this.actionMotif.trim();
    if (action.needsMontant && this.actionMontant !== null) {
      payload.remboursement_montant = this.actionMontant;
    }

    this.submitting = true;
    this.paiementService.action(cible.id, payload).subscribe({
      next: updated => {
        this.paiements = this.paiements.map(p => (p.id === updated.id ? updated : p));
        if (this.selected?.id === updated.id) this.selected = updated;
        this.applyFilters();
        this.submitting = false;
        this.activeAction = null;
        this.actionTarget = null;
        this.notify('success', `${action.label} : opération effectuée.`);
      },
      error: err => {
        this.submitting = false;
        this.notify('error', err?.error?.error || "L'opération a échoué.");
      }
    });
  }

  // ─── Facture ───
  numeroFacture(p: Paiement): string {
    const annee = new Date(p.date_creation).getFullYear() || new Date().getFullYear();
    return `FAC-${annee}-${String(p.id).padStart(5, '0')}`;
  }

  imprimerFacture(p: Paiement): void {
    const fenetre = window.open('', '_blank', 'width=900,height=1000');
    if (!fenetre) {
      this.notify('error', "L'impression a été bloquée par le navigateur.");
      return;
    }
    fenetre.document.write(this.factureHtml(p));
    fenetre.document.close();
    fenetre.focus();
    fenetre.print();
  }

  private factureHtml(p: Paiement): string {
    const montant = this.formatMontant(p.montant);
    const commission = this.formatMontant(this.commissionDe(p));
    const net = this.formatMontant(this.netFournisseur(p));
    const date = new Date(p.date_creation).toLocaleDateString('fr-FR');
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${this.numeroFacture(p)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 40px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #6b7280; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 26px; font-size: 13px; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
  td.num, th.num { text-align: right; }
  tfoot td { font-weight: bold; border-top: 2px solid #111827; border-bottom: none; }
</style></head><body>
<h1>Facture ${this.numeroFacture(p)}</h1>
<div class="muted">AutoMecaStore &middot; émise le ${date}</div>
<table>
  <tbody>
    <tr><th>Client</th><td>${p.client_nom || '—'}</td></tr>
    <tr><th>Commande</th><td>${p.commande_reference || '—'}</td></tr>
    <tr><th>Référence paiement</th><td>${p.reference}</td></tr>
    <tr><th>Moyen de paiement</th><td>${p.moyen_libelle}</td></tr>
    <tr><th>Statut</th><td>${this.statut(p).label}</td></tr>
  </tbody>
</table>
<table>
  <thead><tr><th>Désignation</th><th class="num">Montant</th></tr></thead>
  <tbody>
    <tr><td>Montant réglé par le client</td><td class="num">${montant}</td></tr>
    <tr><td>Commission AutoMecaStore (${COMMISSION_RATE * 100} %)</td><td class="num">- ${commission}</td></tr>
  </tbody>
  <tfoot><tr><td>Net reversé au fournisseur</td><td class="num">${net}</td></tr></tfoot>
</table>
</body></html>`;
  }

  formatMontant(valeur: number): string {
    return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valeur)} FCFA`;
  }

  // ─── Toasts ───
  private notify(type: ToastType, message: string): void {
    const toast: Toast = { id: ++this.toastSeq, type, message };
    this.toasts = [...this.toasts, toast];
    setTimeout(() => this.dismiss(toast.id), 4200);
  }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  trackById(_index: number, item: Paiement): number {
    return item.id;
  }
}
