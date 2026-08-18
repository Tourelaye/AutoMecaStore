import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { FournisseurService, Magasin } from '../services/fournisseur.service';

interface HoraireJourModel {
  label: string;
  key: string;
  ouvert: boolean;
  debut: string;
  fin: string;
}

const JOURS_SEMAINE: HoraireJourModel[] = [
  { label: 'Lundi', key: 'lundi', ouvert: true, debut: '08:00', fin: '18:00' },
  { label: 'Mardi', key: 'mardi', ouvert: true, debut: '08:00', fin: '18:00' },
  { label: 'Mercredi', key: 'mercredi', ouvert: true, debut: '08:00', fin: '18:00' },
  { label: 'Jeudi', key: 'jeudi', ouvert: true, debut: '08:00', fin: '18:00' },
  { label: 'Vendredi', key: 'vendredi', ouvert: true, debut: '08:00', fin: '18:00' },
  { label: 'Samedi', key: 'samedi', ouvert: true, debut: '09:00', fin: '13:00' },
  { label: 'Dimanche', key: 'dimanche', ouvert: false, debut: '', fin: '' }
];

@Component({
  selector: 'app-mon-magasin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mon-magasin.component.html',
  styleUrls: ['./mon-magasin.component.css']
})
export class MonMagasinComponent implements OnInit, OnDestroy {
  activeTab: 'identite' | 'contact' | 'horaires' = 'identite';
  isLoading = false;
  isSaving = false;

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  magasinForm: FormGroup;

  get horaires(): FormArray {
    return this.magasinForm.get('horaires') as FormArray;
  }

  logoFile: File | null = null;
  logoPreview: string | null = null;
  coverFile: File | null = null;
  coverPreview: string | null = null;

