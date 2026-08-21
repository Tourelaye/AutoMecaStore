import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  Produit,
  ProductAction,
  ProduitAdminStatus,
  ProduitService,
  ProductSections,
  QualityAlert
} from './produit.service';

type StockFilter = 'tous' | 'en_stock' | 'stock_faible' | 'rupture';
type ModalKind = 'validation' | 'detail' | 'sections' | null;

interface StatusOption { value: ProduitAdminStatus | 'tous'; label: string; color: string; icon: string; }

@Component({
  selector: 'app-produit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatBadgeModule,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatProgressSpinnerModule
  ],
  templateUrl: './produit.component.html',
  styleUrl: './produit.component.css'
})
export class ProduitComponent implements OnInit {
  loading = true;
  submitting = false;
  produits: Produit[] = [];
  filtered: Produit[] = [];

  searchTerm = '';
  categoryFilter = 'toutes';
  statusFilter: ProduitAdminStatus | 'tous' = 'tous';
  stockFilter: StockFilter = 'tous';
  brandFilter = 'toutes';
  vendorFilter = 'toutes';
  dateFrom = '';
  dateTo = '';

  categories: string[] = ['toutes'];
  brands: string[] = ['toutes'];
  vendors: string[] = ['toutes'];

  viewMode: 'table' | 'grid' = 'table';

  statusOptions: StatusOption[] = [
    { value: 'tous', label: 'Tous les statuts', color: '#64748b', icon: 'bi-circle' },
    { value: 'en_attente_validation', label: 'En attente de validation', color: '#f59e0b', icon: 'bi-clock' },
    { value: 'publie', label: 'Publié', color: '#22c55e', icon: 'bi-check-circle' },
    { value: 'brouillon', label: 'Brouillon', color: '#3b82f6', icon: 'bi-pencil-square' },
    { value: 'a_corriger', label: 'À corriger', color: '#f97316', icon: 'bi-exclamation-octagon' },
    { value: 'refuse', label: 'Refusé', color: '#ef4444', icon: 'bi-x-circle' },
    { value: 'masque', label: 'Masqué', color: '#64748b', icon: 'bi-eye-slash' }
  ];

  stockOptions: { value: StockFilter; label: string }[] = [
    { value: 'tous', label: 'Tous les stocks' },
    { value: 'en_stock', label: 'En stock' },
    { value: 'stock_faible', label: 'Stock faible' },
    { value: 'rupture', label: 'Rupture' }
  ];

  activeModal: ModalKind = null;
  targetProduit: Produit | null = null;
  selectedProduit: Produit | null = null;
  selectedTab = 0;

  searchFocused = false;

  validationAction: ProductAction | null = null;
  validationConfig: { value: ProductAction; label: string; icon: string; color: string; requiresMotif: boolean } | null = null;
  validationMotif = '';

  readonly validationActions: { value: ProductAction; label: string; icon: string; color: string; requiresMotif: boolean }[] = [
    { value: 'publier', label: 'Publier', icon: 'bi-check-circle', color: '#22c55e', requiresMotif: false },
    { value: 'demander_correction', label: 'Demander des corrections', icon: 'bi-exclamation-octagon', color: '#f97316', requiresMotif: true },
    { value: 'masquer', label: 'Masquer', icon: 'bi-eye-slash', color: '#64748b', requiresMotif: false },
    { value: 'refuser', label: 'Refuser', icon: 'bi-x-circle', color: '#ef4444', requiresMotif: true },
    { value: 'supprimer', label: 'Supprimer', icon: 'bi-trash', color: '#dc2626', requiresMotif: false }
  ];

  constructor(private produitService: ProduitService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const params = this.buildApiParams();
    this.produitService.getAll(params).subscribe({
      next: list => {
        this.produits = list;
        this.populateFilters();
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('Erreur lors du chargement des produits.');
      }
    });
  }

  private buildApiParams() {
    const params: any = {};
    if (this.searchTerm.trim()) params.q = this.searchTerm.trim();
    if (this.statusFilter !== 'tous') params.statut = this.statusFilter;
    if (this.categoryFilter !== 'toutes') params.categorie = this.categoryFilter;
    if (this.brandFilter !== 'toutes') params.marque = this.brandFilter;
    if (this.vendorFilter !== 'toutes') params.fournisseur = this.vendorFilter;
    return params;
  }

