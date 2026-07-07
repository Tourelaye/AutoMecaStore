import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import {Avis, AvisStatut, AvisType} from './avis-reclamation.model';
import { AvisReclamationService } from './avis-reclamation.service';

@Component({
  selector: 'app-avis-reclamation',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './avis-reclamation.component.html',
  styleUrl: './avis-reclamation.component.css'
})
export class AvisReclamationComponent implements OnInit {
  avisList: Avis[] = [];
  filteredList: Avis[] = [];

  // Recherche & filtres
  searchQuery = '';
  filterType: 'tous' | AvisType = 'tous';
  filterStatut: 'tous' | AvisStatut = 'tous';

  // Pagination
  currentPage = 1;
  itemsPerPage = 5;

  // Modales
  showModal = false;
  showDetailModal = false;
  showConfirmModal = false;
  isEditing = false;

  selectedAvis: Avis | null = null;
  reponseText = '';
  avisToDelete: Avis | null = null;

  // Menu actions ouvert (id de la ligne)
  openActionsId: number | null = null;

  avisForm: Partial<Avis> = this.emptyForm();

  message = '';
  messageType: 'success' | 'error' = 'success';
  loading = false;

  constructor(private avisService: AvisReclamationService) {}

  ngOnInit(): void {
    this.loadAvis();
  }

  loadAvis(): void {
    this.loading = true;
    this.avisService.getAll().subscribe({
      next: (data) => {
        this.avisList = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.showMessage('Erreur lors du chargement des données', 'error');
        this.loading = false;
      }
    });
  }

  // ===== STATISTIQUES =====
  get totalAvis(): number {
    return this.avisList.filter(a => a.type === 'avis').length;
  }

  get totalReclamations(): number {
    return this.avisList.filter(a => a.type === 'reclamation').length;
  }

  get totalNouveaux(): number {
    return this.avisList.filter(a => a.statut === 'nouveau').length;
  }

  get noteMoyenne(): string {
    if (this.avisList.length === 0) return '0.0';
    const somme = this.avisList.reduce((acc, a) => acc + a.note, 0);
    return (somme / this.avisList.length).toFixed(1);
  }

  // ===== FILTRES / RECHERCHE =====
  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  setFilterType(type: 'tous' | AvisType): void {
    this.filterType = type;
    this.currentPage = 1;
    this.applyFilters();
  }

  setFilterStatut(statut: 'tous' | AvisStatut): void {
    this.filterStatut = statut;
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();

    this.filteredList = this.avisList.filter(avis => {
      const matchQuery = !query ||
        avis.client.toLowerCase().includes(query) ||
        avis.produit.toLowerCase().includes(query) ||
        avis.commentaire.toLowerCase().includes(query);

      const matchType = this.filterType === 'tous' || avis.type === this.filterType;
      const matchStatut = this.filterStatut === 'tous' || avis.statut === this.filterStatut;

      return matchQuery && matchType && matchStatut;
    });
  }

  // ===== PAGINATION =====
  get paginatedList(): Avis[] {
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
    this.avisForm = this.emptyForm();
    this.showModal = true;
  }

  openEditModal(avis: Avis): void {
    this.isEditing = true;
    this.avisForm = { ...avis };
    this.showModal = true;
    this.openActionsId = null;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveAvis(): void {
    if (!this.avisForm.client || !this.avisForm.commentaire) {
      this.showMessage('Veuillez remplir les champs obligatoires', 'error');
      return;
    }

    if (this.isEditing && this.avisForm.id) {
      const index = this.avisList.findIndex(a => a.id === this.avisForm.id);
      if (index !== -1) {
        this.avisList[index] = { ...this.avisList[index], ...this.avisForm } as Avis;
      }
      this.showMessage('Avis mis à jour avec succès !', 'success');
    } else {
      const newAvis: Avis = {
        id: Math.max(0, ...this.avisList.map(a => a.id)) + 1,
        client: this.avisForm.client!,
        produit: this.avisForm.produit || '',
        note: this.avisForm.note || 5,
        commentaire: this.avisForm.commentaire!,
        date: new Date().toISOString().split('T')[0],
        type: this.avisForm.type || 'avis',
        statut: this.avisForm.statut || 'nouveau'
      };
      this.avisList.unshift(newAvis);
      this.showMessage('Avis ajouté avec succès !', 'success');
    }

    this.applyFilters();
    this.showModal = false;
  }

  private emptyForm(): Partial<Avis> {
    return { client: '', produit: '', note: 5, commentaire: '', type: 'avis', statut: 'nouveau' };
  }

  // ===== DETAIL / REPONSE =====
  openDetail(avis: Avis): void {
    this.selectedAvis = avis;
    this.reponseText = avis.reponse || '';
    this.showDetailModal = true;
    this.openActionsId = null;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedAvis = null;
    this.reponseText = '';
  }

  envoyerReponse(): void {
    if (!this.selectedAvis || !this.reponseText.trim()) {
      this.showMessage('Merci de saisir une réponse', 'error');
      return;
    }

    this.avisService.repondre(this.selectedAvis.id, this.reponseText).subscribe({
      next: () => this.applyReponseLocally(this.selectedAvis!.id, this.reponseText),
      error: () => this.applyReponseLocally(this.selectedAvis!.id, this.reponseText) // fallback demo
    });
  }

  private applyReponseLocally(id: number, reponse: string): void {
    const item = this.avisList.find(a => a.id === id);
    if (item) {
      item.reponse = reponse;
      item.statut = 'traite';
      item.dateReponse = new Date().toISOString().split('T')[0];
    }
    this.applyFilters();
    this.showMessage('Réponse envoyée avec succès !', 'success');
    this.closeDetailModal();
  }

  // ===== CHANGEMENT DE STATUT RAPIDE =====
  changeStatus(avis: Avis, statut: AvisStatut): void {
    this.avisService.updateStatut(avis.id, statut).subscribe({
      next: () => this.setStatutLocally(avis, statut),
      error: () => this.setStatutLocally(avis, statut) // fallback demo
    });
  }

  private setStatutLocally(avis: Avis, statut: AvisStatut): void {
    avis.statut = statut;
    this.applyFilters();
    this.openActionsId = null;
    this.showMessage('Statut mis à jour', 'success');
  }

  // ===== SUPPRESSION =====
  askDelete(avis: Avis): void {
    this.avisToDelete = avis;
    this.showConfirmModal = true;
    this.openActionsId = null;
  }

  cancelDelete(): void {
    this.avisToDelete = null;
    this.showConfirmModal = false;
  }

  confirmDelete(): void {
    if (!this.avisToDelete) return;
    const id = this.avisToDelete.id;

    this.avisService.delete(id).subscribe({
      next: () => this.removeLocally(id),
      error: () => this.removeLocally(id) // fallback demo
    });
  }

  private removeLocally(id: number): void {
    this.avisList = this.avisList.filter(a => a.id !== id);
    this.applyFilters();
    this.showMessage('Élément supprimé avec succès', 'success');
    this.showConfirmModal = false;
    this.avisToDelete = null;
  }

  // ===== HELPERS =====
  getTypeLabel(type: string): string {
    return type === 'avis' ? 'Avis' : 'Réclamation';
  }

  getStatutLabel(statut: string): string {
    if (statut === 'nouveau') return 'Nouveau';
    if (statut === 'traite') return 'Traité';
    return 'En cours';
  }

  showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }
}