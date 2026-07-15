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

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.prenom || !this.form.nom || !this.form.email || !this.form.nom_entreprise || !this.form.password) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
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