import { Component, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProduitService, Produit, ProduitCompatibilite } from '../services/produit.service';
import { ProduitService as CoreProduitService } from '../../core/services/produit.service';

type CategorieVehicule = 'automobile' | 'moto' | 'poids-lourd' | 'velo';

interface ImageSlot {
  file: File | null;
  preview: string | null;
  changed: boolean;
}

@Component({
  selector: 'app-ajouter-produit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './ajouter-produit.component.html',
  styleUrls: ['./ajouter-produit.component.css']
})
export class AjouterProduitComponent implements OnInit {

  @ViewChildren('fileInput') fileInputRefs!: QueryList<ElementRef<HTMLInputElement>>;

  get fileInputs(): HTMLInputElement[] {
    return this.fileInputRefs.toArray().map(ref => ref.nativeElement);
  }

  mode: 'create' | 'edit' = 'create';
  productId?: number;
  isLoading = false;
  isSaving = false;
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;
  showPreview = false;

  produitForm!: FormGroup;

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

  // Entrées chips
  modeleInput = '';
  modelesCompatibles: string[] = [];
  motCleInput = '';
  motsCles: string[] = [];

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

  delaisLivraison = [
    { value: 'same_day', label: 'Livraison le jour même' },
    { value: '24h', label: '24 heures' },
    { value: '48h', label: '48 heures' },
    { value: '2_5j', label: '2 à 5 jours' },
    { value: '5_7j', label: '5 à 7 jours' },
    { value: '7j_plus', label: 'Plus de 7 jours' }
  ];

  delaisPreparation = [
    { value: '24h', label: '24 heures' },
    { value: '48h', label: '48 heures' },
    { value: '72h', label: '72 heures' },
    { value: '4_5j', label: '4 à 5 jours' },
    { value: '6_7j', label: '6 à 7 jours' },
    { value: '7j_plus', label: 'Plus de 7 jours' }
  ];

  // 4 slots images (index 1 dans le backend)
  imageSlots: ImageSlot[] = Array.from({ length: 4 }, () => ({ file: null, preview: null, changed: false }));
  mainImageIndex = 0;
  dragIndex: number | null = null;

  availableCategories: { id: number; nom: string }[] = [];
  typePiecesMap: { [key: string]: number } = {};
  idToTypePieceName: { [id: number]: string } = {};
  availableTypePieces: any[] = [];

  get typesPieceDisponibles(): string[] {
    const cat = this.produitForm?.get('categorieVehicule')?.value as CategorieVehicule | null;
    return cat ? this.typesPieceParCategorie[cat] : [];
  }

  get referencePlaceholder(): string {
    const cat = this.produitForm?.get('categorieVehicule')?.value as CategorieVehicule | null;
    const prefix = cat ? this.refPrefixParCategorie[cat] : 'REF-AMS';
    const suffix = Math.floor(100000 + Math.random() * 899999);
    return prefix + '-' + suffix;
  }

  get mainPreview(): string | null {
    return this.imageSlots[this.mainImageIndex]?.preview || null;
  }

  get hasImages(): boolean {
    return this.imageSlots.some(img => img.preview !== null);
  }

  get compatibilitesArray(): FormArray {
    return this.produitForm.get('compatibilites') as FormArray;
  }

  get stockFaible(): boolean {
    const stock = Number(this.produitForm?.get('stock')?.value ?? 0);
    const seuil = Number(this.produitForm?.get('seuil_alerte')?.value ?? 10);
    return stock > 0 && stock <= seuil;
  }

  get quantiteMinInvalid(): boolean {
    const stock = Number(this.produitForm?.get('stock')?.value ?? 0);
    const qmin = this.produitForm?.get('quantite_min')?.value;
    return qmin !== null && qmin !== undefined && qmin !== '' && Number(qmin) > stock;
  }

