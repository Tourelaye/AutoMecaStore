import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FournisseurService,
  Fournisseur,
  FournisseurStatus
} from './fournisseur.service';

@Component({
  selector: 'app-fournisseur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fournisseur.component.html',
  styleUrls: ['./fournisseur.component.css']
})
export class FournisseurComponent implements OnInit {
  loading = true;
  fournisseurs: Fournisseur[] = [];
  filtered: Fournisseur[] = [];

  searchTerm = '';
  statusFilter: 'tous' | FournisseurStatus = 'tous';

  statusOptions: { value: 'tous' | FournisseurStatus; label: string }[] = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'actif', label: 'Actif' },
    { value: 'desactive', label: 'Suspendu' },
    { value: 'attente', label: 'En attente de validation' }
  ];

  // --- Modale de validation ---
  showValidationModal = false;
  validationAction: 'valider' | 'suspendre' | 'reactiver' = 'valider';
  validationCommentaire = '';
  validationError: string | null = null;
  targetFournisseur: Fournisseur | null = null;
  submitting = false;

  // --- Suppression ---
  pendingDeleteId: number | null = null;
  deleteError: string | null = null;
  deleting = false;

  // ===== PROPRIÉTÉS POUR AFFICHAGE DYNAMIQUE =====
  showDetailModal = false;
  selectedFournisseur: Fournisseur | null = null;
  detailTab: 'info' | 'produits' | 'commandes' | 'stats' = 'info';

  // Données détail
  fournisseurProduits: any[] = [];
  fournisseurCommandes: any[] = [];
  fournisseurStats: any = null;
  detailLoading = false;

  constructor(private fournisseurService: FournisseurService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.fournisseurService.getAll().subscribe({
      next: (list) => {
        this.fournisseurs = list;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('[Fournisseur] Erreur lors du chargement de la liste :', err);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.fournisseurs.filter(f => {
      const matchesStatus = this.statusFilter === 'tous' || f.statut === this.statusFilter;
      const matchesSearch =
        !term ||
        f.nom_entreprise?.toLowerCase().includes(term) ||
        f.nom_complet?.toLowerCase().includes(term) ||
        f.user?.email?.toLowerCase().includes(term) ||
        f.siret?.includes(term);
      return matchesStatus && matchesSearch;
    });
  }

  statusLabel(statut: FournisseurStatus): string {
    const labels: Record<FournisseurStatus, string> = {
      'actif': 'ACTIF',
      'desactive': 'SUSPENDU',
      'attente': 'EN ATTENTE'
    };
    return labels[statut] || statut;
  }

  statusClass(statut: FournisseurStatus): string {
    const classes: Record<FournisseurStatus, string> = {
      'actif': 'badge-success',
      'desactive': 'badge-danger',
      'attente': 'badge-warning'
    };
    return classes[statut] || 'badge-secondary';
  }

  initials(name: string): string {
    return name?.trim()?.charAt(0)?.toUpperCase() || '?';
  }

  /**
   * Extrait un message d'erreur lisible depuis une réponse HTTP,
   * quel que soit le format renvoyé par le backend Django.
   */
  private extractError(err: any, fallback: string): string {
    if (!err) return fallback;

    // Erreur réseau (backend injoignable, CORS bloqué, pas de connexion...)
    if (err.status === 0) {
      return "Impossible de joindre le serveur. Vérifiez votre connexion ou l'état du backend.";
    }
    if (err.status === 401) {
      return "Votre session a expiré ou vous n'êtes pas authentifié. Reconnectez-vous.";
    }
    if (err.status === 403) {
      return "Action refusée par le serveur (droits insuffisants ou protection CSRF).";
    }
    if (err.status === 404) {
      return "Ressource introuvable (l'URL de l'API a peut-être changé).";
    }

    return (
      err?.error?.detail ||
      err?.error?.error ||
      err?.error?.message ||
      (typeof err?.error === 'string' ? err.error : null) ||
      err?.message ||
      fallback
    );
  }

  // --- Validation ---
  openValidation(f: Fournisseur, action: 'valider' | 'suspendre' | 'reactiver'): void {
    this.targetFournisseur = f;
    this.validationAction = action;
    this.validationCommentaire = '';
    this.validationError = null;
    this.submitting = false;
    this.showValidationModal = true;
  }

  closeValidation(): void {
    if (this.submitting) return;
    this.showValidationModal = false;
    this.targetFournisseur = null;
    this.validationError = null;
  }

  confirmValidation(): void {
    if (!this.targetFournisseur || this.submitting) return;
    this.submitting = true;
    this.validationError = null;
    const userId = this.targetFournisseur.user.id;

    this.fournisseurService.valider(userId, this.validationAction, this.validationCommentaire).subscribe({
      next: () => {
        this.submitting = false;
        this.showValidationModal = false;
        this.targetFournisseur = null;
        this.validationError = null;
        this.statusFilter = 'tous';
        this.load();
      },
      error: (err) => {
        console.error('[Fournisseur] Erreur lors de la validation :', err);
        this.submitting = false;
        this.validationError = this.extractError(err, "Une erreur est survenue lors de la mise à jour.");
      }
    });
  }

  // --- Suppression ---
  askDelete(f: Fournisseur): void {
    this.pendingDeleteId = f.user.id;
    this.deleteError = null;
    this.deleting = false;
  }

  cancelDelete(): void {
    if (this.deleting) return;
    this.pendingDeleteId = null;
    this.deleteError = null;
  }

  confirmDelete(): void {
    // Garde-fou : id null/undefined ET anti double-clic
    if (this.pendingDeleteId === null || this.pendingDeleteId === undefined || this.deleting) return;

    this.deleting = true;
    this.deleteError = null;
    const idToDelete = this.pendingDeleteId;

    this.fournisseurService.delete(idToDelete).subscribe({
      next: () => {
        this.fournisseurs = this.fournisseurs.filter(f => f.user.id !== idToDelete);
        this.statusFilter = 'tous';
        this.applyFilters();
        this.pendingDeleteId = null;
        this.deleteError = null;
        this.deleting = false;
      },
      error: (err) => {
        console.error('[Fournisseur] Erreur lors de la suppression :', err);
        this.deleting = false;
        this.deleteError = this.extractError(err, "Une erreur est survenue lors de la suppression.");
      }
    });
  }

  // ===== MÉTHODES POUR AFFICHAGE DYNAMIQUE =====

  openDetail(f: Fournisseur): void {
    this.selectedFournisseur = f;
    this.detailTab = 'info';
    this.showDetailModal = true;
    this.loadDetailData(f);
  }

  closeDetail(): void {
    this.showDetailModal = false;
    this.selectedFournisseur = null;
    this.fournisseurProduits = [];
    this.fournisseurCommandes = [];
    this.fournisseurStats = null;
  }

  loadDetailData(fournisseur: Fournisseur): void {
    const userId = fournisseur.user.id;

    this.fournisseurService.getStats(userId).subscribe({
      next: (stats) => { this.fournisseurStats = stats; },
      error: (err) => console.error('[Fournisseur] Erreur lors du chargement des stats :', err)
    });

    this.fournisseurService.getProduits(userId).subscribe({
      next: (data) => { this.fournisseurProduits = data.produits || []; },
      error: (err) => console.error('[Fournisseur] Erreur lors du chargement des produits :', err)
    });

    this.fournisseurService.getCommandes(userId).subscribe({
      next: (data) => { this.fournisseurCommandes = data.commandes || []; },
      error: (err) => console.error('[Fournisseur] Erreur lors du chargement des commandes :', err)
    });
  }

  selectTab(tab: 'info' | 'produits' | 'commandes' | 'stats'): void {
    this.detailTab = tab;
  }

  trackByUserId(_index: number, item: Fournisseur): number {
    return item.user.id;
  }

  // --- Stats cards ---
  get totalCount(): number { return this.fournisseurs.length; }
  get actifsCount(): number { return this.fournisseurs.filter(f => f.statut === 'actif').length; }
  get suspendusCount(): number { return this.fournisseurs.filter(f => f.statut === 'desactive').length; }
  get attenteCount(): number { return this.fournisseurs.filter(f => f.statut === 'attente').length; }
}