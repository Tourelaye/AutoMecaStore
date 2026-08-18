import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subject, takeUntil } from 'rxjs';
import {
  Commande as ApiCommande,
  CommandeService,
  HistoriqueCommande as ApiHistorique,
  LigneCommande as ApiLigne,
  StatutCommande
} from '../../services/commande.service';

// ── View Models ─────────────────────────────────────────────────────────
interface LigneProduitVM {
  nom: string;
  image: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
}

interface HistoriqueVM {
  statut: StatutCommande;
  label: string;
  icon: string;
  commentaire: string;
  motif: string;
  utilisateur: string;
  date: string;
  heure: string;
  rawDate: string;
}

interface CommandeVM {
  id: number;
  reference: string;
  numero: string;
  rawDate: string;
  date: string;
  heure: string;
  statut: StatutCommande;
  clientNom: string;
  clientPrenom: string;
  client: string;
  adresse: string;
  telephone: string;
  email: string;
  produit: string;
  produitImage: string;
  quantite: number;
  prixUnitaire: number;
  montant_total: number;
  frais_livraison: number;
  total: number;
  mode_paiement: string;
  mode_paiement_label: string;
  mode_reception: 'livraison' | 'retrait_magasin';
  mode_reception_label: string;
  commentaire_fournisseur: string;
  lignes: LigneProduitVM[];
  historique: HistoriqueVM[];
}

interface StatutMeta {
  value: StatutCommande;
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  class: string;
  description: string;
}

interface ActionMeta {
  value: StatutCommande;
  label: string;
  icon: string;
  requiresMotif: boolean;
  color: string;
}

interface StatutTab {
  key: string;
  label: string;
  values: StatutCommande[];
}

// ── Constantes ────────────────────────────────────────────────────────
const STATUTS: StatutMeta[] = [
  { value: 'nouvelle_commande', label: 'Nouvelle commande', icon: 'bi-bag-plus-fill', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', class: 'st-nouvelle', description: 'Commande reçue, en attente de traitement.' },
  { value: 'en_attente_confirmation', label: 'En attente de confirmation', icon: 'bi-hourglass-split', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', class: 'st-attente', description: 'La commande est en attente de validation.' },
  { value: 'acceptee', label: 'Acceptée', icon: 'bi-check-circle-fill', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', class: 'st-acceptee', description: 'Le fournisseur a accepté la commande.' },
  { value: 'en_preparation', label: 'En préparation', icon: 'bi-fire', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', class: 'st-preparation', description: 'Les articles sont en cours de préparation.' },
  { value: 'prete_a_retirer', label: 'Prête à être retirée', icon: 'bi-shop', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)', class: 'st-prete', description: 'La commande est prête à être retirée en magasin.' },
  { value: 'en_cours_livraison', label: 'En cours de livraison', icon: 'bi-truck', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', class: 'st-cours', description: 'La commande est en route vers le client.' },
  { value: 'livree', label: 'Livrée', icon: 'bi-box-seam', color: '#14b8a6', bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.35)', class: 'st-livree', description: 'La commande a été livrée au client.' },
  { value: 'terminee', label: 'Terminée', icon: 'bi-check-all', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', class: 'st-terminee', description: 'Commande terminée et confirmée.' },
  { value: 'refusee', label: 'Refusée', icon: 'bi-x-octagon-fill', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', class: 'st-refusee', description: 'Le fournisseur a refusé la commande.' },
  { value: 'annulee', label: 'Annulée', icon: 'bi-ban', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.35)', class: 'st-annulee', description: 'La commande a été annulée.' }
];

const ACTIONS: Partial<Record<StatutCommande, ActionMeta>> = {
  acceptee: { value: 'acceptee', label: 'Accepter', icon: 'bi-check-lg', requiresMotif: false, color: '#3b82f6' },
  en_preparation: { value: 'en_preparation', label: 'Commencer la préparation', icon: 'bi-fire', requiresMotif: false, color: '#6366f1' },
  prete_a_retirer: { value: 'prete_a_retirer', label: 'Marquer prête à être retirée', icon: 'bi-shop', requiresMotif: false, color: '#8b5cf6' },
  en_cours_livraison: { value: 'en_cours_livraison', label: 'Marquer en cours de livraison', icon: 'bi-truck', requiresMotif: false, color: '#f97316' },
  livree: { value: 'livree', label: 'Marquer livrée', icon: 'bi-box-seam', requiresMotif: false, color: '#14b8a6' },
  terminee: { value: 'terminee', label: 'Terminer', icon: 'bi-check-all', requiresMotif: false, color: '#10b981' },
  refusee: { value: 'refusee', label: 'Refuser', icon: 'bi-x-lg', requiresMotif: true, color: '#ef4444' },
  annulee: { value: 'annulee', label: 'Annuler', icon: 'bi-ban', requiresMotif: true, color: '#6b7280' }
};

const MODE_PAIEMENT_LABELS: Record<string, string> = {
  especes: 'Espèces',
  carte: 'Carte bancaire',
  mobile_money: 'Mobile Money',
  virement: 'Virement',
  a_la_livraison: 'Paiement à la livraison'
};

const MODE_RECEPTION_LABELS: Record<string, string> = {
  livraison: 'Livraison à domicile',
  retrait_magasin: 'Retrait en magasin'
};

@Component({
  selector: 'app-liste-commandes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
    ]),
    trigger('modalIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.96)' }),
        animate('180ms ease', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease', style({ opacity: 0, transform: 'scale(0.96)' }))
      ])
    ])
  ]
})
export class ListeCommandesComponent implements OnInit, OnDestroy {

