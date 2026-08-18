import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import {
  trigger, transition, style, animate, keyframes
} from '@angular/animations';
import { Subscription } from 'rxjs';
import { ProduitService, Produit } from '../../services/produit.service';

@Component({
  selector: 'app-produit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './list-produit.component.html',
  styleUrls: ['./list-produit.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(32px) scale(0.97)' }),
        animate('280ms cubic-bezier(0.34,1.56,0.64,1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('180ms ease',
          style({ opacity: 0, transform: 'translateY(16px)' }))
      ])
    ]),
    trigger('toastIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.34,1.56,0.64,1)',
          style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease',
          style({ opacity: 0, transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class ProduitComponent implements OnInit, OnDestroy {

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  Math = Math;

  // ── État ────────────────────────────────────────────────────────────
  isLoading   = false;
  isSaving    = false;
  formError   = '';

  // ── Modals ──────────────────────────────────────────────────────────
  showModal       = false;
  showDeleteModal = false;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  selectedProduit:  Produit | null = null;
  produitASupprimer: Produit | null = null;

  // ── Toast ────────────────────────────────────────────────────────────
  toastMsg  = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  // ── Formulaire ───────────────────────────────────────────────────────
  form = this.emptyForm();
  imagePreview: string | null = null;

  // ── Tri & Pagination ─────────────────────────────────────────────────
  sortField  = '';
  sortDir: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize    = 8;

  // ── Filtres ───────────────────────────────────────────────────────────
  searchTerm         = '';
  selectedCategorie  = '';
  selectedStatut     = '';

  categoriesVehicule = [
    { value: '',               label: 'Toutes Catégories' },
    { value: 'Automobile',     label: 'Automobile'        },
    { value: 'Moto & Scooter', label: 'Moto & Scooter'   },
    { value: 'Poids Lourds',   label: 'Poids Lourds'     },
    { value: 'Vélo & E-bike',  label: 'Vélo & E-bike'    },
  ];

  statutOptions = [
    { value: '',        label: 'Tous',         cls: '' },
    { value: 'actif',   label: '✓ Actifs',     cls: 'sf-green' },
    { value: 'faible',  label: '⚠ Stock faible', cls: 'sf-orange' },
    { value: 'rupture', label: '✕ Rupture',    cls: 'sf-red' },
  ];

  typesPiece = [
    'Freinage', 'Filtration', 'Suspension', 'Moteur', 'Allumage',
    'Transmission', 'Électrique', 'Carrosserie', 'Kit chaîne & Pignon',
    'Freinage Pneumatique', 'Lubrifiants', 'Distribution',
  ];

  // ── Données ───────────────────────────────────────────────────────────
  produits: Produit[] = [];

  filteredProduits: Produit[] = [];

  private subs = new Subscription();

  // ── Computed ──────────────────────────────────────────────────────────
  get produitsActifs():    number { return this.produits.filter(p => (p.stock || 0) > 0).length; }
  get produitsStockFaible():number { return this.produits.filter(p => (p.stock || 0) > 0 && p.stock <= 10).length; }
  get produitsRupture():   number { return this.produits.filter(p => (p.stock || 0) === 0).length; }
  get totalPages():        number { return Math.ceil(this.filteredProduits.length / this.pageSize); }
  get pageNumbers():       number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  get paginatedProduits(): Produit[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProduits.slice(start, start + this.pageSize);
  }

  constructor(
    private produitService: ProduitService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProduits();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Chargement depuis l'API ──────────────────────────────────────────
  loadProduits(): void {
    this.isLoading = true;
    this.produitService.getProduits().subscribe({
      next: (produits) => {
        this.produits = produits;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.showToast('Erreur lors du chargement', 'error');
        this.isLoading = false;
      }
    });
  }

  // ── Filtres ────────────────────────────────────────────────────────────
  applyFilters(): void {
    let result = [...this.produits];

    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        p.nom.toLowerCase().includes(t) ||
        (p.reference || '').toLowerCase().includes(t) ||
        (p.type_piece_nom || '').toLowerCase().includes(t)
      );
    }

    if (this.selectedCategorie) {
      result = result.filter(p => (p.categorie_nom || '') === this.selectedCategorie);
    }

    if (this.selectedStatut === 'actif')   result = result.filter(p => (p.stock || 0) > 0);
    if (this.selectedStatut === 'faible')  result = result.filter(p => (p.stock || 0) > 0 && p.stock <= 10);
    if (this.selectedStatut === 'rupture') result = result.filter(p => (p.stock || 0) === 0);

    if (this.sortField) {
      result.sort((a: any, b: any) => {
        const va = a[this.sortField], vb = b[this.sortField];
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return this.sortDir === 'asc' ? cmp : -cmp;
      });
    }

    this.filteredProduits = result;
    this.currentPage = 1;
  }

  selectCategorie(val: string): void { this.selectedCategorie = val; this.applyFilters(); }
  selectStatut(val: string): void    { this.selectedStatut = val; this.applyFilters(); }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir   = 'asc';
    }
    this.applyFilters();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  // ── Modals ────────────────────────────────────────────────────────────
  openModal(mode: 'create' | 'edit' | 'view', produit?: Produit): void {
    this.modalMode      = mode;
    this.selectedProduit = produit ?? null;
    this.formError      = '';
    this.imagePreview   = null;

    if (mode === 'create') {
      this.form = this.emptyForm();
    } else if (produit) {
      this.form = { ...produit };
      this.imagePreview = produit.image ?? null;
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.imagePreview = null;
  }

  confirmDelete(produit: Produit): void {
    this.produitASupprimer = produit;
    this.showDeleteModal   = true;
  }

  openModal2(mode: 'create' | 'edit' | 'view', produit?: Produit): void {
    this.openModal(mode, produit);
  }

  // ── Navigation vers le formulaire d'édition ──
  editProduit(produit: Produit): void {
    if (produit?.id) {
      this.router.navigate(['/fournisseur/modifier-produit', produit.id]);
    }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────
  saveProduit(): void {
    this.isSaving  = true;
    this.formError = '';

    const formData = new FormData();
    formData.append('nom', this.form.nom);
    formData.append('description', this.form.description || '');
    formData.append('prix', String(this.form.prix));
    formData.append('stock', String(this.form.stock));
    formData.append('reference', String(this.form.reference || ''));
    formData.append('marque', this.form.marque || '');

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    if (this.modalMode === 'create') {
      this.produitService.createProduit(formData).subscribe({
        next: (produit) => {
          this.produits.unshift(produit);
          this.applyFilters();
          this.closeModal();
          this.showToast('Produit créé avec succès !', 'success');
          this.isSaving = false;
        },
        error: () => {
          this.formError = "Erreur lors de la création";
          this.showToast("Erreur lors de la création", 'error');
          this.isSaving = false;
        }
      });
    } else if (this.modalMode === 'edit' && this.form.id) {
      this.produitService.updateProduit(this.form.id, formData).subscribe({
        next: (updated) => {
          const idx = this.produits.findIndex(p => p.id === this.form.id);
          if (idx !== -1) this.produits[idx] = updated;
          this.applyFilters();
          this.closeModal();
          this.showToast('Produit modifié avec succès !', 'success');
          this.isSaving = false;
        },
        error: () => {
          this.formError = "Erreur lors de la modification";
          this.showToast("Erreur lors de la modification", 'error');
          this.isSaving = false;
        }
      });
    }
  }

  deleteProduit(): void {
    if (!this.produitASupprimer) return;
    this.isSaving = true;
    this.produitService.deleteProduit(this.produitASupprimer.id).subscribe({
      next: () => {
        this.produits = this.produits.filter(p => p.id !== this.produitASupprimer!.id);
        this.applyFilters();
        this.showDeleteModal  = false;
        this.produitASupprimer = null;
        this.isSaving         = false;
        this.showToast('Produit supprimé.', 'success');
      },
      error: () => {
        this.showToast('Erreur lors de la suppression', 'error');
        this.isSaving = false;
      }
    });
  }

  // ── Image ─────────────────────────────────────────────────────────────
  selectedFile: File | null = null;

  triggerFileInput(): void { this.fileInput?.nativeElement.click(); }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.imagePreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private emptyForm(): any {
    return {
      nom: '', reference: '', prix: 0, stock: 0, description: '', marque: ''
    };
  }

  formatPrix(prix: number): string {
    return new Intl.NumberFormat('fr-FR').format(prix) + ' FCFA';
  }

  getStockPct(stock: number): number {
    return Math.min(100, (stock / 50) * 100);
  }

  getCatClass(cat: string): string {
    const map: Record<string, string> = {
      'Automobile':     'cat-auto',
      'Moto & Scooter': 'cat-moto',
      'Poids Lourds':   'cat-poids',
      'Vélo & E-bike':  'cat-velo',
    };
    return map[cat] || '';
  }

  getStatutClass(p: Produit): string {
    if ((p.stock || 0) === 0)             return 'statut-rupture';
    if ((p.stock || 0) <= 10)             return 'statut-faible';
    if (p.is_active === false)            return 'statut-inactif';
    return                                'statut-actif';
  }

  getStatutIcon(p: Produit): string {
    if ((p.stock || 0) === 0)  return 'bi-x-circle-fill';
    if ((p.stock || 0) <= 10)  return 'bi-exclamation-triangle-fill';
    if (p.is_active === false) return 'bi-dash-circle';
    return                     'bi-check-circle-fill';
  }

  getStatutLabel(p: Produit): string {
    if ((p.stock || 0) === 0)  return 'Rupture';
    if ((p.stock || 0) <= 10)  return 'Stock faible';
    if (p.is_active === false) return 'Inactif';
    return                     'Actif';
  }

  showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg  = msg;
    this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMsg = ''; }, 3500);
  }
}