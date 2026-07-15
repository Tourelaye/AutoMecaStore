import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Produit, ProduitService, ProduitState } from './produit.service';

type StatusFilter = 'tous' | ProduitState | 'signale';
type StockFilter = 'tous' | 'en_stock' | 'stock_faible' | 'rupture';
type ModalKind = 'delete' | 'refuse' | 'signal' | null;

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
    { value: 'attente_validation', label: 'Attente validation' },
    { value: 'signale', label: 'Signalé' }
  ];

  stockOptions: { value: StockFilter; label: string }[] = [
    { value: 'tous', label: 'Tous les stocks' },
    { value: 'en_stock', label: 'En stock' },
    { value: 'stock_faible', label: 'Stock faible' },
    { value: 'rupture', label: 'Rupture' }
  ];

  // --- Modale générique (suppression / refus / signalement) ---
  activeModal: ModalKind = null;
  targetProduit: Produit | null = null;
  reasonInput = '';
  submitting = false;

  constructor(private produitService: ProduitService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.produitService.getAll().subscribe(list => {
      this.produits = list;
      this.categories = ['toutes', ...Array.from(new Set(list.map(p => p.category)))];
      this.applyFilters();
      this.loading = false;
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

  // --- Actions directes (pas de confirmation nécessaire) ---
  toggleActivation(p: Produit): void {
    const nextState: ProduitState = p.state === 'desactive' ? 'en_ligne' : 'desactive';
    this.produitService.setState(p.id, nextState).subscribe(updated => this.replace(updated));
  }

  validate(p: Produit): void {
    this.produitService.setState(p.id, 'en_ligne').subscribe(updated => this.replace(updated));
  }

  removeSignal(p: Produit): void {
    this.produitService.setSignal(p.id, false).subscribe(updated => this.replace(updated));
  }

  // --- Actions avec confirmation / saisie ---
  askDelete(p: Produit): void {
    this.targetProduit = p;
    this.activeModal = 'delete';
  }

  askRefuse(p: Produit): void {
    this.targetProduit = p;
    this.reasonInput = '';
    this.activeModal = 'refuse';
  }

  askSignal(p: Produit): void {
    this.targetProduit = p;
    this.reasonInput = '';
    this.activeModal = 'signal';
  }

  closeModal(): void {
    if (this.submitting) return;
    this.activeModal = null;
    this.targetProduit = null;
  }

  confirmModal(): void {
    if (!this.targetProduit) return;
    const id = this.targetProduit.id;
    this.submitting = true;

    if (this.activeModal === 'delete') {
      this.produitService.delete(id).subscribe(() => {
        this.produits = this.produits.filter(p => p.id !== id);
        this.applyFilters();
        this.endModal();
      });
    } else if (this.activeModal === 'refuse') {
      this.produitService.setState(id, 'desactive').subscribe(updated => {
        this.replace(updated);
        this.endModal();
      });
    } else if (this.activeModal === 'signal') {
      this.produitService.setSignal(id, true, this.reasonInput.trim() || 'Signalé par un administrateur.').subscribe(updated => {
        this.replace(updated);
        this.endModal();
      });
    }
  }

  private endModal(): void {
    this.submitting = false;
    this.activeModal = null;
    this.targetProduit = null;
  }

  private replace(updated: Produit): void {
    this.produits = this.produits.map(p => (p.id === updated.id ? updated : p));
    this.applyFilters();
  }

  get onlineCount(): number { return this.produits.filter(p => p.state === 'en_ligne').length; }
  get pendingCount(): number { return this.produits.filter(p => p.state === 'attente_validation').length; }
  get signaledCount(): number { return this.produits.filter(p => p.signale).length; }
  get totalCount(): number { return this.produits.length; }

  trackById(_index: number, item: Produit): string {
    return item.id.toString();
  }
}