  get dimensionsDisplay(): string {
    const vals = this.produitForm?.value ?? {};
    const l = vals.longueur;
    const la = vals.largeur;
    const h = vals.hauteur;
    if (l && la && h) {
      return l + ' x ' + la + ' x ' + h + ' cm';
    }
    return '';
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private produitService: ProduitService,
    private coreProduitService: CoreProduitService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.setupListeners();

    const id = this.route.snapshot.params['id'];
    if (id) {
      this.mode = 'edit';
      this.productId = +id;
      this.loadCategories(() => this.loadProduit(+id));
    } else {
      this.mode = 'create';
      this.loadCategories();
    }
  }

  private buildForm(): void {
    this.produitForm = this.fb.group({
      categorieVehicule: [null as CategorieVehicule | null, Validators.required],
      typePiece: [null as string | null, Validators.required],
      nom: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      reference: ['', [Validators.required, Validators.maxLength(50)]],
      marque: ['', [Validators.required, Validators.maxLength(100)]],
      fabricant: ['', Validators.maxLength(100)],
      prix: [null as number | null, [Validators.required, Validators.min(1)]],
      stock: [null as number | null, [Validators.required, Validators.min(0)]],
      seuil_alerte: [10, [Validators.min(0)]],
      quantite_min: [null as number | null, [Validators.min(0)]],
      description_courte: ['', Validators.maxLength(500)],
      description: ['', [Validators.required, Validators.minLength(20)]],
      description_detaillee: [''],
      precautions: [''],
      annee_debut: [null as number | null],
      annee_fin: [null as number | null],
      compatibilites: this.fb.array([]),
      etat: ['neuf'],
      garantie_disponible: [false],
      garantie_mois: [0],
      conditions_garantie: [''],
      pays_origine: [''],
      reference_oem: ['', Validators.maxLength(100)],
      poids: [null as number | null, [Validators.min(0)]],
      longueur: [null as number | null, [Validators.min(0)]],
      largeur: [null as number | null, [Validators.min(0)]],
      hauteur: [null as number | null, [Validators.min(0)]],
      matiere: ['', Validators.maxLength(100)],
      couleur: ['', Validators.maxLength(100)],
      disponibilite: [{ value: 'en_stock', disabled: true }],
      delai_livraison: ['2_5j'],
      livraison_disponible: [false],
      retrait_magasin: [false],
      delai_preparation: ['24h'],
      conseils_installation: [''],
      conditions_retour: [''],
      mots_cles: [[] as string[]],
      modeles_compatibles: [[] as string[]]
    }, { validators: [anneesValidator, quantiteValidator] });
  }

  private setupListeners(): void {
    this.produitForm.get('garantie_disponible')?.valueChanges.subscribe(v => this.onGarantieChange(v));
    this.produitForm.get('livraison_disponible')?.valueChanges.subscribe(v => this.onLivraisonChange(v));
    this.produitForm.get('stock')?.valueChanges.subscribe(() => this.updateDisponibilite());
    this.produitForm.get('seuil_alerte')?.valueChanges.subscribe(() => this.updateDisponibilite());
  }

  private onGarantieChange(disponible: boolean): void {
    const garantie = this.produitForm.get('garantie_mois');
    const conditions = this.produitForm.get('conditions_garantie');
    if (disponible) {
      garantie?.setValidators([Validators.required, Validators.min(1)]);
      conditions?.setValidators([Validators.required, Validators.minLength(3)]);
    } else {
      garantie?.clearValidators();
      conditions?.clearValidators();
      garantie?.setValue(0);
      conditions?.setValue('');
    }
    garantie?.updateValueAndValidity();
    conditions?.updateValueAndValidity();
  }

  private onLivraisonChange(disponible: boolean): void {
    const delai = this.produitForm.get('delai_livraison');
    const prep = this.produitForm.get('delai_preparation');
    if (disponible) {
      delai?.setValidators(Validators.required);
      prep?.setValidators(Validators.required);
    } else {
      delai?.clearValidators();
      prep?.clearValidators();
    }
    delai?.updateValueAndValidity();
    prep?.updateValueAndValidity();
  }

  private updateDisponibilite(): void {
    const stock = Number(this.produitForm.get('stock')?.value ?? 0);
    const seuil = Number(this.produitForm.get('seuil_alerte')?.value ?? 10);
    let val: string = stock === 0 ? 'rupture' : (stock <= seuil ? 'faible_stock' : 'en_stock');
    this.produitForm.get('disponibilite')?.setValue(val, { emitEvent: false });
  }

