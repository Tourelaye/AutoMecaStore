import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Produit, ProductSections, ProduitService, ProduitState } from './produit.service';

type StatusFilter = 'tous' | ProduitState | 'signale';
type StockFilter = 'tous' | 'en_stock' | 'stock_faible' | 'rupture';
type ModalKind = 'delete' | 'signal' | 'sections' | null;

@Component({
  selector: 'app-produit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produit.component.html',
  styleUrl: './produit.component.css'
})
export class ProduitComponent implements OnInit {
  loading = true;
  produits: Produit[] = [];
  filtered: Produit[] = [];

  searchTerm = '';
  categoryFilter = 'toutes';
  statusFilter: StatusFilter = 'tous';
  stockFilter: StockFilter = 'tous';

  categories: string[] = [];

  statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'en_ligne', label: 'En ligne' },
    { value: 'desactive', label: 'Désactivé' },
    { value: 'signale', label: 'Signalé' }
  ];

  stockOptions: { value: StockFilter; label: string }[] = [
    { value: 'tous', label: 'Tous les stocks' },
    { value: 'en_stock', label: 'En stock' },
    { value: 'stock_faible', label: 'Stock faible' },
    { value: 'rupture', label: 'Rupture' }
  ];

  // --- Modale générique (suppression / signalement) ---
  activeModal: ModalKind = null;
  targetProduit: Produit | null = null;
  reasonInput = '';
  sectionsForm: ProductSections = { bestOffer: false, flashSale: false, bestSeller: false, trending: false, lightningSale: false };
  submitting = false;
  searchFocused = false;

  constructor(private produitService: ProduitService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.produitService.getAll().subscribe({
      next: list => {
        this.produits = list;
        this.categories = ['toutes', ...Array.from(new Set(list.map(p => p.category)))];
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('Erreur lors du chargement des produits.');
      }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.produits.filter(p => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.ref.toLowerCase().includes(term) ||
        p.vendor.toLowerCase().includes(term);

      const matchesCategory = this.categoryFilter === 'toutes' || p.category === this.categoryFilter;

      const matchesStatus =
        this.statusFilter === 'tous' ||
        (this.statusFilter === 'signale' ? p.signale : p.state === this.statusFilter);

      const matchesStock =
        this.stockFilter === 'tous' ||
        (this.stockFilter === 'rupture' && p.stock === 0) ||
        (this.stockFilter === 'stock_faible' && p.stock > 0 && p.stock <= this.produitService.lowStockThreshold) ||
        (this.stockFilter === 'en_stock' && p.stock > this.produitService.lowStockThreshold);

      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });
  }

  stockLevel(p: Produit): 'rupture' | 'faible' | 'ok' {
    if (p.stock === 0) return 'rupture';
    if (p.stock <= this.produitService.lowStockThreshold) return 'faible';
    return 'ok';
  }

  // --- Actions directes ---
  toggleActivation(p: Produit): void {
    if (this.submitting) return;
    this.submitting = true;
    const nextState: ProduitState = p.state === 'desactive' ? 'en_ligne' : 'desactive';
    this.produitService.setState(p.id, nextState).subscribe({
      next: updated => this.replace(updated),
      error: () => { alert('Erreur lors du changement d\'état.'); this.submitting = false; },
      complete: () => this.submitting = false
    });
  }

  removeSignal(p: Produit): void {
    if (this.submitting) return;
    this.submitting = true;
    this.produitService.setSignal(p.id, false).subscribe({
      next: updated => this.replace(updated),
      error: () => { alert('Erreur lors du retrait du signalement.'); this.submitting = false; },
      complete: () => this.submitting = false
    });
  }

  // --- Actions avec confirmation / saisie ---
  askDelete(p: Produit): void {
    this.targetProduit = p;
    this.activeModal = 'delete';
  }

  askSignal(p: Produit): void {
    this.targetProduit = p;
    this.reasonInput = '';
    this.activeModal = 'signal';
  }

  askSections(p: Produit): void {
    this.targetProduit = p;
    this.sectionsForm = { ...p.sections };
    this.activeModal = 'sections';
  }

  closeModal(): void {
    if (this.submitting) return;
    this.activeModal = null;
    this.targetProduit = null;
  }

  confirmModal(): void {
    if (!this.targetProduit || this.submitting) return;
    const id = this.targetProduit.id;
    this.submitting = true;

    if (this.activeModal === 'delete') {
      this.produitService.delete(id).subscribe({
        next: () => {
          this.produits = this.produits.filter(p => p.id !== id);
          this.applyFilters();
          this.endModal();
        },
        error: () => {
          alert('Erreur lors de la suppression.');
          this.submitting = false;
        }
      });
    } else if (this.activeModal === 'signal') {
      this.produitService.setSignal(id, true, this.reasonInput.trim() || 'Signalé par un administrateur.').subscribe({
        next: updated => {
          this.replace(updated);
          this.endModal();
        },
        error: () => {
          alert('Erreur lors du signalement.');
          this.submitting = false;
        }
      });
    } else if (this.activeModal === 'sections') {
      this.produitService.setSections(id, this.sectionsForm).subscribe({
        next: updated => {
          this.replace(updated);
          this.endModal();
        },
        error: () => {
          alert('Erreur lors de la mise à jour des sections.');
          this.submitting = false;
        }
      });
    }
  }

  private endModal(): void {
    this.submitting = false;
    this.activeModal = null;
    this.targetProduit = null;
    this.reasonInput = '';
    this.sectionsForm = { bestOffer: false, flashSale: false, bestSeller: false, trending: false, lightningSale: false };
  }

  private replace(updated: Produit): void {
    this.produits = this.produits.map(p => (p.id === updated.id ? updated : p));
    this.applyFilters();
  }

  get onlineCount(): number { return this.produits.filter(p => p.state === 'en_ligne').length; }
  get offlineCount(): number { return this.produits.filter(p => p.state === 'desactive').length; }
  get signaledCount(): number { return this.produits.filter(p => p.signale).length; }
  get totalCount(): number { return this.produits.length; }

  trackById(_index: number, item: Produit): string {
    return item.id.toString();
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0].toUpperCase())
      .slice(0, 2)
      .join('');
  }
}