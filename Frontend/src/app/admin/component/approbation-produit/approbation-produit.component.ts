import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApprobationProduitService, Produit } from '../../../admin/service/approbation-produit.service';

type NotificationType = 'success' | 'error' | 'info';

@Component({
  selector: 'app-approbation-produit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approbation-produit.component.html',
  styleUrls: ['./approbation-produit.component.css']
})
export class ApprobationProduitComponent implements OnInit {
  produits: Produit[] = [];
  produitsFiltres: Produit[] = [];
  produitSelectionne: Produit | null = null;
  produitDetail: Produit | null = null;
  motifRejet: string = '';

  loading: boolean = false;
  updatingId: number | null = null;
  showRejetModal: boolean = false;
  showDetailModal: boolean = false;
  error: string | null = null;

  searchTerm: string = '';
  searchFocused: boolean = false;
  activeFilter: 'all' | 'en_attente' | 'approuve' | 'rejete' = 'all';

  notification: { message: string; type: NotificationType } | null = null;

  constructor(private approbationService: ApprobationProduitService) {}

  ngOnInit(): void {
    this.chargerProduits();
  }

  chargerProduits(): void {
    this.loading = true;
    this.error = null;

    this.approbationService.getProduits('tous').subscribe({
      next: (produits: Produit[]) => {
        this.produits = produits;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les produits. Veuillez réessayer.';
        this.loading = false;
        this.showNotification('Erreur lors du chargement des produits', 'error');
      }
    });
  }

  refreshProduits(): void {
    this.chargerProduits();
    this.showNotification('Liste des produits actualisée', 'info');
  }

  approuverProduit(produit: Produit | null): void {
    if (!produit) return;

    if (!confirm(`Voulez-vous vraiment approuver le produit "${produit.nom}" ?`)) {
      return;
    }

    this.updatingId = produit.id;
    this.approbationService.approuverProduit(produit.id).subscribe({
      next: (produitApprouve: Produit) => {
        this.updateProduitInList(produitApprouve);
        this.showNotification(`Produit "${produitApprouve.nom}" approuvé`, 'success');
        this.updatingId = null;
      },
      error: () => {
        this.showNotification('Erreur lors de l\'approbation du produit', 'error');
        this.updatingId = null;
      }
    });
  }

  ouvrirModalRejet(produit: Produit): void {
    this.produitSelectionne = produit;
    this.motifRejet = '';
    this.showRejetModal = true;
  }

  fermerModalRejet(): void {
    this.showRejetModal = false;
    this.produitSelectionne = null;
    this.motifRejet = '';
  }

  rejeterProduit(): void {
    if (!this.produitSelectionne || !this.motifRejet.trim()) {
      this.showNotification('Veuillez fournir un motif de rejet', 'error');
      return;
    }

    this.updatingId = this.produitSelectionne.id;
    this.approbationService.rejeterProduit(this.produitSelectionne.id, this.motifRejet).subscribe({
      next: (produitRejete: Produit) => {
        this.updateProduitInList(produitRejete);
        this.fermerModalRejet();
        this.showNotification(`Produit "${produitRejete.nom}" rejeté`, 'success');
        this.updatingId = null;
      },
      error: () => {
        this.showNotification('Erreur lors du rejet du produit', 'error');
        this.updatingId = null;
      }
    });
  }

  ouvrirModalDetails(produit: Produit): void {
    this.updatingId = produit.id;
    this.approbationService.getProduitDetail(produit.id).subscribe({
      next: (detail: Produit) => {
        this.produitDetail = detail;
        this.showDetailModal = true;
        this.updatingId = null;
      },
      error: () => {
        this.produitDetail = produit;
        this.showDetailModal = true;
        this.updatingId = null;
      }
    });
  }

  fermerModalDetails(): void {
    this.showDetailModal = false;
    this.produitDetail = null;
  }

  supprimerProduit(produit: Produit): void {
    if (!confirm(`Voulez-vous vraiment supprimer le produit "${produit.nom}" ?`)) {
      return;
    }

    this.updatingId = produit.id;
    this.approbationService.supprimerProduit(produit.id).subscribe({
      next: () => {
        this.produits = this.produits.filter(p => p.id !== produit.id);
        this.applyFilters();
        this.showNotification('Produit supprimé', 'success');
        this.updatingId = null;
      },
      error: () => {
        this.showNotification('Erreur lors de la suppression du produit', 'error');
        this.updatingId = null;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.produits];

    if (this.activeFilter !== 'all') {
      filtered = filtered.filter(p => p.statut_approbation === this.activeFilter);
    }

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(p =>
        p.nom?.toLowerCase().includes(term) ||
        p.fournisseur_nom?.toLowerCase().includes(term) ||
        p.reference?.toLowerCase().includes(term) ||
        p.marque?.toLowerCase().includes(term) ||
        p.categorie_nom?.toLowerCase().includes(term)
      );
    }

    this.produitsFiltres = filtered;
  }

  searchProduits(): void {
    this.applyFilters();
  }

  setFilter(filter: 'all' | 'en_attente' | 'approuve' | 'rejete'): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  getFilterLabel(filter: string): string {
    const labels: { [key: string]: string } = {
      all: 'Tous',
      en_attente: 'En attente',
      approuve: 'Approuvés',
      rejete: 'Rejetés'
    };
    return labels[filter] || filter;
  }

  getFilterCount(filter: string): number {
    if (filter === 'all') return this.produits.length;
    return this.produits.filter(p => p.statut_approbation === filter).length;
  }

  getStats(): { total: number; enAttente: number; approuves: number; rejetes: number } {
    return {
      total: this.produits.length,
      enAttente: this.produits.filter(p => p.statut_approbation === 'en_attente').length,
      approuves: this.produits.filter(p => p.statut_approbation === 'approuve').length,
      rejetes: this.produits.filter(p => p.statut_approbation === 'rejete').length
    };
  }

  getStatutClass(statut: string): string {
    const classes: { [key: string]: string } = {
      en_attente: 'status-orange',
      approuve: 'status-green',
      rejete: 'status-red'
    };
    return classes[statut] || 'status-gray';
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      en_attente: 'En attente',
      approuve: 'Approuvé',
      rejete: 'Rejeté'
    };
    return labels[statut] || statut;
  }

  getStatutIcon(statut: string): string {
    const icons: { [key: string]: string } = {
      en_attente: 'bi-clock',
      approuve: 'bi-check-circle',
      rejete: 'bi-x-circle'
    };
    return icons[statut] || 'bi-question-circle';
  }

  getImageUrl(image?: string | null): string {
    if (!image) return 'assets/images/placeholder-product.png';
    if (image.startsWith('http')) return image;
    return `http://127.0.0.1:8000${image}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder-product.png';
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  getInitials(name?: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0].toUpperCase())
      .slice(0, 2)
      .join('');
  }

  trackByProduitId(index: number, produit: Produit): number {
    return produit.id;
  }

  showNotification(message: string, type: NotificationType): void {
    this.notification = { message, type };
    setTimeout(() => this.notification = null, 5000);
  }

  private updateProduitInList(updated: Produit): void {
    const index = this.produits.findIndex(p => p.id === updated.id);
    if (index !== -1) {
      this.produits[index] = updated;
    } else {
      this.produits = [updated, ...this.produits];
    }
    this.applyFilters();
  }
}
