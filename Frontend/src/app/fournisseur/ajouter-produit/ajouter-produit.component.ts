import { Component, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProduitService } from '../services/produit.service';
import { ProduitService as CoreProduitService } from '../../core/services/produit.service';

type CategorieVehicule = 'automobile' | 'moto' | 'poids-lourd' | 'velo';

interface ProduitForm {
  categorieVehicule: CategorieVehicule | null;
  typePiece: string | null;
  nom: string;
  reference: string;
  marque: string;
  prix: number | null;
  stock: number | null;
  description: string;
}

@Component({
  selector: 'app-ajouter-produit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ajouter-produit.component.html',
  styleUrls: ['./ajouter-produit.component.css']
})
export class AjouterProduitComponent {

  @ViewChild('fileInputPrincipale') fileInputPrincipaleRef!: ElementRef<HTMLInputElement>;
  @ViewChildren('fileInputSecondaire') fileInputsSecondairesRefs!: QueryList<ElementRef<HTMLInputElement>>;

  get fileInputsSecondaires(): HTMLInputElement[] {
    return this.fileInputsSecondairesRefs.toArray().map(ref => ref.nativeElement);
  }

  isSaving = false;
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  categoriesVehicule: { value: CategorieVehicule; label: string; icon: string }[] = [
    { value: 'automobile', label: 'Automobile', icon: 'bi-car-front-fill' },
    { value: 'moto', label: 'Moto & Scooter', icon: 'bi-scooter' },
    { value: 'poids-lourd', label: 'Poids Lourds', icon: 'bi-truck' },
    { value: 'velo', label: 'Vélo & E-bike', icon: 'bi-bicycle' }
  ];

  private typesPieceParCategorie: Record<CategorieVehicule, string[]> = {
    automobile: ['Freinage', 'Filtration', 'Suspension', 'Moteur', 'Électrique', 'Carrosserie'],
    moto: ['Chaîne & Transmission', 'Freinage', 'Pneus', 'Éclairage', 'Moteur'],
    'poids-lourd': ['Freinage pneumatique', 'Suspension', 'Moteur', 'Éclairage', 'Remorquage'],
    velo: ['Transmission', 'Freinage', 'Roues', 'Batterie (e-bike)', 'Accessoires']
  };

  private refPrefixParCategorie: Record<CategorieVehicule, string> = {
    automobile: 'REF-AMS',
    moto: 'REF-MOT',
    'poids-lourd': 'REF-PLD',
    velo: 'REF-VEL'
  };

  form: ProduitForm = {
    categorieVehicule: null,
    typePiece: null,
    nom: '',
    reference: '',
    marque: '',
    prix: null,
    stock: null,
    description: ''
  };

  fichierPrincipal: File | null = null;
  imagePreviewPrincipale: string | null = null;

  fichiersSecondaires: (File | null)[] = [null, null, null];
  imagesPreviewSecondaires: (string | null)[] = [null, null, null];

  // Données chargées depuis l'API pour mapping id <-> nom
  availableCategories: { id: number; nom: string }[] = [];
  typePiecesMap: { [key: string]: number } = {};
  availableTypePieces: any[] = [];

  get typesPieceDisponibles(): string[] {
    return this.form.categorieVehicule ? this.typesPieceParCategorie[this.form.categorieVehicule] : [];
  }

  get referencePlaceholder(): string {
    const prefix = this.form.categorieVehicule
      ? this.refPrefixParCategorie[this.form.categorieVehicule]
      : 'REF-AMS';
    const suffix = Math.floor(100000 + Math.random() * 899999);
    return `${prefix}-${suffix}`;
  }

  constructor(
    private router: Router,
    private produitService: ProduitService,
    private coreProduitService: CoreProduitService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.coreProduitService.getCategories().subscribe({
      next: (cats) => {
        this.availableCategories = cats.map(c => ({ id: (c as any).id, nom: (c as any).nom }));
      },
      error: () => {
        // fallback: keep UI categories
      }
    });
  }

  selectCategorie(cat: CategorieVehicule): void {
    this.form.categorieVehicule = cat;
    this.form.typePiece = null;
    // Charger les types de pièces pour la catégorie correspondante si possible
    const catId = this.getCategorieIdForVehicule(cat);
    if (catId) this.loadTypePiecesForCategorie(catId);
  }

  private getCategorieIdForVehicule(cat: CategorieVehicule): number | null {
    const key = cat.toString().toLowerCase();
    // Chercher une catégorie dont le nom contient un mot-clé
    const heuristics: { [k: string]: string[] } = {
      automobile: ['auto', 'automobile', 'voiture'],
      moto: ['moto', 'motorcycle', 'motor'],
      'poids-lourd': ['poids', 'lourd', 'pl', 'poids lourd'],
      velo: ['velo', 'vélo', 'bicyc']
    };
    const keywords = heuristics[key] || [];
    for (const c of this.availableCategories) {
      const nom = c.nom.toLowerCase();
      if (keywords.some(k => nom.includes(k))) return c.id;
    }
    return null;
  }

