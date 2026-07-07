import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
export class ModifierProfilComponent {

  activeTab: EditTab = 'identite';
  isSaving = false;

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  logoFile: File | null = null;
  logoPreview: string | null = null;

  // TODO: pré-remplir depuis le vrai profil (récupéré via un service, idéalement
  // partagé avec MonProfilComponent pour éviter de dupliquer les données)
  form: ProfilEditForm = {
    nom: 'AutoMeca Dakar Distribution (AMDD)',
    ninea: '005489212G3',
    description: `Distributeur agréé de pièces détachées d'origine et première monte pour automobiles, deux-roues et poids lourds. Présent sur le marché ouest-africain depuis 2018.`,
    adresse: 'Zone Industrielle SODIDA, Rue 14 x 22, Dakar, Sénégal',
    email: 'contact@automeca-dakar.sn',
    telephone: '+221 77 845 20 30',
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
      nom: 'CBAO Groupe Attijariwafa Bank',
      iban: 'SN012 01001 034567890123 45',
      mobileMoney: '+221 77 845 20 30'
    }
  };

  constructor(private router: Router) {}

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
    formData.append('nom', this.form.nom);
    formData.append('ninea', this.form.ninea);
    formData.append('description', this.form.description);
    formData.append('adresse', this.form.adresse);
    formData.append('email', this.form.email);
    formData.append('telephone', this.form.telephone);
    formData.append('horaires', JSON.stringify(this.form.horaires));
    formData.append('banque', JSON.stringify(this.form.banque));
    if (this.logoFile) formData.append('logo', this.logoFile);

    // TODO: this.fournisseurService.modifierProfil(formData).subscribe(...)

    setTimeout(() => {
      this.isSaving = false;
      this.showToast('Profil mis à jour avec succès.', 'success');
      setTimeout(() => this.router.navigate(['/fournisseur/profil']), 900);
    }, 700);
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