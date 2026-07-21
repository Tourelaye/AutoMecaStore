import { Component, ViewChildren, QueryList, ElementRef } from '@angular/core';
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
  // Compatibilité
  anneeDebut: number | null;
  anneeFin: number | null;
  // Technique
  etat: 'neuf' | 'occasion' | 'reconditionne';
  garantieMois: number;
  paysOrigine: string;
  referenceOem: string;
  poids: number | null;
  longueur: number | null;
  largeur: number | null;
  hauteur: number | null;
  // Stock
  disponibilite: 'en_stock' | 'faible_stock' | 'rupture' | 'precommande';
  delaiLivraison: 'same_day' | '24h' | '48h' | '2_5j' | '5_7j' | '7j_plus';
  // Complémentaires
  conseilsInstallation: string;
  conditionsRetour: string;
}

interface ImageSlot {
  id: number;
  file: File | null;
  preview: string | null;
}

@Component({
  selector: 'app-ajouter-produit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ajouter-produit.component.html',
  styleUrls: ['./ajouter-produit.component.css']
})
export class AjouterProduitComponent {

  @ViewChildren('fileInput') fileInputRefs!: QueryList<ElementRef<HTMLInputElement>>;

  get fileInputs(): HTMLInputElement[] {
    return this.fileInputRefs.toArray().map(ref => ref.nativeElement);
  }

  isSaving = false;
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;
  showPreview = false;

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

  // Suggestions de modèles courants
  modelesSuggestions: string[] = [ ];
  modelesCompatibles: string[] = [];
  modeleInput = '';

  motsCles: string[] = [];
  motCleInput = '';

  anneeCourante = new Date().getFullYear();
  annees: number[] = Array.from({ length: 36 }, (_, i) => this.anneeCourante - 30 + i);

  etats = [
    { value: 'neuf', label: 'Neuf' },
    { value: 'occasion', label: 'Occasion' },
    { value: 'reconditionne', label: 'Reconditionné' }
  ];

  garanties = [
    { value: 0, label: 'Sans garantie' },
    { value: 3, label: '3 mois' },
    { value: 6, label: '6 mois' },
    { value: 12, label: '12 mois' },
    { value: 24, label: '24 mois' }
  ];

  pays = [
    { value: 'japon', label: 'Japon' },
    { value: 'allemagne', label: 'Allemagne' },
    { value: 'france', label: 'France' },
    { value: 'coree_sud', label: 'Corée du Sud' },
    { value: 'chine', label: 'Chine' },
    { value: 'usa', label: 'États-Unis' },
    { value: 'italie', label: 'Italie' },
    { value: 'espagne', label: 'Espagne' },
    { value: 'turquie', label: 'Turquie' },
    { value: 'inde', label: 'Inde' },
    { value: 'belgique', label: 'Belgique' }
  ];

  disponibilites = [
    { value: 'en_stock', label: 'En stock' },
    { value: 'faible_stock', label: 'Faible stock' },
    { value: 'rupture', label: 'Rupture de stock' },
    { value: 'precommande', label: 'Précommande' }
  ];

  delais = [
    { value: 'same_day', label: 'Livraison le jour même' },
    { value: '24h', label: '24 heures' },
    { value: '48h', label: '48 heures' },
    { value: '2_5j', label: '2 à 5 jours' },
    { value: '5_7j', label: '5 à 7 jours' },
    { value: '7j_plus', label: 'Plus de 7 jours' }
  ];

  form: ProduitForm = {
    categorieVehicule: null,
    typePiece: null,
    nom: '',
    reference: '',
    marque: '',
    prix: null,
    stock: null,
    description: '',
    anneeDebut: null,
    anneeFin: null,
    etat: 'neuf',
    garantieMois: 0,
    paysOrigine: '',
    referenceOem: '',
    poids: null,
    longueur: null,
    largeur: null,
    hauteur: null,
    disponibilite: 'en_stock',
    delaiLivraison: '2_5j',
    conseilsInstallation: '',
    conditionsRetour: ''
  };

