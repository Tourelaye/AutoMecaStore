import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { Promotion, PromotionStatut, PromotionType } from './promotion.component.model';
import { PromotionService } from './promotion.component.service';

@Component({
  selector: 'app-promotion',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './promotion.component.html',
  styleUrl: './promotion.component.css'
})
export class PromotionComponent implements OnInit {
  promotions: Promotion[] = [];
  filteredList: Promotion[] = [];

  // Recherche & filtres
  searchQuery = '';
  filterStatut: 'tous' | PromotionStatut = 'tous';
  sortOption: 'recent' | 'utilisation' | 'expiration' = 'recent';

  // Pagination
  currentPage = 1;
  itemsPerPage = 6;

  // Modales
  showModal = false;
  showConfirmModal = false;
  isEditing = false;

  promoToDelete: Promotion | null = null;
  openActionsId: number | null = null;

  promotionForm: Partial<Promotion> = this.emptyForm();

  message = '';
  messageType: 'success' | 'error' = 'success';
  loading = false;

  // Feedback de copie de code
  copiedId: number | null = null;

  constructor(private promotionService: PromotionService) {}

  ngOnInit(): void {
    this.loadPromotions();
  }

  loadPromotions(): void {
    this.loading = true;
    this.promotionService.getAll().subscribe({
      next: (data) => {
        this.promotions = data.map(p => this.withComputedStatut(p));
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.showMessage('Erreur lors du chargement des promotions', 'error');
        this.loading = false;
      }
    });
  }

  // Passe automatiquement une promo en "expiree" si sa date de fin est dépassée
  private withComputedStatut(promo: Promotion): Promotion {
    if (promo.statut !== 'desactivee' && this.isExpired(promo)) {
      return { ...promo, statut: 'expiree' };
    }
    return promo;
  }

  private isExpired(promo: Promotion): boolean {
    if (!promo.dateFin) return false;
    const fin = new Date(promo.dateFin);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return fin < today;
  }

  // ===== STATISTIQUES =====
  get totalActives(): number {
    return this.promotions.filter(p => p.statut === 'active').length;
  }

  get totalExpirees(): number {
    return this.promotions.filter(p => p.statut === 'expiree').length;
  }

  get totalUtilisations(): number {
    return this.promotions.reduce((acc, p) => acc + p.utilisations, 0);
  }

  get totalDesactivees(): number {
    return this.promotions.filter(p => p.statut === 'desactivee').length;
  }

  // ===== FILTRES / RECHERCHE =====
  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  setFilterStatut(statut: 'tous' | PromotionStatut): void {
    this.filterStatut = statut;
    this.currentPage = 1;
    this.applyFilters();
  }

  setSortOption(option: 'recent' | 'utilisation' | 'expiration'): void {
    this.sortOption = option;
    this.applyFilters();
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();

    let result = this.promotions.filter(promo => {
      const matchQuery = !query ||
        promo.nom.toLowerCase().includes(query) ||
        promo.code.toLowerCase().includes(query);

      const matchStatut = this.filterStatut === 'tous' || promo.statut === this.filterStatut;

      return matchQuery && matchStatut;
    });

    result = result.sort((a, b) => {
      if (this.sortOption === 'utilisation') {
        return b.utilisations - a.utilisations;
      }
      if (this.sortOption === 'expiration') {
        return this.getJoursRestants(a) - this.getJoursRestants(b);
      }
      return b.id - a.id; // recent par défaut
    });

    this.filteredList = result;
  }

