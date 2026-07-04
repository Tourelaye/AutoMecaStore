import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  trigger, transition, style, animate, keyframes
} from '@angular/animations';
import { Subscription } from 'rxjs';

export interface Produit {
  id:               number;
  nom:              string;
  reference:        string;
  categorieVehicule:string;
  typePiece:        string;
  prix:             number;
  stock:            number;
  actif:            boolean;
  image?:           string;
  description?:     string;
}

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
  produits: Produit[] = [
    { id:1,  nom:'Jeu de 4 Plaquettes de Frein Brembo Sport',     reference:'REF-BRM-P85020',   categorieVehicule:'Automobile',     typePiece:'Freinage',                  prix:45000,  stock:24, actif:true,  image:'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=80&h=80&fit=crop' },
    { id:2,  nom:'Filtre à Huile Moteur Bosch Premium',           reference:'REF-BSH-0451103079',categorieVehicule:'Automobile',     typePiece:'Filtration',                prix:8500,   stock:3,  actif:true,  image:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop' },
    { id:3,  nom:'Amortisseur Avant Gaz Sachs Ultra',             reference:'REF-SCH-314718',    categorieVehicule:'Automobile',     typePiece:'Suspension',                prix:75000,  stock:0,  actif:true,  image:'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=80&h=80&fit=crop' },
    { id:4,  nom:'Kit Chaîne DID 520 Renforcé O-Ring',            reference:'REF-DID-520VX3',    categorieVehicule:'Moto & Scooter', typePiece:'Kit chaîne & Pignon',       prix:65000,  stock:12, actif:true  },
    { id:5,  nom:'Vanne de Freinage Pneumatique Wabco',           reference:'REF-WBC-9710021500',categorieVehicule:'Poids Lourds',   typePiece:'Freinage Pneumatique',      prix:185000, stock:6,  actif:true,  image:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop' },
    { id:6,  nom:'Batterie Lithium Vélo Électrique 36V 10Ah',     reference:'REF-BAT-36V10AH',   categorieVehicule:'Vélo & E-bike',  typePiece:'Électrique',                prix:120000, stock:8,  actif:true  },
    { id:7,  nom:'Courroie de Distribution Gates PowerGrip',      reference:'REF-GAT-5479XS',    categorieVehicule:'Automobile',     typePiece:'Distribution',              prix:28000,  stock:15, actif:true  },
    { id:8,  nom:'Disque de Frein Brembo Sport 280mm',            reference:'REF-BRM-D09.8605.1X',categorieVehicule:'Automobile',    typePiece:'Freinage',                  prix:55000,  stock:9,  actif:false },
    { id:9,  nom:'Huile Moteur Castrol Magnatec 5W-30 5L',        reference:'REF-CAS-5W30-5L',   categorieVehicule:'Automobile',     typePiece:'Lubrifiants',               prix:22000,  stock:42, actif:true  },
    { id:10, nom:'Pneu Michelin Pilot Road 4 120/70-17',          reference:'REF-MCH-PR4-120',   categorieVehicule:'Moto & Scooter', typePiece:'Freinage',                  prix:95000,  stock:7,  actif:true  },
  ];

  filteredProduits: Produit[] = [];

  private subs = new Subscription();

  // ── Computed ──────────────────────────────────────────────────────────
  get produitsActifs():    number { return this.produits.filter(p => p.actif && p.stock > 0).length; }
  get produitsStockFaible():number { return this.produits.filter(p => p.stock > 0 && p.stock <= 10).length; }
  get produitsRupture():   number { return this.produits.filter(p => p.stock === 0).length; }
  get totalPages():        number { return Math.ceil(this.filteredProduits.length / this.pageSize); }
  get pageNumbers():       number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  get paginatedProduits(): Produit[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProduits.slice(start, start + this.pageSize);
  }

  ngOnInit(): void {
    this.applyFilters();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Filtres ────────────────────────────────────────────────────────────
  applyFilters(): void {
    let result = [...this.produits];

    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        p.nom.toLowerCase().includes(t) ||
        p.reference.toLowerCase().includes(t) ||
        p.typePiece.toLowerCase().includes(t)
      );
    }

    if (this.selectedCategorie) {
      result = result.filter(p => p.categorieVehicule === this.selectedCategorie);
    }

    if (this.selectedStatut === 'actif')   result = result.filter(p => p.actif && p.stock > 0);
    if (this.selectedStatut === 'faible')  result = result.filter(p => p.stock > 0 && p.stock <= 10);
    if (this.selectedStatut === 'rupture') result = result.filter(p => p.stock === 0);

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

  // ── CRUD ──────────────────────────────────────────────────────────────
  saveProduit(): void {
    this.isSaving  = true;
    this.formError = '';

    setTimeout(() => {
      try {
        if (this.modalMode === 'create') {
          const nouveau: Produit = {
            ...this.form,
            id:    Date.now(),
            image: this.imagePreview ?? undefined,
          } as Produit;
          this.produits.unshift(nouveau);
          this.showToast('Produit créé avec succès !', 'success');
        } else {
          const idx = this.produits.findIndex(p => p.id === this.form.id);
          if (idx !== -1) {
            this.produits[idx] = { ...this.form, image: this.imagePreview ?? this.produits[idx].image } as Produit;
          }
          this.showToast('Produit modifié avec succès !', 'success');
        }
        this.applyFilters();
        this.closeModal();
      } catch {
        this.formError = 'Erreur lors de l\'enregistrement.';
        this.showToast('Erreur lors de l\'enregistrement', 'error');
      } finally {
        this.isSaving = false;
      }
    }, 800);
  }

  deleteProduit(): void {
    if (!this.produitASupprimer) return;
    this.isSaving = true;
    setTimeout(() => {
      this.produits = this.produits.filter(p => p.id !== this.produitASupprimer!.id);
      this.applyFilters();
      this.showDeleteModal  = false;
      this.produitASupprimer = null;
      this.isSaving         = false;
      this.showToast('Produit supprimé.', 'success');
    }, 600);
  }

  // ── Image ─────────────────────────────────────────────────────────────
  triggerFileInput(): void { this.fileInput?.nativeElement.click(); }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { this.imagePreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private emptyForm(): Partial<Produit> {
    return {
      nom: '', reference: '', categorieVehicule: '',
      typePiece: '', prix: 0, stock: 0, actif: true, description: ''
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
    if (p.stock === 0)             return 'statut-rupture';
    if (p.stock <= 10)             return 'statut-faible';
    if (!p.actif)                  return 'statut-inactif';
    return                                'statut-actif';
  }

  getStatutIcon(p: Produit): string {
    if (p.stock === 0)  return 'bi-x-circle-fill';
    if (p.stock <= 10)  return 'bi-exclamation-triangle-fill';
    if (!p.actif)       return 'bi-dash-circle';
    return                     'bi-check-circle-fill';
  }

  getStatutLabel(p: Produit): string {
    if (p.stock === 0)  return 'Rupture';
    if (p.stock <= 10)  return 'Stock faible';
    if (!p.actif)       return 'Inactif';
    return                     'Actif';
  }

  showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg  = msg;
    this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMsg = ''; }, 3500);
  }
}