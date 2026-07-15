import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FournisseurService, FournisseurProfile } from '../../services/fournisseur.service';

type EditTab = 'identite' | 'contacts' | 'bancaire';

interface HoraireJour {
  label: string;
  ouvert: boolean;
  debut: string;
  fin: string;
}

interface BanqueInfo {
  nom: string;
  iban: string;
  mobileMoney: string;
}

interface ProfilEditForm {
  nom: string;
  ninea: string;
  description: string;
  adresse: string;
  email: string;
  telephone: string;
  horaires: HoraireJour[];
  banque: BanqueInfo;
}

@Component({
  selector: 'app-modifier-profil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modifier-profil.component.html',
  styleUrls: ['./modifier-profil.component.css']
})
export class ModifierProfilComponent implements OnInit {

  activeTab: EditTab = 'identite';
  isSaving = false;

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  logoFile: File | null = null;
  logoPreview: string | null = null;

  form: ProfilEditForm = {
    nom: '',
    ninea: '',
    description: '',
    adresse: '',
    email: '',
    telephone: '',
    horaires: [
      { label: 'Lundi', ouvert: true, debut: '08:00', fin: '18:00' },
      { label: 'Mardi', ouvert: true, debut: '08:00', fin: '18:00' },
      { label: 'Mercredi', ouvert: true, debut: '08:00', fin: '18:00' },
      { label: 'Jeudi', ouvert: true, debut: '08:00', fin: '18:00' },
      { label: 'Vendredi', ouvert: true, debut: '08:00', fin: '18:00' },
      { label: 'Samedi', ouvert: true, debut: '09:00', fin: '13:00' },
      { label: 'Dimanche', ouvert: false, debut: '', fin: '' }
    ],
    banque: {
      nom: '',
      iban: '',
      mobileMoney: ''
    }
  };

  constructor(
    private router: Router,
    private fournisseurService: FournisseurService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.fournisseurService.getProfile().subscribe({
      next: (p: FournisseurProfile) => {
        this.form = {
          nom: p.nom_entreprise || '',
          ninea: p.siret || '',
          description: p.description || '',
          adresse: '',
          email: p.user?.email || '',
          telephone: p.user?.telephone || '',
          horaires: this.form.horaires,
          banque: this.form.banque
        };
        this.logoPreview = p.logo || null;
      },
      error: () => this.showToast('Impossible de charger le profil', 'error')
    });
  }

  onLogoSelectionne(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast("Le fichier sélectionné n'est pas une image.", 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.showToast("Le logo dépasse la taille maximale de 5 Mo.", 'error');
      return;
    }

    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = () => (this.logoPreview = reader.result as string);
    reader.readAsDataURL(file);
  }

  retirerLogo(): void {
    this.logoFile = null;
    this.logoPreview = null;
  }

  enregistrer(): void {
    this.isSaving = true;

    const formData = new FormData();
    formData.append('nom_entreprise', this.form.nom);
    formData.append('siret', this.form.ninea);
    formData.append('description', this.form.description);
    if (this.logoFile) formData.append('logo', this.logoFile);

    this.fournisseurService.updateProfile(formData).subscribe({
      next: () => {
        this.isSaving = false;
        this.showToast('Profil mis à jour avec succès.', 'success');
        setTimeout(() => this.router.navigate(['/fournisseur/profil']), 900);
      },
      error: () => {
        this.isSaving = false;
        this.showToast('Erreur lors de la mise à jour du profil', 'error');
      }
    });
  }

  annuler(): void {
    this.router.navigate(['/fournisseur/profil']);
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 3000);
  }
}