  // ===== PAGINATION =====
  get paginatedList(): Promotion[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredList.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredList.length / this.itemsPerPage));
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // ===== MENU ACTIONS =====
  toggleActions(id: number, event: Event): void {
    event.stopPropagation();
    this.openActionsId = this.openActionsId === id ? null : id;
  }

  @HostListener('document:click')
  closeAllDropdowns(): void {
    this.openActionsId = null;
  }

  // ===== AJOUT / EDITION =====
  openAddModal(): void {
    this.isEditing = false;
    this.promotionForm = this.emptyForm();
    this.showModal = true;
  }

  openEditModal(promo: Promotion): void {
    this.isEditing = true;
    this.promotionForm = { ...promo };
    this.showModal = true;
    this.openActionsId = null;
  }

  closeModal(): void {
    this.showModal = false;
  }

  savePromotion(): void {
    if (!this.promotionForm.nom || !this.promotionForm.code || !this.promotionForm.reduction) {
      this.showMessage('Veuillez remplir les champs obligatoires', 'error');
      return;
    }

    if (this.isEditing && this.promotionForm.id) {
      const index = this.promotions.findIndex(p => p.id === this.promotionForm.id);
      if (index !== -1) {
        this.promotions[index] = this.withComputedStatut({ ...this.promotions[index], ...this.promotionForm } as Promotion);
      }
      this.showMessage('Promotion mise à jour avec succès !', 'success');
    } else {
      const newPromotion: Promotion = {
        id: Math.max(0, ...this.promotions.map(p => p.id)) + 1,
        nom: this.promotionForm.nom!,
        code: this.promotionForm.code!.toUpperCase(),
        reduction: this.promotionForm.reduction!,
        type: this.promotionForm.type || 'pourcentage',
        dateDebut: this.promotionForm.dateDebut || '',
        dateFin: this.promotionForm.dateFin || '',
        limiteUtilisation: this.promotionForm.limiteUtilisation,
        utilisations: 0,
        statut: this.promotionForm.statut || 'active'
      };
      this.promotions.unshift(this.withComputedStatut(newPromotion));
      this.showMessage('Promotion créée avec succès !', 'success');
    }

    this.applyFilters();
    this.showModal = false;
  }

  private emptyForm(): Partial<Promotion> {
    return { nom: '', code: '', reduction: 10, type: 'pourcentage', dateDebut: '', dateFin: '', statut: 'active' };
  }

  // ===== ACTIONS RAPIDES =====
  toggleStatutActivation(promo: Promotion): void {
    const nouveauStatut: PromotionStatut = promo.statut === 'desactivee' ? 'active' : 'desactivee';

    this.promotionService.updateStatut(promo.id, nouveauStatut).subscribe({
      next: () => this.setStatutLocally(promo, nouveauStatut),
      error: () => this.setStatutLocally(promo, nouveauStatut) // fallback demo
    });
  }

  private setStatutLocally(promo: Promotion, statut: PromotionStatut): void {
    promo.statut = statut;
    this.applyFilters();
    this.openActionsId = null;
    this.showMessage(statut === 'active' ? 'Promotion activée' : 'Promotion désactivée', 'success');
  }

  dupliquer(promo: Promotion): void {
    const copie: Promotion = {
      ...promo,
      id: Math.max(0, ...this.promotions.map(p => p.id)) + 1,
      nom: `${promo.nom} (copie)`,
      code: `${promo.code}-COPIE`,
      utilisations: 0,
      statut: 'active'
    };
    this.promotions.unshift(this.withComputedStatut(copie));
    this.applyFilters();
    this.openActionsId = null;
    this.showMessage('Promotion dupliquée avec succès', 'success');
  }

  copierCode(promo: Promotion, event: Event): void {
    event.stopPropagation();
    navigator.clipboard?.writeText(promo.code).then(() => {
      this.copiedId = promo.id;
      setTimeout(() => this.copiedId = null, 1500);
    });
  }

  // ===== SUPPRESSION =====
  askDelete(promo: Promotion): void {
    this.promoToDelete = promo;
    this.showConfirmModal = true;
    this.openActionsId = null;
  }

  cancelDelete(): void {
    this.promoToDelete = null;
    this.showConfirmModal = false;
  }

  confirmDelete(): void {
    if (!this.promoToDelete) return;
    const id = this.promoToDelete.id;

    this.promotionService.delete(id).subscribe({
      next: () => this.removeLocally(id),
      error: () => this.removeLocally(id) // fallback demo
    });
  }

  private removeLocally(id: number): void {
    this.promotions = this.promotions.filter(p => p.id !== id);
    this.applyFilters();
    this.showMessage('Promotion supprimée avec succès', 'success');
    this.showConfirmModal = false;
    this.promoToDelete = null;
  }

  // ===== HELPERS D'AFFICHAGE =====
  getReductionLabel(promo: Promotion): string {
    return promo.type === 'pourcentage' ? `${promo.reduction}%` : `${promo.reduction}€`;
  }

  getStatutLabel(statut: string): string {
    if (statut === 'active') return 'Active';
    if (statut === 'expiree') return 'Expirée';
    return 'Désactivée';
  }

  // Nombre de jours restants avant expiration (peut être négatif si expirée)
  getJoursRestants(promo: Promotion): number {
    const fin = new Date(promo.dateFin);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = fin.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  expireBientot(promo: Promotion): boolean {
    if (promo.statut !== 'active') return false;
    const jours = this.getJoursRestants(promo);
    return jours >= 0 && jours <= 7;
  }

  getUsagePercent(promo: Promotion): number {
    if (!promo.limiteUtilisation) return 0;
    return Math.min(100, Math.round((promo.utilisations / promo.limiteUtilisation) * 100));
  }

  showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }
}