  Math = Math;
  private destroy$ = new Subject<void>();

  // ── État ──────────────────────────────────────────────────────────────
  isLoading = false;
  updatingId: number | null = null;
  dropdownOpenId: number | null = null;

  // ── Drawer & Modals ───────────────────────────────────────────────────
  selectedCommande: CommandeVM | null = null;
  actionModal = { visible: false, commande: null as CommandeVM | null, action: null as ActionMeta | null };

  // ── Forms ─────────────────────────────────────────────────────────────
  filtersForm: FormGroup;
  motifForm: FormGroup;
  commentForm: FormGroup;

  // ── Filtres / Tabs ─────────────────────────────────────────────────────
  statutTabs: StatutTab[] = [
    { key: '', label: 'Toutes', values: [] },
    { key: 'nouvelles', label: 'Nouvelles', values: ['nouvelle_commande', 'en_attente_confirmation'] },
    { key: 'preparation', label: 'En préparation', values: ['en_preparation'] },
    { key: 'livrees', label: 'Livrées', values: ['livree', 'terminee'] },
    { key: 'annulees', label: 'Annulées', values: ['annulee', 'refusee'] }
  ];

  sortField = 'rawDate';
  sortDir: 'asc' | 'desc' = 'desc';

  // ── Pagination ───────────────────────────────────────────────────────
  currentPage = 1;
  pageSize = 8;

  // ── Données ──────────────────────────────────────────────────────────
  commandes: CommandeVM[] = [];
  filteredCommandes: CommandeVM[] = [];

