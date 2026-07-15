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

  // ===== NOUVELLES PROPRIÉTÉS POUR AFFICHAGE DYNAMIQUE =====
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
      error: () => {
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
    if (!this.targetFournisseur) return;
    this.submitting = true;
    const userId = this.targetFournisseur.user.id;

    this.fournisseurService.valider(userId, this.validationAction, this.validationCommentaire).subscribe({
      next: () => {
        this.submitting = false;
        this.showValidationModal = false;
        this.targetFournisseur = null;
        this.validationError = null;
        this.load();
      },
      error: (err) => {
        this.submitting = false;
        this.validationError = err?.error?.error || "Une erreur est survenue lors de la mise à jour.";
      }
    });
  }

  // --- Suppression ---
  askDelete(f: Fournisseur): void {
    this.pendingDeleteId = f.user.id;
    this.deleteError = null;
  }

  cancelDelete(): void {
    this.pendingDeleteId = null;
    this.deleteError = null;
  }

  confirmDelete(): void {
    if (!this.pendingDeleteId) return;
    this.fournisseurService.delete(this.pendingDeleteId).subscribe({
      next: () => {
        this.fournisseurs = this.fournisseurs.filter(f => f.user.id !== this.pendingDeleteId);
        this.applyFilters();
        this.pendingDeleteId = null;
        this.deleteError = null;
      },
      error: (err) => {
        this.deleteError = err?.error?.error || "Une erreur est survenue lors de la suppression.";
      }
    });
  }

  // ===== NOUVELLES MÉTHODES POUR AFFICHAGE DYNAMIQUE =====
  
  /**
   * Ouvre la modale de détail avec les informations complètes du fournisseur
   */
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

  /**
   * Charge les données détaillées du fournisseur
   */
  loadDetailData(fournisseur: Fournisseur): void {
    const userId = fournisseur.user.id;
    
    // Charger les stats
    this.fournisseurService.getStats(userId).subscribe({
      next: (stats) => {
        this.fournisseurStats = stats;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des stats:', err);
      }
    });

    // Charger les produits
    this.fournisseurService.getProduits(userId).subscribe({
      next: (data) => {
        this.fournisseurProduits = data.produits || [];
      },
      error: (err) => {
        console.error('Erreur lors du chargement des produits:', err);
      }
    });

    // Charger les commandes
    this.fournisseurService.getCommandes(userId).subscribe({
      next: (data) => {
        this.fournisseurCommandes = data.commandes || [];
      },
      error: (err) => {
        console.error('Erreur lors du chargement des commandes:', err);
      }
    });
  }

  /**
   * Change l'onglet actif dans le détail
   */
  selectTab(tab: 'info' | 'produits' | 'commandes' | 'stats'): void {
    this.detailTab = tab;
  }

  trackByUserId(_index: number, item: Fournisseur): number {
    return item.user.id;
  }
}