  // Jusqu'à 4 images (index 0 = principale par défaut)
  images: ImageSlot[] = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, file: null, preview: null }));
  mainImageIndex = 0;
  dragIndex: number | null = null;

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
    return prefix + '-' + suffix;
  }

  get mainPreview(): string | null {
    return this.images[this.mainImageIndex]?.preview || null;
  }

  get hasImages(): boolean {
    return this.images.some(img => img.file !== null);
  }

  get dimensionsDisplay(): string {
    const l = this.form.longueur;
    const la = this.form.largeur;
    const h = this.form.hauteur;
    if (l && la && h) {
      return l + ' x ' + la + ' x ' + h + ' cm';
    }
    return '';
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
    const catId = this.getCategorieIdForVehicule(cat);
    if (catId) this.loadTypePiecesForCategorie(catId);
  }

  private getCategorieIdForVehicule(cat: CategorieVehicule): number | null {
    const key = cat.toString().toLowerCase();
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

  // ── MODÈLES COMPATIBLES ──
  onModeleInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.ajouterModele(this.modeleInput.trim());
    }
  }

  ajouterModeleDepuisSuggestion(modele: string): void {
    if (!this.modelesCompatibles.includes(modele)) {
      this.modelesCompatibles.push(modele);
    }
  }

  ajouterModele(value: string): void {
    const clean = value.replace(/,/g, '').trim();
    if (clean && !this.modelesCompatibles.includes(clean)) {
      this.modelesCompatibles.push(clean);
    }
    this.modeleInput = '';
  }

  retirerModele(index: number): void {
    this.modelesCompatibles.splice(index, 1);
  }

  // ── MOTS-CLÉS ──
  onMotCleInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.ajouterMotCle(this.motCleInput.trim());
    }
  }

  ajouterMotCle(value: string): void {
    const clean = value.replace(/,/g, '').trim();
    if (clean && !this.motsCles.includes(clean)) {
      this.motsCles.push(clean);
    }
    this.motCleInput = '';
  }

  retirerMotCle(index: number): void {
    this.motsCles.splice(index, 1);
  }

  // ── GESTION DU STOCK ──
  onStockChange(): void {
    const stock = this.form.stock ?? 0;
    if (stock === 0) {
      this.form.disponibilite = 'rupture';
    } else if (stock < 10) {
      this.form.disponibilite = 'faible_stock';
    } else {
      this.form.disponibilite = 'en_stock';
    }
  }

  // ── IMAGES ──
  ouvrirFileInput(index: number): void {
    const input = this.fileInputs[index];
    input?.click();
  }

  onImageFileSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!this.validerFichierImage(file)) return;

    this.images[index].file = file;
    this.lireApercu(file, (dataUrl) => (this.images[index].preview = dataUrl));
  }

  retirerImage(index: number): void {
    this.images[index].file = null;
    this.images[index].preview = null;
    if (this.mainImageIndex === index) {
      this.mainImageIndex = 0;
    }
    const input = this.fileInputs[index];
    if (input) input.value = '';
  }

  definirImagePrincipale(index: number): void {
    if (this.images[index].file) {
      this.mainImageIndex = index;
    }
  }

  onDragStart(index: number): void {
    this.dragIndex = index;
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.dragIndex === null || this.dragIndex === index) return;
    this.swapImages(this.dragIndex, index);
    this.dragIndex = null;
  }

  private swapImages(from: number, to: number): void {
    const temp = this.images[from];
    this.images[from] = this.images[to];
    this.images[to] = temp;
    if (this.mainImageIndex === from) {
      this.mainImageIndex = to;
    } else if (this.mainImageIndex === to) {
      this.mainImageIndex = from;
    }
    // repositionne les inputs file pour garder la correspondance
    this.fileInputRefs.forEach(ref => ref.nativeElement.value = '');
  }

  // ── PRÉVISUALISATION ──
  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  // ── UTILITAIRES ──
  private validerFichierImage(file: File): boolean {
    const maxSizeMo = 5;
    if (!file.type.startsWith('image/')) {
      this.showToast("Le fichier sélectionné n'est pas une image.", 'error');
      return false;
    }
    if (file.size > maxSizeMo * 1024 * 1024) {
      this.showToast('L\'image dépasse la taille maximale de ' + maxSizeMo + ' Mo.', 'error');
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
    if (!this.images[0].file) {
      this.showToast("L'image principale est obligatoire.", 'error');
      return;
    }

    this.isSaving = true;

    const formData = new FormData();
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

    // Compatibilité
    formData.append('modeles_compatibles', JSON.stringify(this.modelesCompatibles));
    if (this.form.anneeDebut !== null && this.form.anneeDebut !== undefined) {
      formData.append('annee_debut', String(this.form.anneeDebut));
    }
    if (this.form.anneeFin !== null && this.form.anneeFin !== undefined) {
      formData.append('annee_fin', String(this.form.anneeFin));
    }

    // Technique
    formData.append('etat', this.form.etat);
    formData.append('garantie_mois', String(this.form.garantieMois));
    formData.append('pays_origine', this.form.paysOrigine);
    formData.append('reference_oem', this.form.referenceOem);
    if (this.form.poids !== null && this.form.poids !== undefined) formData.append('poids', String(this.form.poids));
    if (this.form.longueur !== null && this.form.longueur !== undefined) formData.append('longueur', String(this.form.longueur));
    if (this.form.largeur !== null && this.form.largeur !== undefined) formData.append('largeur', String(this.form.largeur));
    if (this.form.hauteur !== null && this.form.hauteur !== undefined) formData.append('hauteur', String(this.form.hauteur));

    // Stock
    formData.append('disponibilite', this.form.disponibilite);
    formData.append('delai_livraison', this.form.delaiLivraison);

    // Complémentaires
    formData.append('mots_cles', JSON.stringify(this.motsCles));
    formData.append('conseils_installation', this.form.conseilsInstallation);
    formData.append('conditions_retour', this.form.conditionsRetour);

    // Images (image principale = index mainImageIndex + 1)
    this.images.forEach((img, i) => {
      if (img.file) {
        const key = i === 0 ? 'image' : 'image_' + (i + 1);
        formData.append(key, img.file);
      }
    });
    formData.append('image_principale_index', String(this.mainImageIndex + 1));

    this.produitService.createProduit(formData).subscribe({
      next: () => {
        this.isSaving = false;
        this.showToast('"' + this.form.nom + '" a été ajouté au catalogue.', 'success');
        setTimeout(() => this.router.navigate(['/fournisseur/produits/list-produit']), 900);
      },
      error: (err) => {
        this.isSaving = false;
        let msg = "Erreur lors de l'ajout du produit";
        if (err?.error?.detail) {
          msg = String(err.error.detail);
        } else if (err?.error && typeof err.error === 'object') {
          const messages = Object.values(err.error).flat().filter(Boolean);
          if (messages.length) msg = messages.join(' / ');
        } else if (err?.message) {
          msg = err.message;
        }
        this.showToast(msg, 'error');
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