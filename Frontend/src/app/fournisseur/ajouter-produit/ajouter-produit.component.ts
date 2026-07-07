import { Component, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  selectCategorie(cat: CategorieVehicule): void {
    this.form.categorieVehicule = cat;
    this.form.typePiece = null;
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
    formData.append('categorieVehicule', this.form.categorieVehicule);
    formData.append('typePiece', this.form.typePiece);
    formData.append('nom', this.form.nom);
    formData.append('reference', this.form.reference);
    formData.append('marque', this.form.marque);
    formData.append('prix', String(this.form.prix));
    formData.append('stock', String(this.form.stock));
    formData.append('description', this.form.description);
    formData.append('imagePrincipale', this.fichierPrincipal);

    this.fichiersSecondaires.forEach((file, i) => {
      if (file) formData.append(`imageSecondaire${i + 1}`, file);
    });

    // TODO: this.produitService.creerProduit(formData).subscribe(...)

    setTimeout(() => {
      this.isSaving = false;
      this.showToast(`"${this.form.nom}" a été ajouté au catalogue.`, 'success');
      setTimeout(() => this.router.navigate(['/fournisseur/produits/list-produit']), 900);
    }, 700);
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