  private loadCategories(then?: () => void): void {
    this.coreProduitService.getCategories().subscribe({
      next: (cats) => {
        this.availableCategories = cats.map(c => ({ id: (c as any).id, nom: (c as any).nom }));
        then?.();
      },
      error: () => {
        then?.();
      }
    });
  }

  selectCategorie(cat: CategorieVehicule): void {
    this.produitForm.get('categorieVehicule')?.setValue(cat);
    this.produitForm.get('typePiece')?.setValue(null);
    this.typePiecesMap = {};
    this.idToTypePieceName = {};
    this.availableTypePieces = [];
    const catId = this.getCategorieIdForVehicule(cat);
    if (catId) this.loadTypePiecesForCategorie(catId);
  }

  private getCategorieIdForVehicule(cat: CategorieVehicule): number | null {
    const key = String(cat).toLowerCase();
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

  private getCategorieVehiculeForId(id: number | null): CategorieVehicule | null {
    if (!id || !this.availableCategories) return null;
    const cat = this.availableCategories.find(c => c.id === id);
    if (!cat) return null;
    const nom = cat.nom.toLowerCase();
    if (nom.includes('auto') || nom.includes('voiture')) return 'automobile';
    if (nom.includes('moto')) return 'moto';
    if (nom.includes('poids') || nom.includes('lourd')) return 'poids-lourd';
    if (nom.includes('vélo') || nom.includes('velo') || nom.includes('bike')) return 'velo';
    return null;
  }

  private loadTypePiecesForCategorie(categorieId: number, thenSet?: string): void {
    this.coreProduitService.getTypesPieces(categorieId).subscribe({
      next: (types) => {
        this.availableTypePieces = types;
        this.typePiecesMap = {};
        this.idToTypePieceName = {};
        types.forEach((tp: any) => {
          const normalized = tp.nom.toLowerCase().normalize('NFD').replace(/[-\u036f]/g, '');
          this.typePiecesMap[normalized] = tp.id;
          this.typePiecesMap[tp.nom] = tp.id;
          this.idToTypePieceName[tp.id] = tp.nom;
        });
        if (thenSet) {
          this.produitForm.get('typePiece')?.setValue(thenSet, { emitEvent: false });
        }
      },
      error: (err) => console.warn('Impossible de charger types de pièces', err)
    });
  }

  // ── COMPATIBILITÉS ──
  private createCompatibiliteGroup(comp?: ProduitCompatibilite): FormGroup {
    return this.fb.group({
      marque: [comp?.marque ?? '', Validators.required],
      modele: [comp?.modele ?? '', Validators.required],
      version: [comp?.version ?? ''],
      motorisation: [comp?.motorisation ?? ''],
      annee_debut: [comp?.annee_debut ?? null],
      annee_fin: [comp?.annee_fin ?? null]
    }, { validators: anneesCompatValidator });
  }

  ajouterCompatibilite(comp?: ProduitCompatibilite): void {
    this.compatibilitesArray.push(this.createCompatibiliteGroup(comp));
  }

  retirerCompatibilite(index: number): void {
    this.compatibilitesArray.removeAt(index);
  }

  // ── MODÈLES COMPATIBLES (chips) ──
  onModeleInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.ajouterModele(this.modeleInput.trim());
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

  // ── IMAGES ──
  ouvrirFileInput(index: number): void {
    this.fileInputs[index]?.click();
  }

  onImageFileSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!this.validerFichierImage(file)) return;

