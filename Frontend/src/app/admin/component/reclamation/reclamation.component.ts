import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ReclamationService } from '../../../core/services/reclamation.service';
import {
  Reclamation,
  ReclamationFilters,
  ReclamationStats,
  ReclamationActionPayload,
  MessagePayload,
  StatutConfig,
  PrioriteConfig
} from '../../../models/reclamation.model';

type ModalAction = 'statut' | 'priorite' | 'assigner' | 'note' | 'resoudre' | 'rejeter' | 'fermer' | 'demande_infos' | null;

@Component({
  selector: 'app-reclamation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reclamation.component.html',
  styleUrls: ['./reclamation.component.css']
})
export class ReclamationComponent implements OnInit, OnDestroy {

  reclamations: Reclamation[] = [];
  stats: ReclamationStats | null = null;
  loading = true;
  error: string | null = null;

  filters: ReclamationFilters = {};
  searchTerm = '';

  statutOptions = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'nouveau', label: 'Nouveau' },
    { value: 'en_cours_analyse', label: 'En cours d\'analyse' },
    { value: 'en_attente_infos', label: 'En attente d\'infos' },
    { value: 'resolu', label: 'Résolu' },
    { value: 'rejete', label: 'Rejeté' },
    { value: 'ferme', label: 'Fermé' },
    { value: 'ouverts', label: 'Ouverts' },
    { value: 'urgents', label: 'Urgents' },
  ];

  prioriteOptions = [
    { value: 'tous', label: 'Toutes priorités' },
    { value: 'faible', label: 'Faible' },
    { value: 'normale', label: 'Normale' },
    { value: 'elevee', label: 'Élevée' },
    { value: 'urgente', label: 'Urgente' }
  ];

  motifOptions = [
    { value: 'tous', label: 'Tous les motifs' },
    { value: 'produit_non_conforme', label: 'Produit non conforme' },
    { value: 'produit_defectueux', label: 'Produit défectueux' },
    { value: 'produit_manquant', label: 'Produit manquant' },
    { value: 'livraison_retardee', label: 'Livraison retardée' },
    { value: 'livraison_non_recue', label: 'Livraison non reçue' },
    { value: 'facturation_incorrecte', label: 'Facturation incorrecte' },
    { value: 'remboursement', label: 'Remboursement' },
    { value: 'echange', label: 'Échange' },
    { value: 'autre', label: 'Autre' }
  ];

  periodeOptions = [
    { value: 'tous', label: 'Toutes dates' },
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' }
  ];

  tabs = [
    { key: 'infos', label: 'Informations', icon: 'bi-info-circle' },
    { key: 'conversation', label: 'Conversation', icon: 'bi-chat-dots' },
    { key: 'documents', label: 'Documents', icon: 'bi-folder2-open' },
    { key: 'historique', label: 'Historique', icon: 'bi-clock-history' }
  ];

  selectedReclamation: Reclamation | null = null;
  detailLoading = false;
  detailTab = 0;
  showDetail = false;

  // Conversation
  newMessage = '';
  noteInterne = false;
  visibleClient = true;
  visibleFournisseur = true;
  selectedFiles: File[] = [];
  sendingMessage = false;

  // Modales
  activeModal: ModalAction = null;
  modalRec: Reclamation | null = null;
  modalData = {
    statut: '',
    priorite: '',
    assigne_a: 0,
    note: '',
    message: '',
    raison_rejet: ''
  };
  modalLoading = false;

  notifications: { id: number; message: string; type: 'success' | 'error' | 'info' }[] = [];

  // Menu d'actions unique, positionné sur le bouton cliqué
  @ViewChild('dropdownMenu') dropdownMenuRef?: ElementRef<HTMLElement>;
  dropdownOpenId: number | null = null;
  dropdownRec: Reclamation | null = null;
  dropdownMenuUp = false;
  dropdownTop = 0;
  dropdownLeft = 0;

  private dropdownAnchor: HTMLElement | null = null;
  private readonly dropdownFallbackWidth = 250;
  private readonly dropdownFallbackHeight = 340;
  private readonly dropdownGap = 6;
  private readonly viewportMargin = 12;

  private searchTimer?: ReturnType<typeof setTimeout>;
  private polling?: Subscription;

  statutConfig: Record<string, StatutConfig> = {
    nouveau: { label: 'Nouveau', color: 'yellow', icon: 'bi-circle-fill', description: 'Dossier nouvellement créé' },
    en_cours_analyse: { label: 'En analyse', color: 'blue', icon: 'bi-search', description: 'Dossier en cours d\'analyse' },
    en_attente_infos: { label: 'En attente', color: 'orange', icon: 'bi-hourglass-split', description: 'En attente d\'informations' },
    resolu: { label: 'Résolu', color: 'green', icon: 'bi-check-circle-fill', description: 'Dossier résolu' },
    rejete: { label: 'Rejeté', color: 'red', icon: 'bi-x-circle-fill', description: 'Réclamation rejetée' },
    ferme: { label: 'Fermé', color: 'gray', icon: 'bi-archive-fill', description: 'Dossier clôturé' }
  };

  prioriteConfig: Record<string, PrioriteConfig> = {
    faible: { label: 'Faible', color: 'gray', icon: 'bi-arrow-down' },
    normale: { label: 'Normale', color: 'blue', icon: 'bi-dash' },
    elevee: { label: 'Élevée', color: 'orange', icon: 'bi-arrow-up' },
    urgente: { label: 'Urgente', color: 'red', icon: 'bi-exclamation-triangle-fill' }
  };

  constructor(private reclamationService: ReclamationService) {}

  ngOnInit(): void {
    this.loadData();
    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
    if (this.searchTimer) clearTimeout(this.searchTimer);
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.loadReclamations();
    this.loadStats();
  }

  loadReclamations(): void {
    const f: ReclamationFilters = { ...this.filters, q: this.searchTerm.trim() || undefined };
    this.reclamationService.getReclamations(f).subscribe({
      next: (list) => {
        this.reclamations = list;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement des réclamations.';
        this.loading = false;
      }
    });
  }

  loadStats(): void {
    this.reclamationService.getStats().subscribe({
      next: (s) => this.stats = s,
      error: (err) => console.error(err)
    });
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadReclamations(), 300);
  }

  onFilterChange(): void {
    this.loadReclamations();
  }

  resetFilters(): void {
    this.filters = {};
    this.searchTerm = '';
    this.loadReclamations();
  }

  trackById(_: number, r: Reclamation): number {
    return r.id;
  }

  openDetail(r: Reclamation): void {
    this.closeDropdown();
    this.showDetail = true;
    this.detailLoading = true;
    this.selectedReclamation = null;
    this.detailTab = 0;
    this.reclamationService.getReclamation(r.id).subscribe({
      next: (rec) => { this.selectedReclamation = rec; this.detailLoading = false; },
      error: () => { this.detailLoading = false; this.showNotification('Erreur chargement détail', 'error'); }
    });
  }

  closeDetail(): void {
    this.showDetail = false;
    this.selectedReclamation = null;
  }

  getStatutConfig(statut: string): StatutConfig {
    return this.statutConfig[statut] || { label: statut, color: 'gray', icon: 'bi-question-circle', description: '' };
  }

  getPrioriteConfig(priorite: string): PrioriteConfig {
    return this.prioriteConfig[priorite] || { label: priorite, color: 'gray', icon: 'bi-question' };
  }

  formatDate(d?: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR');
  }

  formatDateOnly(d?: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR');
  }

  // ───── Menu d'actions ─────
  toggleDropdown(r: Reclamation, event: MouseEvent): void {
    event.stopPropagation();
    if (this.dropdownOpenId === r.id) {
      this.closeDropdown();
      return;
    }
    this.dropdownOpenId = r.id;
    this.dropdownRec = r;
    this.dropdownAnchor = event.currentTarget as HTMLElement;
    this.positionDropdown();
    setTimeout(() => this.positionDropdown());
  }

  closeDropdown(): void {
    this.dropdownOpenId = null;
    this.dropdownRec = null;
    this.dropdownAnchor = null;
    this.dropdownMenuUp = false;
  }

  runDropdownAction(action: ModalAction, r: Reclamation): void {
    this.closeDropdown();
    if (action) this.openActionModal(action, r);
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
  openActionModal(action: ModalAction, r: Reclamation): void {
    this.activeModal = action;
    this.modalRec = r;
    this.modalData = {
      statut: r.statut,
      priorite: r.priorite,
      assigne_a: r.assigne_a?.id || 0,
      note: '',
      message: '',
      raison_rejet: ''
    };
  }

  closeActionModal(): void {
    this.activeModal = null;
    this.modalRec = null;
    this.modalLoading = false;
  }

  modalTitle(): string {
    const titles: Record<string, string> = {
      statut: 'Changer le statut',
      priorite: 'Changer la priorité',
      assigner: 'Assigner le dossier',
      note: 'Ajouter une note interne',
      resoudre: 'Marquer comme résolu',
      rejeter: 'Rejeter la réclamation',
      fermer: 'Clôturer le dossier',
      demande_infos: 'Demander des informations'
    };
    return this.activeModal ? titles[this.activeModal] : '';
  }

  confirmAction(): void {
    const rec = this.modalRec || this.selectedReclamation;
    if (!rec || !this.activeModal) return;
    this.modalLoading = true;
    let payload: ReclamationActionPayload | null = null;

    switch (this.activeModal) {
      case 'statut':
        payload = { action: 'change_statut', statut: this.modalData.statut };
        break;
      case 'priorite':
        payload = { action: 'change_priorite', priorite: this.modalData.priorite };
        break;
      case 'assigner':
        payload = { action: 'assigner', assigne_a: this.modalData.assigne_a };
        break;
      case 'note':
        payload = { action: 'note_interne', note_interne: this.modalData.note };
        break;
      case 'resoudre':
        payload = { action: 'change_statut', statut: 'resolu' };
        break;
      case 'rejeter':
        payload = { action: 'change_statut', statut: 'rejete', raison_rejet: this.modalData.raison_rejet };
        break;
      case 'fermer':
        payload = { action: 'change_statut', statut: 'ferme' };
        break;
      case 'demande_infos':
        payload = { action: 'demande_infos', message: this.modalData.message };
        break;
    }

    if (!payload) return;

    this.reclamationService.action(rec.id, payload).subscribe({
      next: (res) => {
        if (this.selectedReclamation?.id === rec.id) this.selectedReclamation = res.reclamation;
        this.showNotification(res.message, 'success');
        this.closeActionModal();
        this.loadReclamations();
        this.loadStats();
      },
      error: (err) => {
        this.modalLoading = false;
        this.showNotification(err?.error?.error || 'Erreur lors de l\'action.', 'error');
      }
    });
  }

  ouvrirDossier(r: Reclamation): void {
    this.reclamationService.action(r.id, { action: 'ouvrir' }).subscribe({
      next: () => { this.showNotification('Dossier ouvert', 'success'); this.loadReclamations(); this.loadStats(); },
      error: (err) => this.showNotification(err?.error?.error || 'Erreur', 'error')
    });
  }

  // ───── Conversation ─────
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = Array.from(input.files || []);
  }

  removeFile(i: number): void {
    this.selectedFiles.splice(i, 1);
  }

  sendMessage(): void {
    if (!this.selectedReclamation || !this.newMessage.trim() || this.sendingMessage) return;
    this.sendingMessage = true;
    const payload: MessagePayload = {
      contenu: this.newMessage,
      est_note_interne: this.noteInterne,
      est_visible_client: this.visibleClient,
      est_visible_fournisseur: this.visibleFournisseur,
      pieces_jointes: this.selectedFiles
    };
    this.reclamationService.sendMessage(this.selectedReclamation.id, payload).subscribe({
      next: (res) => {
        this.newMessage = '';
        this.selectedFiles = [];
        this.sendingMessage = false;
        this.selectedReclamation?.messages?.push(res.message_obj);
        this.showNotification('Message envoyé', 'success');
      },
      error: (err) => {
        this.sendingMessage = false;
        this.showNotification(err?.error?.error || 'Erreur envoi message', 'error');
      }
    });
  }

  onAttachmentUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.selectedReclamation) return;
    this.reclamationService.uploadAttachment(this.selectedReclamation.id, file).subscribe({
      next: (res) => {
        this.selectedReclamation?.pieces_jointes?.push(res.piece_jointe);
        this.showNotification('Pièce jointe ajoutée', 'success');
      },
      error: (err) => this.showNotification(err?.error?.error || 'Erreur upload', 'error')
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

  getAttachmentIcon(type: string): string {
    switch (type) {
      case 'photo': return 'bi-image';
      case 'pdf': return 'bi-file-earmark-pdf';
      case 'facture': return 'bi-receipt';
      case 'capture': return 'bi-phone';
      default: return 'bi-file-earmark';
    }
  }

  getActionLabel(action: string): string {
    const map: Record<string, string> = {
      creation: 'Création', ouverture: 'Ouverture', reponse: 'Réponse', demande_infos: 'Demande d\'infos',
      changement_priorite: 'Changement priorité', changement_statut: 'Changement statut', assignation: 'Assignation',
      note_interne: 'Note interne', resolution: 'Résolution', rejet: 'Rejet', fermeture: 'Fermeture', modification: 'Modification'
    };
    return map[action] || action;
  }

  getHistoriqueIcon(action: string): string {
    const map: Record<string, string> = {
      creation: 'bi-plus-circle', ouverture: 'bi-unlock', reponse: 'bi-chat-left-text',
      demande_infos: 'bi-question-circle', changement_priorite: 'bi-flag', changement_statut: 'bi-arrow-left-right',
      assignation: 'bi-person-check', note_interne: 'bi-journal-text', resolution: 'bi-check-circle',
      rejet: 'bi-x-circle', fermeture: 'bi-archive', modification: 'bi-pencil'
    };
    return map[action] || 'bi-dot';
  }

  getTempsResolution(heures: number): string {
    if (heures < 1) return Math.round(heures * 60) + ' min';
    if (heures < 24) return Math.round(heures) + ' h';
    return Math.round(heures / 24) + ' j';
  }
}
