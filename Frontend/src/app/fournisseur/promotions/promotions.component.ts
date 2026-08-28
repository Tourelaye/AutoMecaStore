import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { ProduitService, Produit } from '../services/produit.service';
import {
  PromotionService,
  Promotion,
  PromotionPayload,
  PromotionStats,
  TypePromotion
} from '../services/promotion.service';

interface TypeMeta {
  value: TypePromotion;
  label: string;
  icon: string;
  needValue: boolean;
  valueLabel: string;
  valueSuffix: string;
}

interface StatusMeta {
  label: string;
  colorClass: string;
  icon: string;
}

@Component({
  selector: 'app-promotions-fournisseur',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './promotions.component.html',
  styleUrls: ['./promotions.component.css']
})
export class PromotionsComponent implements OnInit {

  isSaving = false;
  isLoading = false;
  formError = '';
  editingId: number | null = null;

  promoForm: FormGroup;

  produits: Produit[] = [];
  promotions: Promotion[] = [];
  stats?: PromotionStats;
  imageErrors: { [id: number]: boolean } = {};

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  typeOptions: TypeMeta[] = [
    { value: 'pourcentage', label: 'Réduction en pourcentage', icon: 'bi-percent', needValue: true, valueLabel: 'Pourcentage', valueSuffix: '%' },
    { value: 'montant_fixe', label: 'Réduction en montant fixe', icon: 'bi-cash-coin', needValue: true, valueLabel: 'Montant', valueSuffix: 'FCFA' },
    { value: 'vente_flash', label: 'Vente Flash', icon: 'bi-lightning-charge-fill', needValue: true, valueLabel: 'Pourcentage', valueSuffix: '%' },
    { value: 'offre_speciale', label: 'Offre spéciale', icon: 'bi-gift-fill', needValue: true, valueLabel: 'Valeur', valueSuffix: '%' },
    { value: 'produit_vedette', label: 'Produit en vedette', icon: 'bi-star-fill', needValue: false, valueLabel: '', valueSuffix: '' },
    { value: 'nouveau_produit', label: 'Nouveau produit', icon: 'bi-stars', needValue: false, valueLabel: '', valueSuffix: '' },
    { value: 'dernieres_pieces', label: 'Dernières pièces', icon: 'bi-hourglass-split', needValue: false, valueLabel: '', valueSuffix: '' }
  ];

  statusMeta: { [key: string]: StatusMeta } = {
    active: { label: 'Active', colorClass: 'status-active', icon: 'bi-check-circle-fill' },
    a_venir: { label: 'À venir', colorClass: 'status-upcoming', icon: 'bi-clock-fill' },
    terminee: { label: 'Terminée', colorClass: 'status-ended', icon: 'bi-calendar-x-fill' },
    suspendue: { label: 'Suspendue', colorClass: 'status-suspended', icon: 'bi-pause-circle-fill' }
  };

  constructor(
    private fb: FormBuilder,
    private produitService: ProduitService,
    private promotionService: PromotionService
  ) {
    this.promoForm = this.fb.group({
      nom: ['', [Validators.required, Validators.maxLength(120)]],
      description: [''],
      produit: [null, Validators.required],
      type_promotion: ['pourcentage', Validators.required],
      valeur: [null],
      date_debut: ['', Validators.required],
      heure_debut: [''],
      date_fin: ['', Validators.required],
      heure_fin: [''],
      quantite_min: [null],
      nombre_max_utilisations: [null],
      is_active: [true]
    }, { validators: [this.datesValidator, this.discountValidator.bind(this)] });
  }

  ngOnInit(): void {
    console.log('PromotionsComponent - ngOnInit called');
    this.loadProduits();
    this.loadPromotions();
    this.loadStats();

    this.promoForm.get('type_promotion')?.valueChanges.subscribe(() => this.onTypeChange());
    this.onTypeChange();

    this.promoForm.valueChanges.subscribe(() => {
      if (this.formError) this.formError = '';
    });
  }

  // =============================================
  // GETTERS
  // =============================================
  get produitSelectionne(): Produit | undefined {
    const id = this.promoForm.get('produit')?.value;
    return this.produits.find(p => p.id === id);
  }

