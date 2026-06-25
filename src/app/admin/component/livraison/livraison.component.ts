import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { LivraisonService } from '../../../core/services/livraison.service';

export type StatutLivraison = 'en_preparation' | 'en_cours' | 'livree' | 'annulee';

export interface Livraison {
  id: number;
  commandeId: string;
  client: string;
  adresse: string;
  statut: StatutLivraison;
  transporteur: string;
  dateCreation: string;
  dateLivraison?: string;
  tracking?: string;
}

interface CreateLivraisonRequest {
  commandeId: string;
  client: string;
  adresse: string;
  statut: StatutLivraison;
  transporteur?: string;
  tracking?: string;
  dateLivraison?: string;
}

@Component({
  selector: 'app-livraison',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './livraison.component.html',
  styleUrls: ['./livraison.component.css']
})
export class LivraisonComponent implements OnInit {

  livraisons: Livraison[] = [];
  livraisonsFiltrees: Livraison[] = [];
  isLoading = false;

  // Modal
  showModal       = false;
  showDeleteModal = false;
  isEditing       = false;
  editingId: number | null = null;
  livraisonToDelete: Livraison | null = null;
  activeMenu: number | null = null;

  // Recherche & filtre
  searchQuery   = '';
  searchFocused = false;
  activeFilter: string = 'all';

  // Formulaire
  livraisonForm: Partial<Livraison> = this.emptyForm();

  // Notification
  message     = '';
  messageType: 'success' | 'error' = 'success';
  private notifTimer: any;

  readonly statutsPossibles: { value: string; label: string }[] = [
    { value: 'en_preparation', label: 'En préparation' },
    { value: 'en_cours',       label: 'En cours'       },
    { value: 'livree',         label: 'Livrée'         },
    { value: 'annulee',        label: 'Annulée'        },
  ];

  constructor(private livraisonService: LivraisonService) {}

  ngOnInit(): void {
    this.loadLivraisons();
  }

  // ── API Calls ───────────────────────────────────────────────────
  private loadLivraisons(): void {
    this.isLoading = true;
    this.livraisonService.getLivraisons().subscribe({
      next: (data: any[]) => {
        this.livraisons = this.mapApiToComponent(data);
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur chargement livraisons:', err);
        this.showMessage('Erreur lors du chargement des livraisons', 'error');
        this.isLoading = false;
      }
    });
  }

  private mapApiToComponent(apiLivraisons: any[]): Livraison[] {
    return apiLivraisons.map(l => ({
      id: l.id,
      commandeId: l.commande_id,
      client: l.client,
      adresse: l.adresse,
      statut: l.statut,
      transporteur: l.transporteur || '',
      dateCreation: l.date_creation,
      dateLivraison: l.date_livraison,
      tracking: l.tracking
    }));
  }

  private mapComponentToApi(form: Partial<Livraison>): CreateLivraisonRequest {
    return {
      commandeId: form.commandeId || '',
      client: form.client || '',
      adresse: form.adresse || '',
      statut: form.statut || 'en_preparation',
      transporteur: form.transporteur,
      tracking: form.tracking,
      dateLivraison: form.dateLivraison
    };
  }

