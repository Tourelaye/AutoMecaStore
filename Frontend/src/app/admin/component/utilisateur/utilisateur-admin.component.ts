import { Component, OnInit, OnDestroy, Renderer2, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { AdminUtilisateurService } from '../../../core/services/admin-utilisateur.service';
import {
  AdminUtilisateur,
  UtilisateurDetail,
  UtilisateurStats,
  UtilisateurFilters,
  ActionPayload,
  NotificationGroupePayload
} from '../../../models/admin-utilisateur.model';

interface RoleConfig { label: string; icon: string; color: string; description: string; }
interface StatusConfig { label: string; icon: string; color: string; }

@Component({
  selector: 'app-utilisateur-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './utilisateur-admin.component.html',
  styleUrls: ['./utilisateur-admin.component.css']
})
export class UtilisateurAdminComponent implements OnInit, OnDestroy {

  // ───────────── DATA
  utilisateurs: AdminUtilisateur[] = [];
  filtered: AdminUtilisateur[] = [];
  stats: UtilisateurStats | null = null;
  loading = true;
  error: string | null = null;

  // ───────────── FILTERS
  filters: UtilisateurFilters = { role: 'tous', statut: 'tous' };
  searchTerm = '';

  roleOptions = [
    { value: 'tous', label: 'Tous les rôles' },
    { value: 'client', label: 'Clients' },
    { value: 'fournisseur', label: 'Fournisseurs' },
    { value: 'admin', label: 'Administrateurs' }
  ];

  statusOptions = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'actif', label: 'Actif' },
    { value: 'attente', label: 'En attente' },
    { value: 'suspendu', label: 'Suspendu' },
    { value: 'desactive', label: 'Désactivé' }
  ];

  periodeOptions = [
    { value: 'tous', label: 'Toutes dates' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' }
  ];

  // ───────────── DETAIL
  showDetail = false;
  selectedUtilisateur: UtilisateurDetail | null = null;
  detailLoading = false;
  detailTab: 'infos' | 'historique' | 'securite' = 'infos';

  // ───────────── MODALS
  modalAction: 'suspendre' | 'reactiver' | 'desactiver' | 'reset' | 'notifier' | 'supprimer' | 'modifier' | null = null;
  modalUtilisateur: AdminUtilisateur | null = null;
  modalData = {
    sujet: '',
    message: '',
    motif: '',
    newPassword: ''
  };
  modalLoading = false;

  // ───────────── NOTIFICATION GROUPE
  showNotificationModal = false;
  notificationPayload: NotificationGroupePayload = {
    cible: 'tous',
    sujet: '',
    message: ''
  };
  notificationLoading = false;

  // ───────────── NOTIFICATIONS
  notifications: { id: number; message: string; type: 'success' | 'error' | 'info' }[] = [];

  // ───────────── POLLING
  private polling?: Subscription;

  roleConfig: Record<string, RoleConfig> = {
    client: { label: 'Client', icon: 'bi-person', color: 'blue', description: 'Acheteur sur la marketplace' },
    fournisseur: { label: 'Fournisseur', icon: 'bi-shop', color: 'amber', description: 'Vendeur / magasin partenaire' },
    admin: { label: 'Administrateur', icon: 'bi-shield-lock', color: 'red', description: 'Gestionnaire de la plateforme' }
  };

  statusConfig: Record<string, StatusConfig> = {
    actif: { label: 'Actif', icon: 'bi-check-circle-fill', color: 'green' },
    attente: { label: 'En attente', icon: 'bi-hourglass-split', color: 'amber' },
    suspendu: { label: 'Suspendu', icon: 'bi-pause-circle-fill', color: 'red' },
    desactive: { label: 'Désactivé', icon: 'bi-x-circle-fill', color: 'gray' }
  };

  constructor(
    private adminUtilisateurService: AdminUtilisateurService,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.startPolling();
    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
  }

  // ─────────────────────────────────────────
  // CHARGEMENT
  // ─────────────────────────────────────────

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.loadUtilisateurs();
    this.loadStats();
  }

  loadUtilisateurs(): void {
    const filters: UtilisateurFilters = {
      ...this.filters,
      q: this.searchTerm?.trim() || undefined
    };
    this.adminUtilisateurService.getUtilisateurs(filters).subscribe({
      next: (list) => {
        this.utilisateurs = list;
        this.applyClientFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des utilisateurs.';
        console.error(err);
        this.loading = false;
      }
    });
  }

  loadStats(): void {
    this.adminUtilisateurService.getStats().subscribe({
      next: (s) => this.stats = s,
      error: (err) => console.error(err)
    });
  }

  startPolling(): void {
    this.polling = interval(30000).subscribe(() => {
      if (this.dropdownOpenId !== null || this.modalAction) return;
      this.loadUtilisateurs();
      this.loadStats();
    });
  }

  // ─────────────────────────────────────────
  // FILTRES
  // ─────────────────────────────────────────

  applyFiltersBackend(): void {
    this.loadUtilisateurs();
  }

  applyClientFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.utilisateurs.filter(u => {
      let ok = true;
      if (this.filters.role && this.filters.role !== 'tous') {
        ok = ok && u.role === this.filters.role;
      }
      if (this.filters.statut && this.filters.statut !== 'tous') {
        ok = ok && u.statut === this.filters.statut;
      }
      if (term) {
        const match =
          u.nom?.toLowerCase().includes(term) ||
          u.prenom?.toLowerCase().includes(term) ||
          u.nom_complet?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.telephone?.toLowerCase().includes(term) ||
          u.ville?.toLowerCase().includes(term);
        ok = ok && !!match;
      }
      return ok;
    });
  }

  onSearchChange(): void {
    this.applyClientFilters();
  }

  resetFilters(): void {
    this.filters = { role: 'tous', statut: 'tous' };
    this.searchTerm = '';
    this.applyFiltersBackend();
  }

  setFilter(key: keyof UtilisateurFilters, value: string): void {
    (this.filters as any)[key] = value || undefined;
    this.applyFiltersBackend();
  }

  // ─────────────────────────────────────────
  // AFFICHAGE
  // ─────────────────────────────────────────

  getRoleConfig(role: string): RoleConfig {
    return this.roleConfig[role] || { label: role, icon: 'bi-person', color: 'gray', description: '' };
  }

  getStatusConfig(statut: string): StatusConfig {
    return this.statusConfig[statut] || { label: statut, icon: 'bi-question-circle', color: 'gray' };
  }

  getInitials(u: AdminUtilisateur): string {
    return ((u.prenom?.[0] || '') + (u.nom?.[0] || '')).toUpperCase() || '?';
  }

  formatDate(d?: string | null): string {
    if (!d) return '-';
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatDateOnly(d?: string | null): string {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fr-FR');
  }

  trackByUserId(_: number, u: AdminUtilisateur): number {
    return u.id;
  }

  // ─────────────────────────────────────────
  // DÉTAIL
  // ─────────────────────────────────────────

  openDetail(u: AdminUtilisateur): void {
    this.detailLoading = true;
    this.showDetail = true;
    this.detailTab = 'infos';
    this.selectedUtilisateur = null;
    this.renderer.addClass(document.body, 'modal-open');
    const sidebar = document.querySelector('.sidebar');
    const header = document.querySelector('.admin-header');
    if (sidebar) this.renderer.addClass(sidebar, 'modal-hidden');
    if (header) this.renderer.addClass(header, 'modal-hidden');
    this.adminUtilisateurService.getUtilisateur(u.id).subscribe({
      next: (detail) => {
        this.selectedUtilisateur = detail;
        this.detailLoading = false;
      },
      error: (err) => {
        this.detailLoading = false;
        this.showNotification('Erreur lors du chargement du détail.', 'error');
      }
    });
  }

  closeDetail(): void {
    this.showDetail = false;
    this.selectedUtilisateur = null;
    this.renderer.removeClass(document.body, 'modal-open');
    const sidebar = document.querySelector('.sidebar');
    const header = document.querySelector('.admin-header');
    if (sidebar) this.renderer.removeClass(sidebar, 'modal-hidden');
    if (header) this.renderer.removeClass(header, 'modal-hidden');
  }

  switchTab(tab: 'infos' | 'historique' | 'securite'): void {
    this.detailTab = tab;
  }

  // ─────────────────────────────────────────
  // MODALS & ACTIONS
  // ─────────────────────────────────────────

  openActionModal(action: typeof this.modalAction, u: AdminUtilisateur): void {
    this.modalAction = action;
    this.modalUtilisateur = u;
    this.modalData = { sujet: '', message: '', motif: '', newPassword: '' };
    this.renderer.addClass(document.body, 'modal-open');
    const sidebar = document.querySelector('.sidebar');
    const header = document.querySelector('.admin-header');
    if (sidebar) this.renderer.addClass(sidebar, 'modal-hidden');
    if (header) this.renderer.addClass(header, 'modal-hidden');
  }

  closeModal(): void {
    this.modalAction = null;
    this.modalUtilisateur = null;
    this.modalLoading = false;
    this.renderer.removeClass(document.body, 'modal-open');
    const sidebar = document.querySelector('.sidebar');
    const header = document.querySelector('.admin-header');
    if (sidebar) this.renderer.removeClass(sidebar, 'modal-hidden');
    if (header) this.renderer.removeClass(header, 'modal-hidden');
  }

  confirmAction(): void {
    if (!this.modalAction || !this.modalUtilisateur) return;
    this.modalLoading = true;

    if (this.modalAction === 'modifier') {
      const data = {
        nom: this.modalUtilisateur.nom,
        prenom: this.modalUtilisateur.prenom,
        email: this.modalUtilisateur.email,
        telephone: this.modalUtilisateur.telephone,
        adresse: this.modalUtilisateur.adresse
      };
      this.adminUtilisateurService.updateUtilisateur(this.modalUtilisateur.id, data).subscribe({
        next: (detail) => {
          this.showNotification('Utilisateur mis à jour.', 'success');
          this.updateInList(detail);
          this.selectedUtilisateur = detail;
          this.closeModal();
          this.loadUtilisateurs();
        },
        error: (err) => {
          this.modalLoading = false;
          this.showNotification(err?.error?.error || 'Erreur lors de la mise à jour.', 'error');
        }
      });
      return;
    }

    if (this.modalAction === 'reset') {
      this.modalData.newPassword = this.generatePassword();
    }

    const payload: ActionPayload = {
      action: this.modalAction === 'supprimer' ? 'supprimer'
        : this.modalAction === 'desactiver' ? 'desactiver'
        : this.modalAction === 'reactiver' ? 'reactiver'
        : this.modalAction === 'suspendre' ? 'suspendre'
        : this.modalAction === 'reset' ? 'reset_password'
        : 'notifier',
      sujet: this.modalData.sujet,
      message: this.modalData.message,
      motif: this.modalData.motif,
      new_password: this.modalData.newPassword
    };

    this.adminUtilisateurService.action(this.modalUtilisateur.id, payload).subscribe({
      next: (res) => {
        this.showNotification(res.message, 'success');
        this.closeModal();
        this.loadUtilisateurs();
        if (this.selectedUtilisateur && this.selectedUtilisateur.id === this.modalUtilisateur!.id) {
          this.reloadDetail();
        }
      },
      error: (err) => {
        this.modalLoading = false;
        this.showNotification(err?.error?.error || 'Erreur lors de l\'action.', 'error');
      }
    });
  }

  generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return pwd;
  }

  reloadDetail(): void {
    if (!this.selectedUtilisateur) return;
    this.detailLoading = true;
    this.adminUtilisateurService.getUtilisateur(this.selectedUtilisateur.id).subscribe({
      next: (d) => { this.selectedUtilisateur = d; this.detailLoading = false; },
      error: () => { this.detailLoading = false; }
    });
  }

  updateInList(detail: UtilisateurDetail): void {
    const idx = this.utilisateurs.findIndex(u => u.id === detail.id);
    if (idx >= 0) {
      this.utilisateurs[idx] = { ...this.utilisateurs[idx], ...detail };
      this.applyClientFilters();
    }
  }

  // ─────────────────────────────────────────
  // DROPDOWN
  // ─────────────────────────────────────────
  @ViewChild('dropdownMenu') dropdownMenuRef?: ElementRef<HTMLElement>;

  dropdownOpenId: number | null = null;
  dropdownUser: AdminUtilisateur | null = null;
  dropdownMenuUp = false;
  dropdownTop = 0;
  dropdownLeft = 0;

  private dropdownAnchor: HTMLElement | null = null;
  private readonly dropdownFallbackWidth = 244;
  private readonly dropdownFallbackHeight = 280;
  private readonly dropdownGap = 6;
  private readonly viewportMargin = 12;

  toggleDropdown(u: AdminUtilisateur, event: MouseEvent): void {
    event.stopPropagation();
    if (this.dropdownOpenId === u.id) {
      this.closeDropdown();
      return;
    }
    this.dropdownOpenId = u.id;
    this.dropdownUser = u;
    this.dropdownAnchor = event.currentTarget as HTMLElement;
    this.positionDropdown();
    setTimeout(() => this.positionDropdown());
  }

  closeDropdown(): void {
    this.dropdownOpenId = null;
    this.dropdownUser = null;
    this.dropdownAnchor = null;
    this.dropdownMenuUp = false;
  }

  runDropdownAction(action: typeof this.modalAction, u: AdminUtilisateur): void {
    this.closeDropdown();
    this.openActionModal(action, u);
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
    this.dropdownLeft = this.clamp(anchor.right - width, this.viewportMargin, window.innerWidth - width - this.viewportMargin);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, Math.max(min, max)));
  }

  private onViewportChange = (): void => {
    if (this.dropdownOpenId !== null) this.closeDropdown();
  };

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown') && !target.closest('.dropdown-menu')) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDropdown();
  }

  // ─────────────────────────────────────────
  // NOTIFICATIONS GROUPE
  // ─────────────────────────────────────────

  openNotificationModal(): void {
    this.showNotificationModal = true;
    this.notificationPayload = { cible: 'tous', sujet: '', message: '' };
  }

  closeNotificationModal(): void {
    this.showNotificationModal = false;
    this.notificationLoading = false;
  }

  sendGroupNotification(): void {
    if (!this.notificationPayload.message.trim()) {
      this.showNotification('Le message est obligatoire.', 'error');
      return;
    }
    this.notificationLoading = true;
    this.adminUtilisateurService.sendNotification(this.notificationPayload).subscribe({
      next: (res) => {
        this.showNotification(res.message, 'success');
        this.closeNotificationModal();
      },
      error: (err) => {
        this.notificationLoading = false;
        this.showNotification(err?.error?.error || 'Erreur lors de l\'envoi.', 'error');
      }
    });
  }

  // ─────────────────────────────────────────
  // NOTIFICATIONS TOAST
  // ─────────────────────────────────────────

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const id = Date.now() + Math.random();
    this.notifications.push({ id, message, type });
    setTimeout(() => this.notifications = this.notifications.filter(n => n.id !== id), 5000);
  }

  removeNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  // ─────────────────────────────────────────
  // STATS HELPERS
  // ─────────────────────────────────────────

  getCountForRole(role: string): number {
    if (!this.stats) return 0;
    if (role === 'client') return this.stats.clients;
    if (role === 'fournisseur') return this.stats.fournisseurs;
    if (role === 'admin') return this.stats.administrateurs;
    return 0;
  }
}
