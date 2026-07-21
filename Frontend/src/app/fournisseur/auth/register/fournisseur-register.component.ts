import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-fournisseur-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './fournisseur-register.component.html',
  styleUrls: ['./fournisseur-register.component.css']
})
export class FournisseurRegisterComponent {

  form = {
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    nom_entreprise: '',
    siret: '',
    description: '',
    password: '',
    confirmPassword: ''
  };

  selectedPrefix = '+221';
  phoneLocal = '';
  phoneError = '';

  readonly phonePrefixes = [
    { code: '+221', label: '+221 Sénégal', localLength: 9, pattern: /^(70|75|76|77|78)\d{7}$/ },
    { code: '+33', label: '+33 France', localLength: 9, pattern: /^[1-9]\d{8}$/ },
    { code: '+225', label: '+225 Côte d\'Ivoire', localLength: 10, pattern: /^\d{10}$/ },
    { code: '+212', label: '+212 Maroc', localLength: 9, pattern: /^\d{9}$/ },
    { code: '+213', label: '+213 Algérie', localLength: 9, pattern: /^\d{9}$/ },
    { code: '+216', label: '+216 Tunisie', localLength: 8, pattern: /^\d{8}$/ },
    { code: '+32', label: '+32 Belgique', localLength: 9, pattern: /^\d{9}$/ },
    { code: '+86', label: '+86 Chine', localLength: 11, pattern: /^1\d{10}$/ }
  ];

  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  readonly currentYear = new Date().getFullYear();

  // Indicateur de force du mot de passe (0 à 4)
  passwordStrength = 0;
  strengthLabel = '';
  strengthColor: 'red' | 'orange' | 'green' = 'red';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  onPasswordChange(): void {
    const value = this.form.password || '';
    let score = 0;

    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    this.passwordStrength = score;

    if (score <= 1) {
      this.strengthLabel = 'Faible';
      this.strengthColor = 'red';
    } else if (score <= 2) {
      this.strengthLabel = 'Moyen';
      this.strengthColor = 'orange';
    } else if (score === 3) {
      this.strengthLabel = 'Bon';
      this.strengthColor = 'orange';
    } else {
      this.strengthLabel = 'Excellent';
      this.strengthColor = 'green';
    }
  }

  get passwordsMatch(): boolean {
    return this.form.password === this.form.confirmPassword;
  }

  get phonePlaceholder(): string {
    const prefix = this.phonePrefixes.find(p => p.code === this.selectedPrefix);
    if (this.selectedPrefix === '+221') return '77 000 00 00';
    if (this.selectedPrefix === '+33') return '6 00 00 00 00';
    return '0'.repeat(prefix?.localLength || 9);
  }

  get formattedPhone(): string {
    return this.formatPhoneLocal(this.phoneLocal);
  }

  get fullPhone(): string {
    return this.selectedPrefix + this.phoneLocal;
  }

  onPrefixChange(): void {
    this.validatePhone();
  }

  onPhoneInput(value: string): void {
    const digits = (value || '').replace(/\D/g, '');
    const prefix = this.phonePrefixes.find(p => p.code === this.selectedPrefix);
    this.phoneLocal = prefix && digits.length > prefix.localLength ? digits.slice(0, prefix.localLength) : digits;
    this.validatePhone();
  }

  private formatPhoneLocal(digits: string): string {
    if (!digits) return '';
    if (this.selectedPrefix === '+221' && digits.length <= 9) {
      const parts = [
        digits.slice(0, 2),
        digits.slice(2, 5),
        digits.slice(5, 7),
        digits.slice(7, 9)
      ].filter(part => part.length > 0);
      return parts.join(' ');
    }
    // Group other numbers by 2
    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 2) {
      parts.push(digits.slice(i, i + 2));
    }
    return parts.join(' ');
  }

  validatePhone(): boolean {
    this.phoneError = '';
    if (!this.phoneLocal) {
      this.phoneError = 'Le numéro de téléphone est obligatoire.';
      return false;
    }
    const prefix = this.phonePrefixes.find(p => p.code === this.selectedPrefix);
    if (prefix && this.phoneLocal.length !== prefix.localLength) {
      this.phoneError = `Le numéro doit comporter ${prefix.localLength} chiffres pour ${this.selectedPrefix}.`;
      return false;
    }
    if (prefix && !prefix.pattern.test(this.phoneLocal)) {
      this.phoneError = 'Le format du numéro ne correspond pas au pays sélectionné.';
      return false;
    }
    return true;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.prenom || !this.form.nom || !this.form.email || !this.form.nom_entreprise || !this.form.password) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    if (!this.validatePhone()) {
      this.errorMessage = this.phoneError;
      return;
    }

    if (this.form.password.length < 8) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }

    if (this.form.password !== this.form.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (!this.form.email.includes('@') || !this.form.email.includes('.')) {
      this.errorMessage = 'Veuillez saisir un email valide.';
      return;
    }

    this.isLoading = true;

    this.form.telephone = this.fullPhone;
    const data = { ...this.form };
    delete (data as any).confirmPassword;

    this.authService.registerFournisseur(data).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Inscription réussie. Votre compte sera examiné par un administrateur avant activation.';
        setTimeout(() => {
          this.router.navigateByUrl('/fournisseur/login');
        }, 2500);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.detail || err?.error?.message || 'Une erreur est survenue lors de l\'inscription.';
        if (err?.error && typeof err.error === 'object') {
          const messages = Object.values(err.error).flat().filter(Boolean);
          if (messages.length) {
            this.errorMessage = messages.join(' / ');
          }
        }
      }
    });
  }
}