  private populateFilters(): void {
    const categorySet = new Set<string>();
    const brandSet = new Set<string>();
    const vendorSet = new Set<string>();
    this.produits.forEach(p => {
      if (p.category) categorySet.add(p.category);
      if (p.brand) brandSet.add(p.brand);
      if (p.vendor) vendorSet.add(p.vendor);
    });
    this.categories = ['toutes', ...Array.from(categorySet).sort()];
    this.brands = ['toutes', ...Array.from(brandSet).sort()];
    this.vendors = ['toutes', ...Array.from(vendorSet).sort()];
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const from = this.dateFrom ? new Date(this.dateFrom) : null;
    const to = this.dateTo ? new Date(this.dateTo) : null;

    this.filtered = this.produits.filter(p => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.ref.toLowerCase().includes(term) ||
        p.reference_oem.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.vendor.toLowerCase().includes(term) ||
        p.vendor_store.toLowerCase().includes(term);

      const matchesCategory = this.categoryFilter === 'toutes' || p.category === this.categoryFilter;
      const matchesBrand = this.brandFilter === 'toutes' || p.brand === this.brandFilter;
      const matchesVendor = this.vendorFilter === 'toutes' || p.vendor === this.vendorFilter;
      const matchesStatus = this.statusFilter === 'tous' || p.admin_status === this.statusFilter;

      const matchesStock =
        this.stockFilter === 'tous' ||
        (this.stockFilter === 'rupture' && p.stock === 0) ||
        (this.stockFilter === 'stock_faible' && p.stock > 0 && p.stock <= this.produitService.lowStockThreshold) ||
        (this.stockFilter === 'en_stock' && p.stock > this.produitService.lowStockThreshold);

      let matchesDate = true;
      const created = p.created_at ? new Date(p.created_at) : null;
      if (from && created) matchesDate = matchesDate && created >= from;
      if (to && created) matchesDate = matchesDate && created <= to;

      return matchesSearch && matchesCategory && matchesBrand && matchesVendor && matchesStatus && matchesStock && matchesDate;
    });
  }

  onSearch(): void {
    this.load();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.categoryFilter = 'toutes';
    this.statusFilter = 'tous';
    this.stockFilter = 'tous';
    this.brandFilter = 'toutes';
    this.vendorFilter = 'toutes';
    this.dateFrom = '';
    this.dateTo = '';
    this.load();
  }

  stockLevel(p: Produit): 'rupture' | 'faible' | 'ok' {
    if (p.stock === 0) return 'rupture';
    if (p.stock <= this.produitService.lowStockThreshold) return 'faible';
    return 'ok';
  }

  getStatusMeta(status: ProduitAdminStatus) {
    return this.statusOptions.find(s => s.value === status) || this.statusOptions[0];
  }

  getStatusIcon(status: ProduitAdminStatus): string {
    return this.getStatusMeta(status).icon;
  }

  getStatusColor(status: ProduitAdminStatus): string {
    return this.getStatusMeta(status).color;
  }

  getSeverityClass(alert: QualityAlert): string {
    switch (alert.severity) {
      case 'high': return 'alert-danger';
      case 'medium': return 'alert-warning';
      default: return 'alert-info';
    }
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'no_image': return 'bi-image';
      case 'short_description':
      case 'short_description_courte': return 'bi-file-text';
      case 'price_incoherent': return 'bi-cash-coin';
      case 'empty_stock': return 'bi-box-seam';
      case 'no_compatibility': return 'bi-car-front';
      case 'duplicate': return 'bi-files';
      default: return 'bi-exclamation-triangle';
    }
  }

  openDetail(p: Produit): void {
    this.selectedProduit = p;
    this.selectedTab = 0;
    this.produitService.getDetail(p.id).subscribe({
      next: detail => {
        this.selectedProduit = detail;
        this.replace(detail);
        this.activeModal = 'detail';
      },
      error: () => alert('Erreur lors du chargement du détail produit.')
    });
  }

  closeDetail(): void {
    this.selectedProduit = null;
    this.activeModal = null;
  }

  openValidation(p: Produit, action: ProductAction): void {
    this.selectedProduit = null;
    this.targetProduit = p;
    this.validationAction = action;
    this.validationConfig = this.validationActions.find(a => a.value === action) || null;
    this.validationMotif = p.motif_rejet || '';
    this.activeModal = 'validation';
  }

  closeModal(): void {
    if (this.submitting) return;
    this.activeModal = null;
    this.targetProduit = null;
    this.selectedProduit = null;
    this.validationAction = null;
    this.validationConfig = null;
    this.validationMotif = '';
    this.sectionsForm = { bestOffer: false, flashSale: false, bestSeller: false, trending: false, lightningSale: false };
  }

  confirmValidation(): void {
    if (!this.targetProduit || !this.validationAction || !this.validationConfig || this.submitting) return;
    const action = this.validationAction;
    const motif = this.validationMotif.trim();

    const actionConfig = this.validationConfig;
    if (actionConfig.requiresMotif && !motif) {
      alert('Un motif est obligatoire pour cette action.');
      return;
    }

    this.submitting = true;
    this.produitService.validate(this.targetProduit.id, action, motif).subscribe({
      next: updated => {
        if (action === 'supprimer' && !(updated as any).id) {
          this.produits = this.produits.filter(p => p.id !== this.targetProduit!.id);
        } else {
          this.replace(updated);
        }
        this.applyFilters();
        this.endModal();
      },
      error: (err: any) => {
        alert(err?.error?.error || 'Erreur lors de l\'action de validation.');
        this.submitting = false;
      },
      complete: () => this.submitting = false
    });
  }

  askSections(p: Produit): void {
    this.selectedProduit = null;
    this.targetProduit = p;
    this.sectionsForm = { ...p.sections };
    this.activeModal = 'sections';
  }

  saveSections(): void {
    if (!this.targetProduit || this.submitting) return;
    this.submitting = true;
    this.produitService.setSections(this.targetProduit.id, this.sectionsForm).subscribe({
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

  private endModal(): void {
    this.submitting = false;
    this.activeModal = null;
    this.targetProduit = null;
    this.selectedProduit = null;
    this.validationAction = null;
    this.validationConfig = null;
    this.validationMotif = '';
    this.sectionsForm = { bestOffer: false, flashSale: false, bestSeller: false, trending: false, lightningSale: false };
  }

  private replace(updated: Produit): void {
    this.produits = this.produits.map(p => (p.id === updated.id ? updated : p));
  }

  // --- Statistiques ---
  get totalCount(): number { return this.produits.length; }
  get publieCount(): number { return this.produits.filter(p => p.admin_status === 'publie').length; }
  get attenteCount(): number { return this.produits.filter(p => p.admin_status === 'en_attente_validation').length; }
  get refuseCount(): number { return this.produits.filter(p => p.admin_status === 'refuse').length; }
  get masqueCount(): number { return this.produits.filter(p => p.admin_status === 'masque').length; }
  get aCorrigerCount(): number { return this.produits.filter(p => p.admin_status === 'a_corriger').length; }
  get brouillonCount(): number { return this.produits.filter(p => p.admin_status === 'brouillon').length; }

  topCategories(limit = 5): { name: string; count: number }[] {
    return this.rankBy(p => p.category, limit);
  }

  topBrands(limit = 5): { name: string; count: number }[] {
    return this.rankBy(p => p.brand, limit);
  }

  private rankBy(selector: (p: Produit) => string, limit: number): { name: string; count: number }[] {
    const map = new Map<string, number>();
    this.produits.forEach(p => {
      const key = selector(p) || 'Non renseigné';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

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

  formatDate(value: string | null): string {
    if (!value) return '-';
    const d = new Date(value);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  countAlerts(severity: 'high' | 'medium' | 'low'): number {
    return (this.selectedProduit?.alerts ?? []).filter(a => a.severity === severity).length;
  }

  sectionsForm: ProductSections = { bestOffer: false, flashSale: false, bestSeller: false, trending: false, lightningSale: false };
}