  get prixOriginal(): number {
    return this.produitSelectionne?.prix || 0;
  }

  get selectedTypeMeta(): TypeMeta | undefined {
    return this.typeOptions.find(t => t.value === this.promoForm.get('type_promotion')?.value);
  }

  get showPreview(): boolean {
    const type = this.promoForm.get('type_promotion')?.value as TypePromotion;
    const valeur = Number(this.promoForm.get('valeur')?.value);
    const meta = this.typeOptions.find(t => t.value === type);
    if (!this.prixOriginal || !meta) return false;
    if (!meta.needValue) return true;
    return valeur > 0;
  }

  // =============================================
  // VALIDATORS
  // =============================================
  datesValidator(group: AbstractControl): ValidationErrors | null {
    const dd = group.get('date_debut')?.value;
    const hd = group.get('heure_debut')?.value || '00:00';
    const df = group.get('date_fin')?.value;
    const hf = group.get('heure_fin')?.value || '23:59';
    if (!dd || !df) return null;
    const debut = new Date(`${dd}T${hd}`);
    const fin = new Date(`${df}T${hf}`);
    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) return null;
    return fin > debut ? null : { dates: 'La date de fin doit être postérieure à la date de début.' };
  }

  discountValidator(group: AbstractControl): ValidationErrors | null {
    const type = group.get('type_promotion')?.value as TypePromotion;
    const valeur = Number(group.get('valeur')?.value);
    const produit = this.produitSelectionne;

    if (!['pourcentage', 'montant_fixe', 'vente_flash', 'offre_speciale'].includes(type)) return null;

    if (!valeur || valeur <= 0) {
      return { valeur: 'La valeur de la réduction est requise.' };
    }

    if (!produit) return null;

    if (type === 'pourcentage' && (valeur <= 0 || valeur > 100)) {
      return { valeur: 'Le pourcentage doit être compris entre 1 et 100.' };
    }

    if (type === 'montant_fixe' && valeur > produit.prix) {
      return { valeur: 'La réduction ne peut pas dépasser le prix du produit.' };
    }

    return null;
  }

  // =============================================
  // FORMULAIRE
  // =============================================
  onTypeChange(): void {
    const type = this.promoForm.get('type_promotion')?.value as TypePromotion;
    const meta = this.typeOptions.find(t => t.value === type);
    const valeurCtrl = this.promoForm.get('valeur')!;

    if (meta?.needValue) {
      if (type === 'pourcentage') {
        valeurCtrl.setValidators([Validators.required, Validators.min(1), Validators.max(100)]);
      } else if (type === 'montant_fixe') {
        valeurCtrl.setValidators([Validators.required, Validators.min(1)]);
      } else {
        valeurCtrl.setValidators([Validators.required, Validators.min(1)]);
      }
    } else {
      valeurCtrl.clearValidators();
      valeurCtrl.setValue(null);
    }
    valeurCtrl.updateValueAndValidity();
  }

  calculPrixPromo(prix: number, type: TypePromotion, valeur?: number): number {
    if (!prix) return 0;
    if (!['pourcentage', 'montant_fixe', 'vente_flash', 'offre_speciale'].includes(type) || !valeur) return prix;

    if (type === 'montant_fixe') {
      return Math.max(0, Math.round(prix - valeur));
    }
    return Math.max(0, Math.round(prix * (1 - valeur / 100)));
  }

  getPrixPreview(): number {
    const type = this.promoForm.get('type_promotion')?.value as TypePromotion;
    const valeur = Number(this.promoForm.get('valeur')?.value);
    return this.calculPrixPromo(this.prixOriginal, type, valeur);
  }

  getSavings(): number {
    return Math.max(0, this.prixOriginal - this.getPrixPreview());
  }

  // =============================================
  // CHARGEMENT
  // =============================================
  private loadProduits(): void {
    console.log('PromotionsComponent - loadProduits called');
    this.produitService.getProduits().subscribe({
      next: produits => {
        console.log('Produits loaded:', produits.length);
        this.produits = produits.map(p => ({
          ...p,
          image: p.image_url || p.image || undefined
        })) as Produit[];
      },
      error: (err) => {
        console.error('Error loading produits:', err);
        this.showToast('Impossible de charger les produits', 'error');
      }
    });
  }

  private loadPromotions(): void {
    console.log('PromotionsComponent - loadPromotions called');
    this.isLoading = true;
    this.promotionService.getPromotions().subscribe({
      next: promotions => {
        console.log('Promotions loaded:', promotions.length);
        this.promotions = promotions.map(p => ({
          ...p,
          prix_original: p.prix_original ? Number(p.prix_original) : undefined,
          prix_promo: p.prix_promo ? Number(p.prix_promo) : undefined
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading promotions:', err);
        this.showToast('Impossible de charger les promotions', 'error');
        this.isLoading = false;
      }
    });
  }

  private loadStats(): void {
    console.log('PromotionsComponent - loadStats called');
    this.promotionService.getStats().subscribe({
      next: stats => {
        console.log('Stats loaded:', stats);
        if (stats.meilleure_promotion) {
          stats.meilleure_promotion.prix_original = stats.meilleure_promotion.prix_original ? Number(stats.meilleure_promotion.prix_original) : undefined;
          stats.meilleure_promotion.prix_promo = stats.meilleure_promotion.prix_promo ? Number(stats.meilleure_promotion.prix_promo) : undefined;
        }
        this.stats = stats;
      },
      error: (err) => {
        console.error('Error loading stats:', err);
        this.showToast('Impossible de charger les statistiques', 'error');
      }
    });
  }

  // =============================================
  // SOUMISSION
  // =============================================
  submitForm(): void {
    this.formError = '';
    this.promoForm.markAllAsTouched();

    if (this.promoForm.invalid) {
      this.formError = 'Merci de corriger les erreurs du formulaire.';
      return;
    }

    const v = this.promoForm.value;
    const produit = this.produitSelectionne;
    if (!produit) {
      this.formError = 'Produit introuvable.';
      return;
    }

    const dateDebut = this.combineDateTime(v.date_debut, v.heure_debut, true);
    const dateFin = this.combineDateTime(v.date_fin, v.heure_fin, false);

    // Validation conflit de période (frontend)
    const overlap = this.promotions.some(p =>
      p.produit === produit.id &&
      p.id !== this.editingId &&
      p.is_active !== false &&
      new Date(dateDebut) < new Date(p.date_fin) &&
      new Date(dateFin) > new Date(p.date_debut)
    );
    if (overlap) {
      this.formError = 'Ce produit a déjà une promotion sur cette période.';
      return;
    }

    const payload: PromotionPayload = {
      produit: produit.id,
      nom: v.nom,
      description: v.description,
      type_promotion: v.type_promotion,
      date_debut: dateDebut,
      date_fin: dateFin,
      quantite_min: v.quantite_min ? Number(v.quantite_min) : undefined,
      nombre_max_utilisations: v.nombre_max_utilisations ? Number(v.nombre_max_utilisations) : undefined,
      is_active: v.is_active
    };

    const valeur = Number(v.valeur);
    if (v.type_promotion === 'montant_fixe') {
      payload.valeur_reduction = valeur;
    } else if (['pourcentage', 'vente_flash', 'offre_speciale'].includes(v.type_promotion)) {
      payload.pourcentage = valeur;
    }

    this.isSaving = true;
    const call = this.editingId
      ? this.promotionService.updatePromotion(this.editingId, payload)
      : this.promotionService.createPromotion(payload);

    call.subscribe({
      next: () => {
        this.loadPromotions();
        this.loadStats();
        this.resetForm();
        this.isSaving = false;
        this.showToast(this.editingId ? 'Promotion mise à jour' : 'Promotion créée', 'success');
      },
      error: err => {
        this.isSaving = false;
        const msg = err?.error?.detail || err?.error?.error || 'Erreur lors de l’enregistrement de la promotion';
        this.formError = Array.isArray(msg) ? msg.join(', ') : msg;
        this.showToast('Erreur lors de l’enregistrement', 'error');
      }
    });
  }

  private combineDateTime(date: string, time: string, isStart: boolean): string {
    const t = time || (isStart ? '00:00' : '23:59');
    return `${date}T${t}`;
  }

  // =============================================
  // ACTIONS
  // =============================================
  modifierPromo(promo: Promotion): void {
    this.editingId = promo.id || null;
    const dd = promo.date_debut ? promo.date_debut.slice(0, 10) : '';
    const hd = promo.date_debut && promo.date_debut.length > 10 ? promo.date_debut.slice(11, 16) : '';
    const df = promo.date_fin ? promo.date_fin.slice(0, 10) : '';
    const hf = promo.date_fin && promo.date_fin.length > 10 ? promo.date_fin.slice(11, 16) : '';

    let valeur: number | null = null;
    if (promo.type_promotion === 'montant_fixe') {
      valeur = promo.valeur_reduction || null;
    } else if (['pourcentage', 'vente_flash', 'offre_speciale'].includes(promo.type_promotion)) {
      valeur = promo.pourcentage || null;
    }

    this.promoForm.patchValue({
      nom: promo.nom || '',
      description: promo.description || '',
      produit: promo.produit,
      type_promotion: promo.type_promotion,
      valeur,
      date_debut: dd,
      heure_debut: hd,
      date_fin: df,
      heure_fin: hf,
      quantite_min: promo.quantite_min || null,
      nombre_max_utilisations: promo.nombre_max_utilisations || null,
      is_active: promo.is_active !== false
    });
    this.onTypeChange();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  dupliquerPromo(promo: Promotion): void {
    if (!promo.id) return;
    this.promotionService.duplicatePromotion(promo.id).subscribe({
      next: () => {
        this.loadPromotions();
        this.loadStats();
        this.showToast('Promotion dupliquée', 'success');
      },
      error: () => {
        this.showToast('Erreur lors de la duplication', 'error');
      }
    });
  }

  basculerPromo(promo: Promotion): void {
    if (!promo.id) return;
    const action = promo.is_active ? 'suspendre' : 'reactiver';
    this.promotionService.togglePromotion(promo.id, action).subscribe({
      next: () => {
        this.loadPromotions();
        this.loadStats();
        this.showToast(action === 'suspendre' ? 'Promotion suspendue' : 'Promotion réactivée', 'success');
      },
      error: () => {
        this.showToast('Erreur lors du changement de statut', 'error');
      }
    });
  }

  supprimerPromo(promo: Promotion): void {
    if (!promo.id) return;
    const confirmation = window.confirm(`Supprimer la promotion « ${promo.nom || promo.type_promotion_label} » ?`);
    if (!confirmation) return;

    this.promotionService.deletePromotion(promo.id).subscribe({
      next: () => {
        this.loadPromotions();
        this.loadStats();
        this.showToast('Promotion supprimée.', 'success');
      },
      error: () => {
        this.showToast('Erreur lors de la suppression', 'error');
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.formError = '';
    this.promoForm.reset({
      nom: '',
      description: '',
      produit: null,
      type_promotion: 'pourcentage',
      valeur: null,
      date_debut: '',
      heure_debut: '',
      date_fin: '',
      heure_fin: '',
      quantite_min: null,
      nombre_max_utilisations: null,
      is_active: true
    });
    this.onTypeChange();
  }

  annulerEdition(): void {
    this.resetForm();
  }

  // =============================================
  // UTILITAIRES
  // =============================================
  getProduct(promo: Promotion): Produit | undefined {
    return this.produits.find(p => p.id === promo.produit);
  }

  getStatusMeta(promo: Promotion): StatusMeta {
    return this.statusMeta[promo.statut || 'a_venir'] || this.statusMeta['a_venir'];
  }

  getTypeMeta(type: TypePromotion): TypeMeta {
    return this.typeOptions.find(t => t.value === type) || this.typeOptions[0];
  }

  formatPrix(prix?: number | string): string {
    if (prix === undefined || prix === null) return '—';
    return Number(prix).toLocaleString('fr-FR').replace(/,/g, ' ') + ' FCFA';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  onImgError(id: number): void {
    this.imageErrors[id] = true;
  }

  trackById(index: number, p: Promotion): number {
    return p.id || index;
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 3000);
  }
}