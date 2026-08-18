import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subscription } from 'rxjs';

import { ReclamationService } from '../../../core/services/reclamation.service';
import {
  Reclamation,
  ReclamationFilters,
  ReclamationStats,
  ReclamationActionPayload,
  MessagePayload,
  StatutConfig,
  PrioriteConfig,
  MessageReclamation
} from '../../../models/reclamation.model';

@Component({
  selector: 'app-reclamation',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatChipsModule, MatButtonModule, MatIconModule,
    MatMenuModule, MatTabsModule,
    MatCardModule, MatBadgeModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDividerModule, MatCheckboxModule
  ],
  templateUrl: './reclamation.component.html',
  styleUrls: ['./reclamation.component.css']
})
export class ReclamationComponent implements OnInit, OnDestroy {

  displayedColumns: string[] = ['numero_dossier', 'commande', 'client', 'fournisseur', 'produit', 'motif', 'date', 'priorite', 'statut', 'actions'];
  reclamations: Reclamation[] = [];
  filtered: Reclamation[] = [];
  stats: ReclamationStats | null = null;
  loading = true;
  error: string | null = null;

  filters: ReclamationFilters = {};
  searchTerm = '';

  statutOptions = [
    { value: 'tous', label: 'Tous' },
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
    { value: 'tous', label: 'Toutes' },
    { value: 'faible', label: 'Faible' },
    { value: 'normale', label: 'Normale' },
    { value: 'elevee', label: 'Élevée' },
    { value: 'urgente', label: 'Urgente' }
  ];

  motifOptions = [
    { value: 'tous', label: 'Tous' },
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

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

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

  // Modals
  activeModal: 'statut' | 'priorite' | 'assigner' | 'note' | 'resoudre' | 'rejeter' | 'fermer' | 'demande_infos' | null = null;
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

  private polling?: Subscription;

  statutConfig: Record<string, StatutConfig> = {
    nouveau: { label: 'Nouveau', color: 'yellow', icon: 'bi-circle-fill', description: 'Dossier nouvellement créé' },
    en_cours_analyse: { label: 'En cours d\'analyse', color: 'blue', icon: 'bi-search', description: 'Le dossier est en cours d\'analyse par l\'admin' },
    en_attente_infos: { label: 'En attente d\'infos', color: 'orange', icon: 'bi-hourglass-split', description: 'En attente d\'informations complémentaires' },
    resolu: { label: 'Résolu', color: 'green', icon: 'bi-check-circle-fill', description: 'Dossier résolu avec succès' },
    rejete: { label: 'Rejeté', color: 'red', icon: 'bi-x-circle-fill', description: 'Réclamation rejetée' },
    ferme: { label: 'Fermé', color: 'gray', icon: 'bi-x-octagon-fill', description: 'Dossier clôturé' }
  };

  prioriteConfig: Record<string, PrioriteConfig> = {
    faible: { label: 'Faible', color: 'gray', icon: 'bi-arrow-down' },
    normale: { label: 'Normale', color: 'blue', icon: 'bi-dash' },
    elevee: { label: 'Élevée', color: 'orange', icon: 'bi-arrow-up' },
    urgente: { label: 'Urgente', color: 'red', icon: 'bi-exclamation-triangle-fill' }
  };

  constructor(
    private reclamationService: ReclamationService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
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
        this.filtered = list;
        this.loading = false;
      },
      error: (err) => {
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
    this.loadReclamations();
  }

  onFilterChange(): void {
    this.loadReclamations();
  }

  resetFilters(): void {
    this.filters = {};
    this.searchTerm = '';
    this.loadReclamations();
  }

  openDetail(r: Reclamation): void {
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

  // ───── Actions ─────
  openActionModal(action: typeof this.activeModal, r: Reclamation): void {
    this.activeModal = action;
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
    this.modalLoading = false;
  }

  confirmAction(): void {
    if (!this.selectedReclamation || !this.activeModal) return;
    this.modalLoading = true;
    const rec = this.selectedReclamation;
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
        this.selectedReclamation = res.reclamation;
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
      next: (res) => { this.showNotification('Dossier ouvert', 'success'); this.loadReclamations(); this.loadStats(); },
      error: (err) => this.showNotification(err?.error?.error || 'Erreur', 'error')
    });
  }

  // ───── Conversation ─────
  onFileSelect(event: any): void {
    this.selectedFiles = Array.from(event.target.files || []);
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

  onAttachmentUpload(event: any): void {
    const file = event.target.files[0];
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

  getTempsResolution(heures: number): string {
    if (heures < 1) return Math.round(heures * 60) + ' min';
    if (heures < 24) return Math.round(heures) + ' h';
    return Math.round(heures / 24) + ' j';
  }
}
