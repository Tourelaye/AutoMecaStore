import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { CategorieService } from '../../../core/services/categorie.service';
import { Categorie } from '../../../models/categorie.model';

interface CategorieDisplay extends Categorie {
  icone?: string;
}

@Component({
  selector: 'app-categorie',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './categorie.component.html',
  styleUrls: ['./categorie.component.css']
})
export class CategorieComponent implements OnInit {
  categories: CategorieDisplay[] = [];
  loading = false;
  showModal = false;
  editingCategorie: CategorieDisplay | null = null;
  searchFocused = false;
  activeFilter = 'all';
  showFilter = false;
  showDeleteModal = false;
  categorieToDelete: CategorieDisplay | null = null;
  
  categorieForm: Partial<CategorieDisplay> = {
    nom: '',
    description: '',
    icone: 'bi-folder',
    etat: 'actif',
    ordre: 0
  };
  
  searchTerm = '';
  notification: { message: string; type: 'success' | 'error' } | null = null;

  iconesDisponibles = [
    { value: 'bi-folder', label: 'Dossier' },
    { value: 'bi-car-front', label: 'Voiture' },
    { value: 'bi-gear', label: 'Engrenage' },
    { value: 'bi-droplet', label: 'Huile' },
    { value: 'bi-battery-charging', label: 'Batterie' },
    { value: 'bi-disc', label: 'Frein' },
    { value: 'bi-lightbulb', label: 'Eclairage' },
    { value: 'bi-wrench', label: 'Outils' }
  ];