  // ── Filtres ──────────────────────────────────────────────────
  applyFilter(): void {
    let list = [...this.livraisons];
    if (this.activeFilter !== 'all') {
      list = list.filter(l => l.statut === this.activeFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(l =>
        l.client.toLowerCase().includes(q) ||
        l.commandeId.toLowerCase().includes(q) ||
        l.adresse.toLowerCase().includes(q) ||
        l.transporteur?.toLowerCase().includes(q)
      );
    }
    this.livraisonsFiltrees = list;
  }

  setFilter(f: string): void { this.activeFilter = f; this.applyFilter(); }
  onSearch(): void { this.applyFilter(); }

  getFilterCount(s: string): number { return this.livraisons.filter(l => l.statut === s).length; }

  // ── Stats ────────────────────────────────────────────────────
  getStats() {
    return {
      total:         this.livraisons.length,
      enPreparation: this.livraisons.filter(l => l.statut === 'en_preparation').length,
      enCours:       this.livraisons.filter(l => l.statut === 'en_cours').length,
      livrees:       this.livraisons.filter(l => l.statut === 'livree').length,
      annulees:      this.livraisons.filter(l => l.statut === 'annulee').length,
    };
  }

  // ── Modal ─────────────────────────────────────────────────────
  openAddModal(): void {
    this.isEditing     = false;
    this.editingId     = null;
    this.livraisonForm = this.emptyForm();
    this.showModal     = true;
  }

  openEditModal(l: Livraison): void {
    this.activeMenu    = null;
    this.isEditing     = true;
    this.editingId     = l.id;
    this.livraisonForm = { ...l };
    this.showModal     = true;
  }

  openDeleteModal(l: Livraison): void {
    this.activeMenu       = null;
    this.livraisonToDelete = l;
    this.showDeleteModal  = true;
  }

  closeModal(): void       { this.showModal = false; this.livraisonForm = this.emptyForm(); }
  closeDeleteModal(): void { this.showDeleteModal = false; this.livraisonToDelete = null; }

  saveLivraison(): void {
    if (!this.livraisonForm.commandeId || !this.livraisonForm.client) {
      this.showMessage('Veuillez remplir les champs obligatoires.', 'error'); return;
    }

    const apiData = this.mapComponentToApi(this.livraisonForm);

    if (this.isEditing && this.editingId !== null) {
      this.livraisonService.updateLivraison(this.editingId, apiData).subscribe({
        next: (updated: any) => {
          const idx = this.livraisons.findIndex(l => l.id === this.editingId);
          if (idx !== -1) {
            this.livraisons[idx] = this.mapApiToComponent([updated])[0];
          }
          this.applyFilter();
          this.closeModal();
          this.showMessage('Livraison mise à jour avec succès !', 'success');
        },
        error: (err: any) => {
          console.error('Erreur mise à jour livraison:', err);
          this.showMessage('Erreur lors de la mise à jour de la livraison', 'error');
        }
      });
    } else {
      this.livraisonService.createLivraison(apiData).subscribe({
        next: (created: any) => {
          this.livraisons.unshift(this.mapApiToComponent([created])[0]);
          this.applyFilter();
          this.closeModal();
          this.showMessage('Livraison créée avec succès !', 'success');
        },
        error: (err: any) => {
          console.error('Erreur création livraison:', err);
          this.showMessage('Erreur lors de la création de la livraison', 'error');
        }
      });
    }
  }

  confirmDelete(): void {
    if (!this.livraisonToDelete) return;

    this.livraisonService.deleteLivraison(this.livraisonToDelete.id).subscribe({
      next: () => {
        this.livraisons = this.livraisons.filter(l => l.id !== this.livraisonToDelete!.id);
        this.applyFilter();
        this.closeDeleteModal();
        this.showMessage('Livraison supprimée avec succès.', 'success');
      },
      error: (err: any) => {
        console.error('Erreur suppression livraison:', err);
        this.showMessage('Erreur lors de la suppression de la livraison', 'error');
      }
    });
  }

  // ── Dropdown menu ────────────────────────────────────────────
  toggleMenu(id: number): void { this.activeMenu = this.activeMenu === id ? null : id; }

  @HostListener('document:click')
  onDocumentClick(): void { this.activeMenu = null; }

  // ── Helpers ──────────────────────────────────────────────────
  getStatutLabel(s: string): string {
    const map: Record<string, string> = {
      en_preparation: 'Préparation', en_cours: 'En cours', livree: 'Livrée', annulee: 'Annulée'
    };
    return map[s] ?? s;
  }

  getStatutIcon(s: string): string {
    const map: Record<string, string> = {
      en_preparation: 'bi-box-seam',    en_cours: 'bi-truck',
      livree: 'bi-check2-circle',       annulee: 'bi-x-circle'
    };
    return map[s] ?? 'bi-question-circle';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private emptyForm(): Partial<Livraison> {
    return { commandeId: '', client: '', adresse: '', statut: 'en_preparation', transporteur: '', tracking: '' };
  }

  showMessage(msg: string, type: 'success' | 'error'): void {
    if (this.notifTimer) clearTimeout(this.notifTimer);
    this.message     = msg;
    this.messageType = type;
    this.notifTimer  = setTimeout(() => this.message = '', 3500);
  }
}