  private loadTypePiecesForCategorie(categorieId: number): void {
    this.coreProduitService.getTypesPieces(categorieId).subscribe({
      next: (types) => {
        this.availableTypePieces = types;
        types.forEach((tp: any) => {
          const normalized = tp.nom.toLowerCase().normalize('NFD').replace(/[-\u036f]/g, '');
          this.typePiecesMap[normalized] = tp.id;
          this.typePiecesMap[tp.nom] = tp.id;
        });
      },
      error: (err) => {
        console.warn('Impossible de charger types de pièces', err);
      }
    });
  }

  // ── OUVERTURE DES SÉLECTEURS DE FICHIER ──
  ouvrirFileInputPrincipale(): void {
    this.fileInputPrincipaleRef.nativeElement.click();
  }

  ouvrirFileInputSecondaire(index: number): void {
    const refs = this.fileInputsSecondairesRefs.toArray();
    refs[index]?.nativeElement.click();
  }

  // ── IMAGE PRINCIPALE ──
  onFichierPrincipalSelectionne(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!this.validerFichierImage(file)) return;

    this.fichierPrincipal = file;
    this.lireApercu(file, (dataUrl) => (this.imagePreviewPrincipale = dataUrl));
  }

  retirerImagePrincipale(): void {
    this.fichierPrincipal = null;
    this.imagePreviewPrincipale = null;
  }

  // ── IMAGES SECONDAIRES ──
  onFichierSecondaireSelectionne(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!this.validerFichierImage(file)) return;

    this.fichiersSecondaires[index] = file;
    this.lireApercu(file, (dataUrl) => (this.imagesPreviewSecondaires[index] = dataUrl));
  }

  retirerImageSecondaire(index: number): void {
    this.fichiersSecondaires[index] = null;
    this.imagesPreviewSecondaires[index] = null;
  }

  // ── UTILITAIRES ──
  private validerFichierImage(file: File): boolean {
    const maxSizeMo = 5;
    if (!file.type.startsWith('image/')) {
      this.showToast("Le fichier sélectionné n'est pas une image.", 'error');
      return false;
    }
    if (file.size > maxSizeMo * 1024 * 1024) {
      this.showToast(`L'image dépasse la taille maximale de ${maxSizeMo} Mo.`, 'error');
      return false;
    }
    return true;
  }

  private lireApercu(file: File, callback: (dataUrl: string) => void): void {
    const reader = new FileReader();
    reader.onload = () => callback(reader.result as string);
    reader.readAsDataURL(file);
  }

  enregistrer(): void {
    if (!this.form.categorieVehicule || !this.form.typePiece) {
      this.showToast('Merci de choisir une catégorie et un type de pièce.', 'error');
      return;
    }
    if (!this.fichierPrincipal) {
      this.showToast("L'image principale est obligatoire.", 'error');
      return;
    }

    this.isSaving = true;

    const formData = new FormData();
    // map selections to backend expected fields: 'categorie' (id) and 'type_piece' (id)
    const categorieId = this.getCategorieIdForVehicule(this.form.categorieVehicule!);
    let typePieceId: number | null = null;
    if (this.form.typePiece) {
      const normalized = this.form.typePiece.toLowerCase().normalize('NFD').replace(/[-\u036f]/g, '');
      typePieceId = this.typePiecesMap[this.form.typePiece] || this.typePiecesMap[normalized] || null;
    }
    if (!categorieId || !typePieceId) {
      this.showToast('Impossible de déterminer la catégorie ou le type (IDs manquants).', 'error');
      this.isSaving = false;
      return;
    }
    formData.append('categorie', String(categorieId));
    formData.append('type_piece', String(typePieceId));
    formData.append('nom', this.form.nom);
    formData.append('reference', this.form.reference);
    formData.append('marque', this.form.marque);
    formData.append('prix', String(this.form.prix));
    formData.append('stock', String(this.form.stock));
    formData.append('description', this.form.description);
    // Backend serializer attend les champs 'image', 'image_2', 'image_3', 'image_4'
    formData.append('image', this.fichierPrincipal as Blob);
    this.fichiersSecondaires.forEach((file, i) => {
      if (file) formData.append(`image_${i + 2}`, file);
    });

    this.produitService.createProduit(formData).subscribe({
      next: () => {
        this.isSaving = false;
        this.showToast(`"${this.form.nom}" a été ajouté au catalogue.`, 'success');
        setTimeout(() => this.router.navigate(['/fournisseur/produits/list-produit']), 900);
      },
      error: (err) => {
        this.isSaving = false;
        this.showToast("Erreur lors de l'ajout du produit", 'error');
        console.error('Erreur création produit:', err);
      }
    });
  }

  retour(): void {
    this.router.navigate(['/fournisseur/produits/list-produit']);
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 3000);
  }
}