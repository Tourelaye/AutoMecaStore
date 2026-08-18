import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AvisService,
  AvisList,
  AvisDetail,
  AvisStats,
  AvisFilters,
  Signalement,
} from './avis.service';

type ModalAction = 'repondre' | 'signaler' | 'supprimer' | null;

@Component({
  selector: 'app-avis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './avis.component.html',
  styleUrls: ['./avis.component.css']
})
export class AvisComponent implements OnInit, OnDestroy {

  avisList: AvisList[] = [];
  stats: AvisStats | null = null;
  loading = true;
  error: string | null = null;

  filters: AvisFilters = {};
  searchTerm = '';

  noteOptions = [
    { value: 'toutes', label: 'Toutes les notes' },
    { value: '5', label: '5 étoiles' },
    { value: '4', label: '4 étoiles' },
    { value: '3', label: '3 étoiles' },
    { value: '2', label: '2 étoiles' },
    { value: '1', label: '1 étoile' },
  ];

  statutOptions = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'visible', label: 'Visible' },
    { value: 'masque', label: 'Masqué' },
    { value: 'moderation_requise', label: 'Modération requise' },
  ];

  periodeOptions = [
    { value: 'tous', label: 'Toutes dates' },
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
  ];

  tabs = [
    { key: 'infos', label: 'Informations', icon: 'bi-info-circle' },
    { key: 'signalements', label: 'Signalements', icon: 'bi-flag' },
    { key: 'photos', label: 'Photos', icon: 'bi-images' },
  ];

  selectedAvis: AvisDetail | null = null;
  detailLoading = false;
  detailTab = 0;
  showDetail = false;

  activeModal: ModalAction = null;
  modalAvis: AvisList | AvisDetail | null = null;
  modalData = {
    reponse_admin: '',
    motif: 'inapproprie',
    commentaire: '',
  };
  modalLoading = false;

  notifications: { id: number; message: string; type: 'success' | 'error' | 'info' }[] = [];

  @ViewChild('dropdownMenu') dropdownMenuRef?: ElementRef<HTMLElement>;
  dropdownOpenId: number | null = null;
  dropdownAvis: AvisList | null = null;
  dropdownMenuUp = false;
  dropdownTop = 0;
  dropdownLeft = 0;

  private dropdownAnchor: HTMLElement | null = null;
  private readonly dropdownFallbackWidth = 250;
  private readonly dropdownFallbackHeight = 300;
  private readonly dropdownGap = 6;
  private readonly viewportMargin = 12;

  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor(private avisService: AvisService) {}

  ngOnInit(): void {
    this.loadData();
    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.loadAvis();
    this.loadStats();
  }

  loadAvis(): void {
    const f: AvisFilters = { ...this.filters, q: this.searchTerm.trim() || undefined };
    this.avisService.getAvis(f).subscribe({
      next: (list) => {
        this.avisList = list;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement des avis.';
        this.loading = false;
      }
    });
  }

  loadStats(): void {
    this.avisService.getStats().subscribe({
      next: (s) => this.stats = s,
      error: (err) => console.error(err)
    });
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadAvis(), 300);
  }

  onFilterChange(): void {
    this.loadAvis();
  }

  resetFilters(): void {
    this.filters = {};
    this.searchTerm = '';
    this.loadAvis();
  }

  trackById(_: number, a: AvisList): number {
    return a.id;
  }

  openDetail(a: AvisList): void {
    this.closeDropdown();
    this.showDetail = true;
    this.detailLoading = true;
    this.selectedAvis = null;
    this.detailTab = 0;
    this.avisService.getAvisDetail(a.id).subscribe({
      next: (detail) => { this.selectedAvis = detail; this.detailLoading = false; },
      error: () => { this.detailLoading = false; this.showNotification('Erreur chargement détail', 'error'); }
    });
  }

  closeDetail(): void {
    this.showDetail = false;
    this.selectedAvis = null;
  }

  formatDate(d?: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR');
  }

  formatDateOnly(d?: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR');
  }

  stars(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < rating);
  }

  getStatutLabel(a: AvisList): string {
    if (a.signale_en_attente) return 'Modération requise';
    return a.approuve ? 'Visible' : 'Masqué';
  }

  getStatutColor(a: AvisList): string {
    if (a.signale_en_attente) return 'red';
    return a.approuve ? 'green' : 'gray';
  }

  getStatutIcon(a: AvisList): string {
    if (a.signale_en_attente) return 'bi-exclamation-triangle-fill';
    return a.approuve ? 'bi-check-circle-fill' : 'bi-eye-slash';
  }

  toggleVisibilityDetail(a: AvisDetail): void {
    const action = a.approuve ? 'masquer' : 'approuver';
    this.avisService.action(a.id, { action }).subscribe({
      next: (res) => {
        if (this.selectedAvis?.id === a.id) {
          this.selectedAvis = res.avis;
        }
        this.showNotification(action === 'approuver' ? 'Avis rendu visible' : 'Avis masqué', 'success');
        this.loadAvis();
        this.loadStats();
      },
      error: (err) => this.showNotification(err?.error?.error || 'Erreur', 'error')
    });
  }

  // ───── Menu d'actions ─────
  toggleDropdown(a: AvisList, event: MouseEvent): void {
    event.stopPropagation();
    if (this.dropdownOpenId === a.id) {
      this.closeDropdown();
      return;
    }
    this.dropdownOpenId = a.id;
    this.dropdownAvis = a;
    this.dropdownAnchor = event.currentTarget as HTMLElement;
    this.positionDropdown();
    setTimeout(() => this.positionDropdown());
  }

  closeDropdown(): void {
    this.dropdownOpenId = null;
    this.dropdownAvis = null;
    this.dropdownAnchor = null;
    this.dropdownMenuUp = false;
  }

  runDropdownAction(action: ModalAction, a: AvisList): void {
    this.closeDropdown();
    if (action) this.openActionModal(action, a);
  }

  toggleVisibility(a: AvisList): void {
    this.closeDropdown();
    const action = a.approuve ? 'masquer' : 'approuver';
    this.avisService.action(a.id, { action }).subscribe({
      next: () => { this.showNotification(action === 'approuver' ? 'Avis rendu visible' : 'Avis masqué', 'success'); this.loadAvis(); this.loadStats(); },
      error: (err) => this.showNotification(err?.error?.error || 'Erreur', 'error')
    });
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
    if (this.dropdownOpenId !== null) { this.closeDropdown(); return; }
    if (this.activeModal) { this.closeActionModal(); return; }
    if (this.showDetail) this.closeDetail();
  }

  // ───── Actions ─────
  openActionModal(action: ModalAction, a: AvisList | AvisDetail): void {
    this.activeModal = action;
    this.modalAvis = a;
    this.modalData = {
      reponse_admin: '',
      motif: 'inapproprie',
      commentaire: '',
    };
  }

  closeActionModal(): void {
    this.activeModal = null;
    this.modalAvis = null;
    this.modalLoading = false;
  }

  modalTitle(): string {
    const titles: Record<string, string> = {
      repondre: 'Répondre à l\'avis',
      signaler: 'Signaler l\'avis',
      supprimer: 'Supprimer l\'avis',
    };
    return this.activeModal ? titles[this.activeModal] : '';
  }

  confirmAction(): void {
    const a = this.modalAvis;
    if (!a || !this.activeModal) return;
    this.modalLoading = true;
    const id = a.id;

    switch (this.activeModal) {
      case 'repondre':
        if (!this.modalData.reponse_admin.trim()) { this.modalLoading = false; return; }
        this.avisService.action(id, { action: 'repondre', reponse_admin: this.modalData.reponse_admin.trim() }).subscribe({
          next: (res) => {
            if (this.selectedAvis?.id === id) {
              this.selectedAvis = res.avis;
            }
            this.showNotification(res.message, 'success');
            this.closeActionModal();
            this.loadAvis();
            this.loadStats();
          },
          error: (err) => { this.modalLoading = false; this.showNotification(err?.error?.error || 'Erreur', 'error'); }
        });
        break;

      case 'signaler':
        this.avisService.action(id, { action: 'signaler', motif: this.modalData.motif, commentaire: this.modalData.commentaire }).subscribe({
          next: (res) => {
            if (this.selectedAvis?.id === id) {
              this.selectedAvis = res.avis;
            }
            this.showNotification(res.message, 'success');
            this.closeActionModal();
            this.loadAvis();
            this.loadStats();
          },
          error: (err) => { this.modalLoading = false; this.showNotification(err?.error?.error || 'Erreur', 'error'); }
        });
        break;

      case 'supprimer':
        this.avisService.action(id, { action: 'supprimer' }).subscribe({
          next: () => {
            this.showNotification('Avis supprimé', 'success');
            this.closeActionModal();
            if (this.showDetail && this.selectedAvis?.id === id) this.closeDetail();
            this.loadAvis();
            this.loadStats();
          },
          error: (err) => { this.modalLoading = false; this.showNotification(err?.error?.error || 'Erreur', 'error'); }
        });
        break;
    }
  }

  // ───── Signalements dans le drawer ─────
  traiterSignalement(s: Signalement, statut: string): void {
    if (!this.selectedAvis) return;
    this.avisService.updateSignalement(this.selectedAvis.id, s.id, statut).subscribe({
      next: (updated) => {
        if (this.selectedAvis) {
          this.selectedAvis.signalements = this.selectedAvis.signalements.map(x =>
            x.id === updated.id ? updated : x
          );
        }
        this.showNotification(statut === 'traite' ? 'Signalement traité' : 'Signalement rejeté', 'success');
        this.loadAvis();
        this.loadStats();
      },
      error: (err) => this.showNotification(err?.error?.error || 'Erreur', 'error')
    });
  }

  // ───── Utilitaires ─────
  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const id = Date.now() + Math.random();
    this.notifications.push({ id, message, type });
    setTimeout(() => this.notifications = this.notifications.filter(n => n.id !== id), 5000);
  }

  removeNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  getMotifLabel(motif: string): string {
    const map: Record<string, string> = {
      faux: 'Faux avis',
      inapproprie: 'Contenu inapproprié',
      offensant: 'Langage offensant',
      insulte: 'Insulte',
      spam: 'Spam',
      informations_fausses: 'Informations fausses',
      autre: 'Autre',
    };
    return map[motif] || motif;
  }

  getMotifIcon(motif: string): string {
    const map: Record<string, string> = {
      faux: 'bi-x-circle',
      inapproprie: 'bi-exclamation-triangle',
      offensant: 'bi-emoji-frown',
      insulte: 'bi-shield-exclamation',
      spam: 'bi-trash',
      informations_fausses: 'bi-question-circle',
      autre: 'bi-dot',
    };
    return map[motif] || 'bi-dot';
  }

  hasPendingSignalements(avis: AvisDetail | null): boolean {
    return !!(avis?.signalements && avis.signalements.some(s => s.statut === 'en_attente'));
  }

  getDetailStatutColor(avis: AvisDetail | null): string {
    if (this.hasPendingSignalements(avis)) return 'red';
    return avis?.approuve ? 'green' : 'gray';
  }

  getDetailStatutLabel(avis: AvisDetail | null): string {
    if (this.hasPendingSignalements(avis)) return 'Modération requise';
    return avis?.approuve ? 'Visible' : 'Masqué';
  }

  getPhotos(avis: AvisDetail | null): string[] {
    if (!avis || !avis.photos) return [];
    if (Array.isArray(avis.photos)) return avis.photos;
    if (typeof avis.photos === 'string') {
      try {
        const parsed = JSON.parse(avis.photos);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}