  // ── Toast ────────────────────────────────────────────────────────────
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  constructor(
    private commandeService: CommandeService,
    private fb: FormBuilder
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      statut: [''],
      date: ['']
    });
    this.motifForm = this.fb.group({
      motif: ['', Validators.required],
      commentaire: ['']
    });
    this.commentForm = this.fb.group({
      commentaire: ['']
    });
  }

  ngOnInit(): void {
    this.loadCommandes();
    this.filtersForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Chargement ────────────────────────────────────────────────────────
  private loadCommandes(): void {
    this.isLoading = true;
    this.commandeService.getCommandes().subscribe({
      next: (data) => {
        this.commandes = data.map(c => this.mapCommande(c));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.showToast('Erreur lors du chargement des commandes', 'error');
        this.isLoading = false;
      }
    });
  }

  private mapCommande(api: ApiCommande): CommandeVM {
    const client = api.client;
    const nomComplet = client ? `${client.prenom} ${client.nom}`.trim() : 'Client';
    const lignes: LigneProduitVM[] = (api.lignes || []).map((l: ApiLigne) => {
      const p = l.produit;
      return {
        nom: p?.nom || l.produit_nom || 'Produit',
        image: p?.image_url || p?.image || '',
        quantite: l.quantite,
        prixUnitaire: l.prix_unitaire,
        sousTotal: l.sous_total ?? l.prix_unitaire * l.quantite
      };
    });
    const first = lignes[0];

    const historique: HistoriqueVM[] = (api.historique || []).map((h: ApiHistorique) => ({
      statut: h.statut as StatutCommande,
      label: this.getStatutLabel(h.statut as StatutCommande),
      icon: this.getStatutIcon(h.statut as StatutCommande),
      commentaire: h.commentaire || '',
      motif: h.motif || '',
      utilisateur: h.utilisateur || 'Système',
      date: this.formatDate(h.date),
      heure: this.formatTime(h.date),
      rawDate: h.date
    })).sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

    return {
      id: api.id,
      reference: api.reference || '',
      numero: api.reference || `CMD-${api.id}`,
      rawDate: api.date_commande,
      date: this.formatDate(api.date_commande),
      heure: this.formatTime(api.date_commande),
      statut: api.statut as StatutCommande,
      clientNom: client?.nom || '',
      clientPrenom: client?.prenom || '',
      client: nomComplet,
      adresse: client?.adresse || 'Adresse inconnue',
      telephone: client?.telephone || 'Non renseigné',
      email: client?.email || '',
      produit: first?.nom || 'Produit',
      produitImage: first?.image || '',
      quantite: first?.quantite || 0,
      prixUnitaire: first?.prixUnitaire || 0,
      montant_total: api.montant_total || 0,
      frais_livraison: api.frais_livraison || 0,
      total: (api.montant_total || 0) + (api.frais_livraison || 0),
      mode_paiement: api.mode_paiement || '',
      mode_paiement_label: MODE_PAIEMENT_LABELS[api.mode_paiement || ''] || (api.mode_paiement || 'Non défini'),
      mode_reception: api.mode_reception || 'livraison',
      mode_reception_label: MODE_RECEPTION_LABELS[api.mode_reception || ''] || 'Livraison',
      commentaire_fournisseur: api.commentaire_fournisseur || '',
      lignes,
      historique
    };
  }

  private refreshCommandeInList(cmd: ApiCommande): void {
    const mapped = this.mapCommande(cmd);
    const idx = this.commandes.findIndex(c => c.id === mapped.id);
    if (idx !== -1) this.commandes[idx] = mapped;
    this.applyFilters();
    if (this.selectedCommande?.id === mapped.id) {
      this.selectedCommande = mapped;
      this.commentForm.patchValue({ commentaire: mapped.commentaire_fournisseur });
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────────────
  get statsCards() {
    const todayStr = new Date().toLocaleDateString('fr-CA');
    const nouvelles = this.commandes.filter(c => ['nouvelle_commande', 'en_attente_confirmation'].includes(c.statut)).length;
    const aujourdhui = this.commandes.filter(c => new Date(c.rawDate).toLocaleDateString('fr-CA') === todayStr).length;
    const preparation = this.commandes.filter(c => c.statut === 'en_preparation').length;
    const terminees = this.commandes.filter(c => c.statut === 'terminee').length;
    const annulees = this.commandes.filter(c => ['annulee', 'refusee'].includes(c.statut)).length;

    return [
      { label: 'Nouvelles commandes', count: nouvelles, icon: 'bi-bag-plus-fill', bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
      { label: 'Commandes aujourd\'hui', count: aujourdhui, icon: 'bi-calendar-check', bg: 'rgba(45,212,191,0.12)', color: '#2dd4bf' },
      { label: 'Commandes en préparation', count: preparation, icon: 'bi-fire', bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
      { label: 'Commandes terminées', count: terminees, icon: 'bi-check-all', bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
      { label: 'Commandes annulées', count: annulees, icon: 'bi-ban', bg: 'rgba(107,114,128,0.12)', color: '#6b7280' }
    ];
  }

  // ── Pagination ───────────────────────────────────────────────────────
  get totalPages() { return Math.ceil(this.filteredCommandes.length / this.pageSize); }
  get pageNumbers() { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get paginatedCommandes() {
    const s = (this.currentPage - 1) * this.pageSize;
    return this.filteredCommandes.slice(s, s + this.pageSize);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  // ── Filtres ─────────────────────────────────────────────────────────
  applyFilters(): void {
    let r = [...this.commandes];
    const { search, statut, date } = this.filtersForm.value;

    if (search?.trim()) {
      const t = search.toLowerCase();
      r = r.filter(c =>
        c.numero.toLowerCase().includes(t) ||
        c.client.toLowerCase().includes(t) ||
        c.email.toLowerCase().includes(t) ||
        c.telephone.includes(t) ||
        c.produit.toLowerCase().includes(t)
      );
    }

    if (statut) {
      const tab = this.statutTabs.find(t => t.key === statut);
      const values = tab ? tab.values : [statut as StatutCommande];
      r = r.filter(c => values.includes(c.statut));
    }

    if (date) {
      const selectedDate = new Date(date).toLocaleDateString('fr-CA');
      r = r.filter(c => new Date(c.rawDate).toLocaleDateString('fr-CA') === selectedDate);
    }

    r.sort((a, b) => {
      let va: any = a[this.sortField as keyof CommandeVM];
      let vb: any = b[this.sortField as keyof CommandeVM];
      if (this.sortField === 'rawDate') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    this.filteredCommandes = r;
    this.currentPage = 1;
  }

  selectStatutGroup(key: string): void {
    const current = this.filtersForm.value.statut;
    this.filtersForm.get('statut')?.setValue(current === key ? '' : key, { emitEvent: true });
  }

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

  getCount(key: string): number {
    if (!key) return this.commandes.length;
    const tab = this.statutTabs.find(t => t.key === key);
    const values = tab?.values || [key as StatutCommande];
    return this.commandes.filter(c => values.includes(c.statut)).length;
  }

  // ── Drawer ──────────────────────────────────────────────────────────
  openDetail(cmd: CommandeVM): void {
    this.selectedCommande = cmd;
    this.commentForm.patchValue({ commentaire: cmd.commentaire_fournisseur || '' });
  }

  closeDetail(): void {
    this.selectedCommande = null;
  }

  // ── Actions statut ──────────────────────────────────────────────────
  getActions(cmd: CommandeVM): ActionMeta[] {
    const base = this.getTransitions(cmd.statut, cmd.mode_reception);
    return base
      .map(t => ACTIONS[t.value])
      .filter((a): a is ActionMeta => !!a);
  }

  getPrimaryAction(cmd: CommandeVM): ActionMeta | null {
    return this.getActions(cmd)[0] || null;
  }

  getOtherActions(cmd: CommandeVM): ActionMeta[] {
    return this.getActions(cmd).slice(1);
  }

  private getTransitions(statut: StatutCommande, mode: 'livraison' | 'retrait_magasin'): { value: StatutCommande; primary?: boolean }[] {
    switch (statut) {
      case 'nouvelle_commande':
        return [{ value: 'acceptee', primary: true }, { value: 'refusee' }, { value: 'annulee' }];
      case 'en_attente_confirmation':
        return [{ value: 'acceptee', primary: true }, { value: 'refusee' }, { value: 'annulee' }];
      case 'acceptee':
        return [{ value: 'en_preparation', primary: true }, { value: 'annulee' }];
      case 'en_preparation':
        return mode === 'retrait_magasin'
          ? [{ value: 'prete_a_retirer', primary: true }, { value: 'en_cours_livraison' }, { value: 'annulee' }]
          : [{ value: 'en_cours_livraison', primary: true }, { value: 'prete_a_retirer' }, { value: 'annulee' }];
      case 'prete_a_retirer':
        return [{ value: 'terminee', primary: true }, { value: 'annulee' }];
      case 'en_cours_livraison':
        return [{ value: 'livree', primary: true }, { value: 'annulee' }];
      case 'livree':
        return [{ value: 'terminee', primary: true }];
      default:
        return [];
    }
  }

  handleAction(cmd: CommandeVM, action: ActionMeta, event?: Event): void {
    event?.stopPropagation();
    this.dropdownOpenId = null;
    if (action.requiresMotif) {
      this.actionModal = { visible: true, commande: cmd, action };
      this.motifForm.reset({ motif: '', commentaire: cmd.commentaire_fournisseur || '' });
    } else {
      this.doChangeStatut(cmd, action.value);
    }
  }

  openDropdown(cmd: CommandeVM, event: Event): void {
    event.stopPropagation();
    this.dropdownOpenId = this.dropdownOpenId === cmd.id ? null : cmd.id;
  }

  @HostListener('document:click')
  onDocClick(): void { this.dropdownOpenId = null; }

  closeActionModal(): void {
    this.actionModal.visible = false;
    this.actionModal.commande = null;
    this.actionModal.action = null;
  }

  confirmAction(): void {
    if (this.motifForm.invalid) {
      this.motifForm.markAllAsTouched();
      return;
    }
    const { motif, commentaire } = this.motifForm.value;
    const cmd = this.actionModal.commande;
    const action = this.actionModal.action;
    if (!cmd || !action) return;
    this.doChangeStatut(cmd, action.value, motif, commentaire, commentaire);
    this.closeActionModal();
  }

  private doChangeStatut(
    cmd: CommandeVM,
    newStatut: StatutCommande,
    motif?: string,
    commentaire?: string,
    commentaireFournisseur?: string
  ): void {
    this.updatingId = cmd.id;
    this.commandeService.updateCommandeStatut(cmd.id, newStatut, motif, commentaire, commentaireFournisseur).subscribe({
      next: (updated) => {
        this.refreshCommandeInList(updated);
        this.updatingId = null;
        this.showToast(`Statut mis à jour : ${this.getStatutLabel(updated.statut as StatutCommande)}`, 'success');
      },
      error: (err) => {
        this.updatingId = null;
        this.showToast(err?.error?.error || 'Impossible de mettre à jour le statut', 'error');
      }
    });
  }

  saveCommentaire(): void {
    if (!this.selectedCommande) return;
    const commentaire = this.commentForm.value.commentaire || '';
    this.updatingId = this.selectedCommande.id;
    this.commandeService.updateCommentaireFournisseur(this.selectedCommande.id, commentaire).subscribe({
      next: (updated) => {
        this.refreshCommandeInList(updated);
        this.updatingId = null;
        this.showToast('Remarque enregistrée', 'success');
      },
      error: () => {
        this.updatingId = null;
        this.showToast('Erreur lors de l\'enregistrement de la remarque', 'error');
      }
    });
  }

  // ── Statuts helpers ───────────────────────────────────────────────────
  getStatutMeta(statut: StatutCommande): StatutMeta {
    return STATUTS.find(s => s.value === statut) ?? STATUTS[0];
  }

  getStatutLabel(statut: StatutCommande): string {
    return this.getStatutMeta(statut).label;
  }

  getStatutIcon(statut: StatutCommande): string {
    return this.getStatutMeta(statut).icon;
  }

  getStatutDescription(statut: StatutCommande): string {
    return this.getStatutMeta(statut).description;
  }

  getStatutStyle(statut: StatutCommande): { background: string; color: string; border: string } {
    const s = this.getStatutMeta(statut);
    return { background: s.bg, color: s.color, border: `1px solid ${s.border}` };
  }

  getActionStyle(action: ActionMeta): Record<string, string> {
    return { background: action.color, color: '#fff' };
  }

  isRowInactive(statut: StatutCommande): boolean {
    return statut === 'annulee' || statut === 'refusee' || statut === 'terminee';
  }

  // ── Timeline ──────────────────────────────────────────────────────────
  isHistoryStepCurrent(step: HistoriqueVM, idx: number): boolean {
    return idx === (this.selectedCommande?.historique.length ?? 0) - 1;
  }

  // ── Formats ─────────────────────────────────────────────────────────
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
    this.toastMsg = msg;
    this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMsg = ''; }, 3500);
  }
}