  constructor(private categorieService: CategorieService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.categorieService.getCategories().subscribe({
      next: (data) => {
        this.categories = data.map(cat => ({
          ...cat,
          icone: this.getIconeForCategorie(cat.nom)
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement categories:', err);
        this.showNotification('Erreur lors du chargement des categories', 'error');
        this.loading = false;
      }
    });
  }

  getIconeForCategorie(nom: string): string {
    const nomLower = nom.toLowerCase();
    if (nomLower.includes('frein')) return 'bi-disc';
    if (nomLower.includes('moteur') || nomLower.includes('engine')) return 'bi-gear';
    if (nomLower.includes('huile') || nomLower.includes('filtre')) return 'bi-droplet';
    if (nomLower.includes('batterie')) return 'bi-battery-charging';
    if (nomLower.includes('eclairage') || nomLower.includes('lumiere')) return 'bi-lightbulb';
    if (nomLower.includes('outil')) return 'bi-wrench';
    return 'bi-folder';
  }

  openAddModal(): void {
    this.editingCategorie = null;
    this.categorieForm = {
      nom: '',
      description: '',
      icone: 'bi-folder',
      etat: 'actif',
      ordre: this.categories.length
    };
    this.showModal = true;
  }

  openEditModal(categorie: CategorieDisplay): void {
    this.editingCategorie = categorie;
    this.categorieForm = {
      nom: categorie.nom,
      description: categorie.description,
      icone: categorie.icone || 'bi-folder',
      etat: categorie.etat,
      ordre: categorie.ordre ?? this.categories.indexOf(categorie)
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingCategorie = null;
  }

  saveCategorie(): void {
    const categorieData: Partial<Categorie> = {
      nom: this.categorieForm.nom || '',
      description: this.categorieForm.description || '',
      etat: this.categorieForm.etat || 'actif',
      ordre: this.categorieForm.ordre ?? this.categories.length,
      datecreation: new Date().toISOString(),
      datemodification: new Date().toISOString(),
      categorieid: null
    };

    if (this.editingCategorie) {
      this.categorieService.updateCategorie(this.editingCategorie.id, categorieData).subscribe({
        next: () => {
          this.loadCategories();
          this.closeModal();
          this.showNotification('Categorie mise a jour avec succes', 'success');
        },
        error: (err) => {
          console.error('Erreur update:', err);
          this.showNotification('Erreur lors de la mise a jour', 'error');
        }
      });
    } else {
      this.categorieService.createCategorie(categorieData as Omit<Categorie, 'id'>).subscribe({
        next: () => {
          this.loadCategories();
          this.closeModal();
          this.showNotification('Categorie ajoutee avec succes', 'success');
        },
        error: (err) => {
          console.error('Erreur create:', err);
          this.showNotification('Erreur lors de l\'ajout', 'error');
        }
      });
    }
  }

  deleteCategorie(categorie: CategorieDisplay): void {
    if (confirm(`Supprimer la categorie "${categorie.nom}" ?`)) {
      this.categorieService.deleteCategorie(categorie.id).subscribe({
        next: () => {
          this.loadCategories();
          this.showNotification('Categorie supprimee avec succes', 'success');
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

  searchCategories(): void {
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      this.categories = this.categories.filter(cat => 
        cat.nom.toLowerCase().includes(term) || 
        cat.description?.toLowerCase().includes(term)
      );
    } else {
      this.loadCategories();
    }
  }

  getStatutClass(etat: string): string {
    return etat === 'actif' ? 'active' : 'inactive';
  }

  // 🔢 Obtenir le nombre de catégories actives
  getActiveCount(): number {
    return this.categories.filter(c => c.etat === 'actif').length;
  }

  // 🔢 Obtenir le nombre de catégories inactives
  getInactiveCount(): number {
    return this.categories.filter(c => c.etat === 'inactif').length;
  }

  // 🔀 Normalise les ordres si duplication détectée
  normalizeOrdre(): void {
    const sorted = [...this.categories].sort((a, b) => (a.ordre - b.ordre) || a.nom.localeCompare(b.nom));
    const items = sorted.map((c, i) => ({ id: c.id, ordre: i }));
    this.categorieService.reorderCategories(items).subscribe(() => this.loadCategories());
  }

  // ⬆️ Déplacer vers le haut
  moveUp(index: number): void {
    const list = this.filteredCategories;
    if (index <= 0 || list.length < 2) return;
    const uniqueOrdres = new Set(this.categories.map(c => c.ordre)).size === this.categories.length;
    if (!uniqueOrdres) {
      this.normalizeOrdre();
      return;
    }
    const a = list[index];
    const b = list[index - 1];
    const temp = a.ordre;
    a.ordre = b.ordre;
    b.ordre = temp;
    this.categorieService.reorderCategories([
      { id: a.id, ordre: a.ordre },
      { id: b.id, ordre: b.ordre }
    ]).subscribe(() => this.loadCategories());
  }

  // ⬇️ Déplacer vers le bas
  moveDown(index: number): void {
    const list = this.filteredCategories;
    if (index >= list.length - 1 || list.length < 2) return;
    const uniqueOrdres = new Set(this.categories.map(c => c.ordre)).size === this.categories.length;
    if (!uniqueOrdres) {
      this.normalizeOrdre();
      return;
    }
    const a = list[index];
    const b = list[index + 1];
    const temp = a.ordre;
    a.ordre = b.ordre;
    b.ordre = temp;
    this.categorieService.reorderCategories([
      { id: a.id, ordre: a.ordre },
      { id: b.id, ordre: b.ordre }
    ]).subscribe(() => this.loadCategories());
  }

  // 🔍 Obtenir les catégories filtrées
  get filteredCategories(): CategorieDisplay[] {
    let filtered = [...this.categories].sort((a, b) => (a.ordre - b.ordre) || a.nom.localeCompare(b.nom));

    // Appliquer le filtre de statut
    if (this.activeFilter !== 'all') {
      filtered = filtered.filter(c => c.etat === this.activeFilter);
    }

    // Appliquer la recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(cat =>
        cat.nom.toLowerCase().includes(term) ||
        cat.description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  // 🏷️ Définir le filtre actif
  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.showFilter = false;
  }

  // 🔀 Basculer le menu de filtre
  toggleFilter(): void {
    this.showFilter = !this.showFilter;
  }

  // 📅 Formater une date
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // 🗑️ Ouvrir le modal de suppression
  openDeleteModal(categorie: CategorieDisplay): void {
    this.categorieToDelete = categorie;
    this.showDeleteModal = true;
  }

  // ❌ Fermer le modal de suppression
  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.categorieToDelete = null;
  }

  // ✅ Confirmer la suppression
  confirmDelete(): void {
    if (this.categorieToDelete) {
      this.deleteCategorie(this.categorieToDelete);
      this.closeDeleteModal();
    }
  }
}
