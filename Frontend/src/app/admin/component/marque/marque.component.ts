import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { MarqueService } from '../../../core/services/marque.service';
import { Marque } from '../../../models/marque.model';

interface MarqueDisplay extends Marque {
  isImageUrl?: string;
}

@Component({
  selector: 'app-marque',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './marque.component.html',
  styleUrls: ['../categorie/categorie.component.css', './marque.component.css']
})
export class MarqueComponent implements OnInit {
  marques: MarqueDisplay[] = [];
  loading = false;
  showModal = false;
  editingMarque: MarqueDisplay | null = null;
  searchFocused = false;
  activeFilter = 'all';
  showFilter = false;
  showDeleteModal = false;
  marqueToDelete: MarqueDisplay | null = null;

  marqueForm: Partial<MarqueDisplay> = {
    nom: '',
    description: '',
    est_visible: true,
    ordre: 0
  };
  logoFile: File | null = null;
  previewUrl: string | null = null;

  searchTerm = '';
  notification: { message: string; type: 'success' | 'error' } | null = null;

  constructor(private marqueService: MarqueService) {}

  ngOnInit(): void {
    this.loadMarques();
  }

  loadMarques(): void {
    this.loading = true;
    this.marqueService.getMarques().subscribe({
      next: (data) => {
        this.marques = data.map(m => ({ ...m }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement marques:', err);
        this.showNotification('Erreur lors du chargement des marques', 'error');
        this.loading = false;
      }
    });
  }

  openAddModal(): void {
    this.editingMarque = null;
    this.marqueForm = {
      nom: '',
      description: '',
      est_visible: true,
      ordre: this.marques.length
    };
    this.logoFile = null;
    this.previewUrl = null;
    this.showModal = true;
  }

  openEditModal(marque: MarqueDisplay): void {
    this.editingMarque = marque;
    this.marqueForm = {
      nom: marque.nom,
      description: marque.description || '',
      est_visible: marque.est_visible,
      ordre: marque.ordre ?? this.marques.indexOf(marque)
    };
    this.logoFile = null;
    this.previewUrl = marque.logo_url || null;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingMarque = null;
    this.logoFile = null;
    this.previewUrl = null;
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.logoFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.previewUrl = reader.result as string;
      reader.readAsDataURL(this.logoFile);
    }
  }

  buildFormData(): FormData {
    const data = new FormData();
    data.append('nom', this.marqueForm.nom || '');
    if (this.marqueForm.description) {
      data.append('description', this.marqueForm.description);
    }
    data.append('est_visible', this.marqueForm.est_visible ? 'true' : 'false');
    data.append('ordre', String(this.marqueForm.ordre ?? this.marques.length));
    if (this.logoFile) {
      data.append('logo', this.logoFile);
    }
    return data;
  }

  saveMarque(): void {
    const payload = this.buildFormData();

    if (this.editingMarque) {
      this.marqueService.updateMarque(this.editingMarque.id, payload).subscribe({
        next: () => {
          this.loadMarques();
          this.closeModal();
          this.showNotification('Marque mise à jour avec succès', 'success');
        },
        error: (err) => {
          console.error('Erreur update:', err);
          this.showNotification('Erreur lors de la mise à jour', 'error');
        }
      });
    } else {
      this.marqueService.createMarque(payload).subscribe({
        next: () => {
          this.loadMarques();
          this.closeModal();
          this.showNotification('Marque ajoutée avec succès', 'success');
        },
        error: (err) => {
          console.error('Erreur create:', err);
          this.showNotification('Erreur lors de l\'ajout', 'error');
        }
      });
    }
  }

  deleteMarque(marque: MarqueDisplay): void {
    if (confirm(`Supprimer la marque "${marque.nom}" ?`)) {
      this.marqueService.deleteMarque(marque.id).subscribe({
        next: () => {
          this.loadMarques();
          this.showNotification('Marque supprimée avec succès', 'success');
        },
        error: (err) => {
          console.error('Erreur delete:', err);
          this.showNotification('Erreur lors de la suppression', 'error');
        }
      });
    }
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.notification = { message, type };
    setTimeout(() => this.notification = null, 3000);
  }

  searchMarques(): void {
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      this.marques = this.marques.filter(m =>
        m.nom.toLowerCase().includes(term) ||
        (m.description && m.description.toLowerCase().includes(term))
      );
    } else {
      this.loadMarques();
    }
  }

  getStatutClass(estVisible: boolean): string {
    return estVisible ? 'active' : 'inactive';
  }

  getActiveCount(): number {
    return this.marques.filter(m => m.est_visible).length;
  }

  getInactiveCount(): number {
    return this.marques.filter(m => !m.est_visible).length;
  }

  normalizeOrdre(): void {
    const sorted = [...this.marques].sort((a, b) => (a.ordre - b.ordre) || a.nom.localeCompare(b.nom));
    const items = sorted.map((m, i) => ({ id: m.id, ordre: i }));
    this.marqueService.reorderMarques(items).subscribe(() => this.loadMarques());
  }

  moveUp(index: number): void {
    const list = this.filteredMarques;
    if (index <= 0 || list.length < 2) return;
    const uniqueOrdres = new Set(this.marques.map(m => m.ordre)).size === this.marques.length;
    if (!uniqueOrdres) {
      this.normalizeOrdre();
      return;
    }
    const a = list[index];
    const b = list[index - 1];
    const temp = a.ordre;
    a.ordre = b.ordre;
    b.ordre = temp;
    this.marqueService.reorderMarques([
      { id: a.id, ordre: a.ordre },
      { id: b.id, ordre: b.ordre }
    ]).subscribe(() => this.loadMarques());
  }

  moveDown(index: number): void {
    const list = this.filteredMarques;
    if (index >= list.length - 1 || list.length < 2) return;
    const uniqueOrdres = new Set(this.marques.map(m => m.ordre)).size === this.marques.length;
    if (!uniqueOrdres) {
      this.normalizeOrdre();
      return;
    }
    const a = list[index];
    const b = list[index + 1];
    const temp = a.ordre;
    a.ordre = b.ordre;
    b.ordre = temp;
    this.marqueService.reorderMarques([
      { id: a.id, ordre: a.ordre },
      { id: b.id, ordre: b.ordre }
    ]).subscribe(() => this.loadMarques());
  }

  get filteredMarques(): MarqueDisplay[] {
    let filtered = [...this.marques].sort((a, b) => (a.ordre - b.ordre) || a.nom.localeCompare(b.nom));

    if (this.activeFilter !== 'all') {
      const visible = this.activeFilter === 'actif';
      filtered = filtered.filter(m => m.est_visible === visible);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.nom.toLowerCase().includes(term) ||
        (m.description && m.description.toLowerCase().includes(term))
      );
    }

    return filtered;
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.showFilter = false;
  }

  toggleFilter(): void {
    this.showFilter = !this.showFilter;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  openDeleteModal(marque: MarqueDisplay): void {
    this.marqueToDelete = marque;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.marqueToDelete = null;
  }

  confirmDelete(): void {
    if (this.marqueToDelete) {
      this.deleteMarque(this.marqueToDelete);
      this.closeDeleteModal();
    }
  }
}