    this.imageSlots[index].file = file;
    this.imageSlots[index].changed = true;
    this.lireApercu(file, (dataUrl) => (this.imageSlots[index].preview = dataUrl));
  }

  retirerImage(index: number): void {
    this.imageSlots[index].file = null;
    this.imageSlots[index].preview = null;
    this.imageSlots[index].changed = true;
    if (this.mainImageIndex === index) {
      this.mainImageIndex = 0;
    }
    const input = this.fileInputs[index];
    if (input) input.value = '';
  }

  definirImagePrincipale(index: number): void {
    if (this.imageSlots[index].preview) {
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
    const temp = this.imageSlots[from];
    this.imageSlots[from] = this.imageSlots[to];
    this.imageSlots[to] = temp;
    if (this.mainImageIndex === from) {
      this.mainImageIndex = to;
    } else if (this.mainImageIndex === to) {
      this.mainImageIndex = from;
    }
    this.fileInputRefs.forEach(ref => ref.nativeElement.value = '');
  }

  // ── PRÉVISUALISATION ──
  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  // ── VALIDATION DÉTAILLÉE ──
  private validerFormulaire(): string | null {
    const form = this.produitForm;
    const errors: string[] = [];

    // Champs obligatoires de base
    if (!form.get('categorieVehicule')?.value) {
      errors.push('Catégorie de véhicule obligatoire');
    }
    if (!form.get('typePiece')?.value) {
      errors.push('Type de pièce obligatoire');
    }
    if (!form.get('nom')?.value) {
      errors.push('Nom du produit obligatoire');
    } else if (form.get('nom')?.value.length < 3) {
      errors.push('Le nom doit contenir au moins 3 caractères');
    }
    if (!form.get('reference')?.value) {
      errors.push('Référence obligatoire');
    }
    if (!form.get('marque')?.value) {
      errors.push('Marque obligatoire');
    }
    if (!form.get('prix')?.value || form.get('prix')?.value < 1) {
      errors.push('Prix valide obligatoire (minimum 1 FCFA)');
    }
    if (form.get('stock')?.value === null || form.get('stock')?.value === undefined || form.get('stock')?.value < 0) {
      errors.push('Stock obligatoire (minimum 0)');
    }
    if (!form.get('description')?.value) {
      errors.push('Description obligatoire');
    } else if (form.get('description')?.value.length < 20) {
      errors.push('La description doit contenir au moins 20 caractères');
    }

    // Validation image principale
    if (!this.imageSlots[this.mainImageIndex]?.preview) {
      errors.push("L'image principale est obligatoire");
    }

    // Validation garantie si activée
    if (form.get('garantie_disponible')?.value) {
      if (!form.get('garantie_mois')?.value || form.get('garantie_mois')?.value < 1) {
        errors.push('Durée de garantie obligatoire quand la garantie est activée');
      }
      if (!form.get('conditions_garantie')?.value || form.get('conditions_garantie')?.value.length < 3) {
        errors.push('Conditions de garantie obligatoires quand la garantie est activée');
      }
    }

    // Validation livraison si activée
    if (form.get('livraison_disponible')?.value) {
      if (!form.get('delai_livraison')?.value) {
        errors.push('Délai de livraison obligatoire quand la livraison est activée');
      }
      if (!form.get('delai_preparation')?.value) {
        errors.push('Délai de préparation obligatoire quand la livraison est activée');
      }
    }

    // Validation quantité min
    const stock = Number(form.get('stock')?.value ?? 0);
    const qmin = form.get('quantite_min')?.value;
    if (qmin !== null && qmin !== undefined && qmin !== '' && Number(qmin) > stock) {
      errors.push('La quantité minimum ne peut pas dépasser le stock');
    }

    // Validation années
    const anneeDebut = form.get('annee_debut')?.value;
    const anneeFin = form.get('annee_fin')?.value;
    if (anneeDebut && anneeFin && anneeDebut > anneeFin) {
      errors.push("L'année de début doit être inférieure ou égale à l'année de fin");
    }

    return errors.length > 0 ? errors.join('. ') : null;
  }

  private formaterErreurBackend(err: any): string {
    console.error('Erreur backend:', err);

    // Erreur de permission
    if (err?.status === 403) {
      return "Vous n'avez pas les permissions nécessaires pour effectuer cette action.";
    }

    // Erreur d'authentification
    if (err?.status === 401) {
      return "Votre session a expiré. Veuillez vous reconnecter.";
    }

    // Erreur de validation du backend
    if (err?.status === 400 && err?.error) {
      if (typeof err.error === 'string') {
        return err.error;
      }

      // Format Django REST Framework avec détails par champ
      if (err.error.detail) {
        return String(err.error.detail);
      }

      // Format avec champs spécifiques
      if (typeof err.error === 'object') {
        const messages: string[] = [];
        const fieldLabels: { [key: string]: string } = {
          nom: 'Nom',
          reference: 'Référence',
          marque: 'Marque',
          prix: 'Prix',
          stock: 'Stock',
          description: 'Description',
          categorie: 'Catégorie',
          type_piece: 'Type de pièce',
          image: 'Image',
          fournisseur: 'Fournisseur',
          statut_approbation: 'Statut d\'approbation'
        };

        for (const [field, errors] of Object.entries(err.error)) {
          const label = fieldLabels[field] || field;
          const errorArray = Array.isArray(errors) ? errors : [errors];
          errorArray.forEach((e: any) => {
            messages.push(`${label}: ${e}`);
          });
        }

        return messages.length > 0 ? messages.join('. ') : "Erreur de validation du formulaire";
      }
    }

    // Erreur serveur
    if (err?.status >= 500) {
      return "Erreur serveur. Veuillez réessayer ultérieurement.";
    }

    // Erreur réseau
    if (err?.status === 0 || !err?.status) {
      return "Erreur de connexion. Vérifiez votre connexion internet.";
    }

    // Message par défaut
    return this.mode === 'create'
      ? "Erreur lors de l'ajout du produit"
      : "Erreur lors de la modification du produit";
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

  // ── SOUMISSION ──
  enregistrer(): void {
    // Validation détaillée du formulaire
    const validationError = this.validerFormulaire();
    if (validationError) {
      this.showToast(validationError, 'error');
      this.produitForm.markAllAsTouched();
      return;
    }

    const categorieId = this.getCategorieIdForVehicule(this.produitForm.get('categorieVehicule')?.value);
    const typePieceName: string | null = this.produitForm.get('typePiece')?.value;
    let typePieceId: number | null = null;
    if (typePieceName) {
      const normalized = typePieceName.toLowerCase().normalize('NFD').replace(/[-\u036f]/g, '');
      typePieceId = this.typePiecesMap[typePieceName] || this.typePiecesMap[normalized] || null;
    }
    if (!categorieId || !typePieceId) {
      this.showToast('Impossible de déterminer la catégorie ou le type de pièce.', 'error');
      return;
    }

    this.isSaving = true;
    const formData = this.buildFormData(categorieId, typePieceId);

    const req = this.mode === 'create'
      ? this.produitService.createProduit(formData)
      : this.produitService.updateProduit(this.productId!, formData);

    req.subscribe({
      next: () => {
        this.isSaving = false;
        const nom = this.produitForm.get('nom')?.value;
        const msg = this.mode === 'create'
          ? '"' + nom + '" a été ajouté au catalogue.'
          : '"' + nom + '" a été mis à jour.';
        this.showToast(msg, 'success');
        setTimeout(() => this.router.navigate(['/fournisseur/produits/list-produit']), 900);
      },
      error: (err) => {
        this.isSaving = false;
        const msg = this.formaterErreurBackend(err);
        this.showToast(msg, 'error');
        console.error('Erreur produit:', err);
      }
    });
  }

  private buildFormData(categorieId: number, typePieceId: number): FormData {
    const v = this.produitForm.getRawValue();
    const fd = new FormData();

    fd.append('categorie', String(categorieId));
    fd.append('type_piece', String(typePieceId));
    fd.append('nom', v.nom);
    fd.append('reference', v.reference || '');
    fd.append('marque', v.marque || '');
    fd.append('fabricant', v.fabricant || '');
    fd.append('prix', String(v.prix));
    fd.append('stock', String(v.stock));
    fd.append('seuil_alerte', String(v.seuil_alerte ?? 10));
    if (v.quantite_min !== null && v.quantite_min !== undefined && v.quantite_min !== '') {
      fd.append('quantite_min', String(v.quantite_min));
    }

    fd.append('description_courte', v.description_courte || '');
    fd.append('description', v.description || '');
    fd.append('description_detaillee', v.description_detaillee || '');
    fd.append('precautions', v.precautions || '');

    fd.append('modeles_compatibles', JSON.stringify(this.modelesCompatibles));
    fd.append('mots_cles', JSON.stringify(this.motsCles));

    if (v.annee_debut !== null && v.annee_debut !== undefined && v.annee_debut !== '') {
      fd.append('annee_debut', String(v.annee_debut));
    }
    if (v.annee_fin !== null && v.annee_fin !== undefined && v.annee_fin !== '') {
      fd.append('annee_fin', String(v.annee_fin));
    }
    fd.append('compatibilites', JSON.stringify(this.compatibilitesArray.value || []));

    fd.append('etat', v.etat || 'neuf');
    fd.append('garantie_disponible', v.garantie_disponible ? 'true' : 'false');
    fd.append('garantie_mois', String(v.garantie_mois ?? 0));
    fd.append('conditions_garantie', v.conditions_garantie || '');

    fd.append('pays_origine', v.pays_origine || '');
    fd.append('reference_oem', v.reference_oem || '');
    if (v.poids !== null && v.poids !== undefined && v.poids !== '') fd.append('poids', String(v.poids));
    if (v.longueur !== null && v.longueur !== undefined && v.longueur !== '') fd.append('longueur', String(v.longueur));
    if (v.largeur !== null && v.largeur !== undefined && v.largeur !== '') fd.append('largeur', String(v.largeur));
    if (v.hauteur !== null && v.hauteur !== undefined && v.hauteur !== '') fd.append('hauteur', String(v.hauteur));
    fd.append('matiere', v.matiere || '');
    fd.append('couleur', v.couleur || '');

    fd.append('disponibilite', v.disponibilite || 'en_stock');
    fd.append('delai_livraison', v.delai_livraison || '2_5j');
    fd.append('livraison_disponible', v.livraison_disponible ? 'true' : 'false');
    fd.append('retrait_magasin', v.retrait_magasin ? 'true' : 'false');
    fd.append('delai_preparation', v.delai_preparation || '');

    fd.append('conseils_installation', v.conseils_installation || '');
    fd.append('conditions_retour', v.conditions_retour || '');

    this.imageSlots.forEach((slot, i) => {
      if (slot.file) {
        const key = i === 0 ? 'image' : 'image_' + (i + 1);
        fd.append(key, slot.file);
      }
    });
    fd.append('image_principale_index', String(this.mainImageIndex + 1));

    return fd;
  }

  // ── CHARGEMENT EN MODE ÉDITION ──
  private loadProduit(id: number): void {
    this.isLoading = true;
    this.produitService.getProduit(id).subscribe({
      next: (p) => {
        this.isLoading = false;
        this.patchFormFromProduit(p);
      },
      error: () => {
        this.isLoading = false;
        this.showToast('Impossible de charger le produit.', 'error');
        this.retour();
      }
    });
  }

  private patchFormFromProduit(p: Produit): void {
    // Catégorie et type de pièce
    const catVeh = this.getCategorieVehiculeForId(p.categorie);
    if (catVeh) {
      this.produitForm.get('categorieVehicule')?.setValue(catVeh, { emitEvent: false });
      const catId = this.getCategorieIdForVehicule(catVeh);
      if (catId) {
        // Charger les types de pièces puis patcher le type
        this.coreProduitService.getTypesPieces(catId).subscribe({
          next: (types) => {
            this.availableTypePieces = types;
            this.typePiecesMap = {};
            this.idToTypePieceName = {};
            types.forEach((tp: any) => {
              const normalized = tp.nom.toLowerCase().normalize('NFD').replace(/[-\u036f]/g, '');
              this.typePiecesMap[normalized] = tp.id;
              this.typePiecesMap[tp.nom] = tp.id;
              this.idToTypePieceName[tp.id] = tp.nom;
            });
            const typeName = p.type_piece_nom || (p.type_piece ? this.idToTypePieceName[p.type_piece] : null);
            if (typeName) this.produitForm.get('typePiece')?.setValue(typeName, { emitEvent: false });
          },
          error: () => {}
        });
      }
    }

    // Pré-remplir le reste
    this.produitForm.patchValue({
      nom: p.nom,
      reference: p.reference ?? '',
      marque: p.marque ?? '',
      fabricant: p.fabricant ?? '',
      prix: p.prix,
      stock: p.stock,
      seuil_alerte: p.seuil_alerte ?? 10,
      quantite_min: p.quantite_min ?? null,
      description_courte: p.description_courte ?? '',
      description: p.description ?? '',
      description_detaillee: p.description_detaillee ?? '',
      precautions: p.precautions ?? '',
      annee_debut: p.annee_debut ?? null,
      annee_fin: p.annee_fin ?? null,
      etat: p.etat ?? 'neuf',
      garantie_disponible: p.garantie_disponible ?? false,
      garantie_mois: p.garantie_mois ?? 0,
      conditions_garantie: p.conditions_garantie ?? '',
      pays_origine: p.pays_origine ?? '',
      reference_oem: p.reference_oem ?? '',
      poids: p.poids ?? null,
      longueur: p.longueur ?? null,
      largeur: p.largeur ?? null,
      hauteur: p.hauteur ?? null,
      matiere: p.matiere ?? '',
      couleur: p.couleur ?? '',
      disponibilite: p.disponibilite ?? 'en_stock',
      delai_livraison: p.delai_livraison ?? '2_5j',
      livraison_disponible: p.livraison_disponible ?? false,
      retrait_magasin: p.retrait_magasin ?? false,
      delai_preparation: p.delai_preparation ?? '24h',
      conseils_installation: p.conseils_installation ?? '',
      conditions_retour: p.conditions_retour ?? '',
    }, { emitEvent: false });

    this.modelesCompatibles = Array.isArray(p.modeles_compatibles) ? [...p.modeles_compatibles] : [];
    this.motsCles = Array.isArray(p.mots_cles) ? [...p.mots_cles] : [];

    // Compatibilités
    this.compatibilitesArray.clear();
    (p.compatibilites ?? []).forEach(c => this.ajouterCompatibilite(c));

    // Images
    this.mainImageIndex = Math.max(0, (p.image_principale_index ?? 1) - 1);
    const urls = [p.image_url, p.image_2_url, p.image_3_url, p.image_4_url];
    this.imageSlots = Array.from({ length: 4 }, (_, i) => ({
      file: null,
      preview: urls[i] || null,
      changed: false
    }));

    // Réappliquer validators dynamiques
    this.onGarantieChange(this.produitForm.get('garantie_disponible')?.value ?? false);
    this.onLivraisonChange(this.produitForm.get('livraison_disponible')?.value ?? false);
    this.updateDisponibilite();
  }

  retour(): void {
    this.router.navigate(['/fournisseur/produits/list-produit']);
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 3500);
  }
}

// ── VALIDATEURS CROSS-FIELD ──
function anneesValidator(control: AbstractControl): ValidationErrors | null {
  const group = control as FormGroup;
  const debut = group.get('annee_debut')?.value;
  const fin = group.get('annee_fin')?.value;
  if (debut && fin && Number(fin) < Number(debut)) {
    return { anneesInvalides: true };
  }
  return null;
}

function anneesCompatValidator(control: AbstractControl): ValidationErrors | null {
  const group = control as FormGroup;
  const debut = group.get('annee_debut')?.value;
  const fin = group.get('annee_fin')?.value;
  if (debut && fin && Number(fin) < Number(debut)) {
    return { anneesInvalides: true };
  }
  return null;
}

function quantiteValidator(control: AbstractControl): ValidationErrors | null {
  const group = control as FormGroup;
  const stock = Number(group.get('stock')?.value ?? 0);
  const qmin = group.get('quantite_min')?.value;
  if (qmin !== null && qmin !== undefined && qmin !== '' && Number(qmin) > stock) {
    return { quantiteMinTropGrande: true };
  }
  return null;
}