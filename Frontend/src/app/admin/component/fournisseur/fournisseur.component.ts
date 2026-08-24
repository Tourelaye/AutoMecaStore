import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FournisseurService,
  Fournisseur,
  FournisseurStatus,
  MagasinData
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
    { value: 'attente', label: 'En attente de validation' },
    { value: 'suspendu', label: 'Suspendu' },
    { value: 'desactive', label: 'Désactivé' }
  ];

  // --- Modale de validation ---
  showValidationModal = false;
  validationAction: 'valider' | 'refuser' | 'suspendre' | 'reactiver' = 'valider';
  validationMotif = '';
  validationConfirmLabel = '';
  validationCommentLabel = '';
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
  viewMode: 'grid' | 'table' = 'table';

  // Données détail
  fournisseurProduits: any[] = [];
  fournisseurCommandes: any[] = [];
  fournisseurStats: any = null;
  detailLoading = false;

  // Édition magasin
  editingMagasin: MagasinData | null = null;
  editMagasinLoading = false;
  editMagasinError: string | null = null;
  showMagasinEditModal = false;

  constructor(private fournisseurService: FournisseurService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.fournisseurService.getAll().subscribe({
      next: (list) => {
        this.fournisseurs = list.map(f => ({ ...f, statut: this.normalizeStatut(f.statut) }));
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('[Fournisseur] Erreur lors du chargement de la liste :', err);
        this.loading = false;
      }
    });
  }

  private normalizeStatut(statut: string): FournisseurStatus {
    if (statut === 'valide') return 'actif';
    if (statut === 'refuse') return 'desactive';
    return (statut as FournisseurStatus) || 'attente';
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.fournisseurs.filter(f => {
      const matchesStatus = this.statusFilter === 'tous' || f.statut === this.statusFilter;
      const mag = f.magasin || { nom_magasin: '', ville: '', telephone: '', email: '' };
      const matchesSearch =
        !term ||
        mag.nom_magasin?.toLowerCase().includes(term) ||
        f.nom_entreprise?.toLowerCase().includes(term) ||
        f.nom_complet?.toLowerCase().includes(term) ||
        f.user?.email?.toLowerCase().includes(term) ||
        mag.email?.toLowerCase().includes(term) ||
        f.user?.telephone?.includes(term) ||
        mag.telephone?.includes(term) ||
        mag.ville?.toLowerCase().includes(term) ||
        f.siret?.includes(term);
      return matchesStatus && matchesSearch;
    });
  }

  statusConfig: Record<FournisseurStatus, { label: string; class: string; icon: string; description: string }> = {
    attente: { label: 'En attente', class: 'badge-amber', icon: 'bi-hourglass-split', description: 'Ce magasin est en attente de validation administrative.' },
    actif: { label: 'Actif', class: 'badge-success', icon: 'bi-check-circle-fill', description: 'Ce magasin est approuvé et visible sur la plateforme.' },
    suspendu: { label: 'Suspendu', class: 'badge-danger', icon: 'bi-pause-circle-fill', description: 'Ce magasin est temporairement suspendu pour motif.' },
    desactive: { label: 'Désactivé', class: 'badge-neutral', icon: 'bi-x-circle-fill', description: 'Ce magasin est désactivé ou refusé.' }
  };

  statusLabel(statut: FournisseurStatus): string {
    return this.statusConfig[statut]?.label || statut;
  }

  statusClass(statut: FournisseurStatus): string {
    return this.statusConfig[statut]?.class || 'badge-secondary';
  }

  statusIcon(statut: FournisseurStatus): string {
    return this.statusConfig[statut]?.icon || 'bi-question-circle';
  }

  statusDescription(statut: FournisseurStatus): string {
    return this.statusConfig[statut]?.description || '';
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
  openValidation(f: Fournisseur, action: 'valider' | 'refuser' | 'suspendre' | 'reactiver'): void {
    this.targetFournisseur = f;
    this.validationAction = action;
    this.validationMotif = '';
    this.validationError = null;
    this.submitting = false;

    const labels: Record<string, { confirm: string; field: string }> = {
      valider: { confirm: 'Valider', field: 'Commentaire (optionnel)' },
      refuser: { confirm: 'Refuser', field: 'Motif du refus (obligatoire)' },
      suspendre: { confirm: 'Suspendre', field: 'Motif de la suspension (obligatoire)' },
      reactiver: { confirm: 'Réactiver', field: 'Commentaire (optionnel)' }
    };
    const cfg = labels[action] || { confirm: 'Confirmer', field: 'Commentaire' };
    this.validationConfirmLabel = cfg.confirm;
    this.validationCommentLabel = cfg.field;

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

    if ((this.validationAction === 'refuser' || this.validationAction === 'suspendre') && !this.validationMotif.trim()) {
      this.validationError = 'Le motif est obligatoire pour cette action.';
      return;
    }

    this.submitting = true;
    this.validationError = null;
    const userId = this.targetFournisseur.user.id;

    this.fournisseurService.valider(userId, this.validationAction, this.validationMotif).subscribe({
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
        const idx = this.fournisseurs.findIndex(f => f.user.id === idToDelete);
        if (idx >= 0) {
          this.fournisseurs[idx].statut = 'desactive';
          if (this.fournisseurs[idx].user) {
            this.fournisseurs[idx].user.is_active = false;
          }
        }
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

  openDetail(f: Fournisseur, tab: 'info' | 'produits' | 'commandes' | 'stats' = 'info'): void {
    this.selectedFournisseur = f;
    this.detailTab = tab;
    this.showDetailModal = true;
    if (tab === 'stats') this.loadDetailData(f);
    if (tab === 'produits') this.fournisseurService.getProduits(f.user.id).subscribe({
      next: (data) => { this.fournisseurProduits = data.produits || []; },
      error: (err) => console.error('[Fournisseur] Erreur lors du chargement des produits :', err)
    });
    if (tab === 'commandes') this.fournisseurService.getCommandes(f.user.id).subscribe({
      next: (data) => { this.fournisseurCommandes = data.commandes || []; },
      error: (err) => console.error('[Fournisseur] Erreur lors du chargement des commandes :', err)
    });
    if (tab === 'info') this.loadDetailData(f);
  }

  openProduits(f: Fournisseur): void { this.openDetail(f, 'produits'); }
  openCommandes(f: Fournisseur): void { this.openDetail(f, 'commandes'); }

  closeDetail(): void {
    this.showDetailModal = false;
    this.selectedFournisseur = null;
    this.fournisseurProduits = [];
    this.fournisseurCommandes = [];
    this.fournisseurStats = null;
  }

  toggleViewMode(mode: 'grid' | 'table'): void {
    this.viewMode = mode;
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

  openMagasinEdit(): void {
    if (!this.selectedFournisseur?.magasin) return;
    this.editingMagasin = { ...this.selectedFournisseur.magasin };
    this.editMagasinError = null;
    this.showMagasinEditModal = true;
  }

  closeMagasinEdit(): void {
    if (this.editMagasinLoading) return;
    this.editingMagasin = null;
    this.showMagasinEditModal = false;
    this.editMagasinError = null;
  }

  saveMagasin(): void {
    if (!this.selectedFournisseur || !this.editingMagasin) return;
    this.editMagasinLoading = true;
    this.editMagasinError = null;

    const data = { ...this.editingMagasin };
    if (data.latitude === null || data.latitude === undefined) data.latitude = null;
    if (data.longitude === null || data.longitude === undefined) data.longitude = null;
    if (data.rayon_livraison_km === null || data.rayon_livraison_km === undefined) data.rayon_livraison_km = null;

    this.fournisseurService.updateMagasin(this.selectedFournisseur.user.id, data).subscribe({
      next: (magasin) => {
        this.editMagasinLoading = false;
        this.showMagasinEditModal = false;
        if (this.selectedFournisseur) this.selectedFournisseur.magasin = magasin as any;
        this.editingMagasin = null;
      },
      error: (err) => {
        this.editMagasinLoading = false;
        this.editMagasinError = err?.error?.detail || err?.error?.telephone?.[0] || err?.error?.email?.[0] || 'Erreur lors de la mise à jour.';
      }
    });
  }

  trackByUserId(_index: number, item: Fournisseur): number {
    return item.user.id;
  }

  // --- Stats cards ---
  get totalCount(): number { return this.fournisseurs.length; }
  get actifsCount(): number { return this.fournisseurs.filter(f => f.statut === 'actif').length; }
  get attenteCount(): number { return this.fournisseurs.filter(f => f.statut === 'attente').length; }
  get suspendusCount(): number { return this.fournisseurs.filter(f => f.statut === 'suspendu').length; }
  get desactivesCount(): number { return this.fournisseurs.filter(f => f.statut === 'desactive').length; }
}