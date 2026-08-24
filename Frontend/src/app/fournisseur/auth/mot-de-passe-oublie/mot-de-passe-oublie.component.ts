import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-fournisseur-mot-de-passe-oublie',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mot-de-passe-oublie.component.html',
  styleUrls: ['./mot-de-passe-oublie.component.css']
})
export class FournisseurMotDePasseOublieComponent {

  step: 1 | 2 | 3 = 1;
  email = '';
  code = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  readonly currentYear = new Date().getFullYear();

  private apiUrl = 'http://127.0.0.1:8000/account';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  sendResetCode(): void {
    this.errorMessage = '';
    if (!this.email.trim()) {
      this.errorMessage = 'Veuillez saisir votre adresse email.';
      return;
    }

    this.isLoading = true;
    this.http.post(`${this.apiUrl}/password-reset/request/`, { email: this.email.trim().toLowerCase() })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.step = 2;
          this.successMessage = '';
        },
        error: () => {
          this.isLoading = false;
          // On passe quand même à l'étape 2 pour ne pas divulguer si l'email existe.
          this.step = 2;
        }
      });
  }

  resetPassword(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.code.trim()) {
      this.errorMessage = 'Veuillez saisir le code reçu par email.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.isLoading = true;
    this.http.post(`${this.apiUrl}/password-reset/confirm/`, {
      email: this.email.trim().toLowerCase(),
      code: this.code.trim(),
      new_password: this.newPassword
    }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.step = 3;
        this.successMessage = res.message || 'Mot de passe réinitialisé avec succès.';
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.error || 'Une erreur est survenue.';
      }
    });
  }

  backToLogin(): void {
    this.router.navigateByUrl('/fournisseur/login');
  }

  backToStep1(): void {
    this.step = 1;
    this.code = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.errorMessage = '';
  }
}