  readonly joursSemaine = JOURS_SEMAINE;
  private subs: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private fournisseurService: FournisseurService
  ) {
    this.magasinForm = this.buildForm();
    this.initHoraires();
  }

  ngOnInit(): void {
    this.setupDynamicValidators();
    this.setupHorairesSync();
    this.loadMagasin();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      nom_magasin: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(1000)]],
      telephone: ['', [Validators.required, this.telephoneValidator]],
      whatsapp: ['', [this.telephoneValidator]],
      email: ['', [Validators.required, Validators.email]],
      adresse_complete: ['', [Validators.required, Validators.maxLength(500)]],
      ville: ['', [Validators.required, Validators.maxLength(100)]],
      region: ['', [Validators.required, Validators.maxLength(100)]],
      latitude: [null, [Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.min(-180), Validators.max(180)]],
      livraison_disponible: [false],
      retrait_magasin: [false],
      rayon_livraison_km: [null],
      jours_ouverture: [''],
      horaires_ouverture: ['{}'],
      horaires: this.fb.array([])
    });
  }

  private initHoraires(values: { [key: string]: any } = {}): void {
    this.horaires.clear();
    JOURS_SEMAINE.forEach(jour => {
      const v = values[jour.key] || { ouvert: jour.ouvert, debut: jour.debut, fin: jour.fin };
      this.horaires.push(
        this.fb.group(
          {
            ouvert: [!!v.ouvert],
            debut: [v.debut || ''],
            fin: [v.fin || '']
          },
          { validators: this.horaireValidator }
        )
      );
    });
  }

  private telephoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value || '').toString().trim();
    if (!value) return null;

    let cleaned = value.replace(/[\s\-.]/g, '');
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.slice(2);
    }

    if (cleaned.startsWith('+221')) {
      return /^(70|75|76|77|78)\d{7}$/.test(cleaned.slice(4))
        ? null
        : { telephone: 'Numéro sénégalais invalide. Ex : +22177XXXXXXX' };
    } else if (cleaned.startsWith('+')) {
      return /^\+[1-9]\d{6,14}$/.test(cleaned)
        ? null
        : { telephone: 'Numéro international invalide.' };
    } else {
      return /^(70|75|76|77|78)\d{7}$/.test(cleaned)
        ? null
        : { telephone: 'Numéro sénégalais invalide. Ex : 77XXXXXXX' };
    }
  }

  private horaireValidator(group: AbstractControl): ValidationErrors | null {
    const v = group.value;
    if (!v.ouvert) return null;
    if (!v.debut || !v.fin) {
      return { horaire: 'Heures requises pour les jours ouverts' };
    }
    if (v.debut >= v.fin) {
      return { horaire: 'L\'heure d\'ouverture doit être avant l\'heure de fermeture' };
    }
    return null;
  }

  private setupDynamicValidators(): void {
    const sub = this.magasinForm.get('livraison_disponible')?.valueChanges.subscribe(livre => {
      const rayon = this.magasinForm.get('rayon_livraison_km');
      if (livre) {
        rayon?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        rayon?.clearValidators();
      }
      rayon?.updateValueAndValidity();
    });
    if (sub) this.subs.add(sub);
  }

  private setupHorairesSync(): void {
    const sub = this.horaires.valueChanges.subscribe(() => this.syncHorairesFields());
    this.subs.add(sub);
  }

  private syncHorairesFields(): void {
    const obj: { [key: string]: any } = {};
    const jours: string[] = [];
    this.horaires.controls.forEach((ctrl, i) => {
      const v = ctrl.value;
      const key = JOURS_SEMAINE[i].key;
      obj[key] = { ouvert: v.ouvert, debut: v.debut, fin: v.fin };
      if (v.ouvert) {
        jours.push(JOURS_SEMAINE[i].label);
      }
    });
    this.magasinForm.patchValue(
      {
        horaires_ouverture: JSON.stringify(obj),
        jours_ouverture: jours.join(', ')
      },
      { emitEvent: false }
    );
  }

  private loadMagasin(): void {
    this.isLoading = true;
    this.fournisseurService.getMagasin().subscribe({
      next: (m: Magasin) => {
        this.patchForm(m);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.showToast('Impossible de charger les informations du magasin', 'error');
      }
    });
  }

  private patchForm(m: Magasin): void {
    this.magasinForm.patchValue({
      nom_magasin: m.nom_magasin || '',
      description: m.description || '',
      telephone: m.telephone || '',
      whatsapp: m.whatsapp || '',
      email: m.email || '',
      adresse_complete: m.adresse_complete || '',
      ville: m.ville || '',
      region: m.region || '',
      latitude: m.latitude ?? null,
      longitude: m.longitude ?? null,
      livraison_disponible: !!m.livraison_disponible,
      retrait_magasin: !!m.retrait_magasin,
      rayon_livraison_km: m.rayon_livraison_km ?? null
    });
    this.logoPreview = m.logo_url || null;
    this.coverPreview = m.photo_couverture_url || null;
    this.logoFile = null;
    this.coverFile = null;
    this.initHoraires(m.horaires_ouverture || {});
    this.syncHorairesFields();
    // Trigger rayon validator state after patching
    this.magasinForm.get('livraison_disponible')?.updateValueAndValidity();
  }

  onLogoSelectionne(event: Event): void {
    this.handleImageSelect(event, 'logo');
  }

  onCoverSelectionne(event: Event): void {
    this.handleImageSelect(event, 'cover');
  }

  private handleImageSelect(event: Event, type: 'logo' | 'cover'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Le fichier sélectionné doit être une image.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.showToast('L\'image ne doit pas dépasser 5 Mo.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'logo') {
        this.logoFile = file;
        this.logoPreview = reader.result as string;
      } else {
        this.coverFile = file;
        this.coverPreview = reader.result as string;
      }
    };
    reader.readAsDataURL(file);
  }

  retirerLogo(event?: Event): void {
    event?.stopPropagation();
    this.logoFile = null;
    this.logoPreview = null;
    const input = document.getElementById('logoInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  retirerCover(event?: Event): void {
    event?.stopPropagation();
    this.coverFile = null;
    this.coverPreview = null;
    const input = document.getElementById('coverInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  onSubmit(): void {
    if (this.magasinForm.invalid || this.horaires.invalid) {
      this.magasinForm.markAllAsTouched();
      this.horaires.controls.forEach(c => c.markAllAsTouched());
      this.showToast('Veuillez corriger les erreurs du formulaire.', 'error');
      return;
    }

    const formData = new FormData();
    const value = this.magasinForm.value;

    const stringFields = [
      'nom_magasin',
      'description',
      'telephone',
      'whatsapp',
      'email',
      'adresse_complete',
      'ville',
      'region',
      'jours_ouverture',
      'horaires_ouverture'
    ];

    stringFields.forEach(f => {
      const val = value[f];
      formData.append(f, val !== null && val !== undefined ? val.toString() : '');
    });

    if (value.latitude !== null && value.latitude !== undefined && value.latitude !== '') {
      formData.append('latitude', value.latitude.toString());
    }
    if (value.longitude !== null && value.longitude !== undefined && value.longitude !== '') {
      formData.append('longitude', value.longitude.toString());
    }

    formData.append('livraison_disponible', value.livraison_disponible ? 'true' : 'false');
    formData.append('retrait_magasin', value.retrait_magasin ? 'true' : 'false');

    if (value.rayon_livraison_km !== null && value.rayon_livraison_km !== undefined && value.rayon_livraison_km !== '') {
      formData.append('rayon_livraison_km', value.rayon_livraison_km.toString());
    }

    if (this.logoFile) {
      formData.append('logo', this.logoFile);
    }
    if (this.coverFile) {
      formData.append('photo_couverture', this.coverFile);
    }

    this.isSaving = true;
    this.fournisseurService.updateMagasin(formData).subscribe({
      next: (m: Magasin) => {
        this.isSaving = false;
        this.patchForm(m);
        this.showToast('Magasin mis à jour avec succès.', 'success');
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.error?.detail || 'Erreur lors de la mise à jour du magasin.';
        this.showToast(msg, 'error');
      }
    });
  }

  onCancel(): void {
    this.loadMagasin();
  }

  hasError(field: string, error?: string): boolean {
    const ctrl = this.magasinForm.get(field);
    if (!ctrl || !ctrl.touched) return false;
    return error ? ctrl.hasError(error) : ctrl.invalid;
  }

  errorMessage(field: string): string {
    const ctrl = this.magasinForm.get(field);
    if (!ctrl || !ctrl.errors) return '';
    const errors = ctrl.errors;
    if (errors['required']) return 'Ce champ est obligatoire.';
    if (errors['email']) return 'Adresse email invalide.';
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} caractères.`;
    if (errors['maxlength']) return `Maximum ${errors['maxlength'].requiredLength} caractères.`;
    if (errors['min']) return `Valeur trop faible.`;
    if (errors['max']) return `Valeur trop élevée.`;
    if (errors['telephone']) return errors['telephone'];
    return 'Champ invalide.';
  }

  horaireError(i: number): string {
    const ctrl = this.horaires.at(i);
    if (!ctrl.touched || !ctrl.errors) return '';
    return ctrl.errors['horaire'] || '';
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toastMsg = msg;
    this.toastType = type;
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 4000);
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
