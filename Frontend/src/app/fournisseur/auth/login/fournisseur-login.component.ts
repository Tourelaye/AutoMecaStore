import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-fournisseur-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './fournisseur-login.component.html',
  styleUrls: ['./fournisseur-login.component.css']
})
export class FournisseurLoginComponent implements OnInit {

  email = '';
  password = '';
  showPassword = false;
  rememberMe = false;
  isLoading = false;
  errorMessage = '';

  readonly currentYear = new Date().getFullYear();

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated() && this.authService.isFournisseurValidated()) {
      this.router.navigateByUrl('/fournisseur/dashboard', { replaceUrl: true });
    }
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez saisir votre email et votre mot de passe.';
      return;
    }

    this.isLoading = true;

    this.authService.login(this.email.trim().toLowerCase(), this.password, 'fournisseur')
      .subscribe({
        next: () => {
          this.isLoading = false;
          const role = this.authService.getCurrentUserRole();

          if (role !== 'fournisseur') {
            this.authService.logout();
            this.errorMessage = 'Accès réservé aux fournisseurs.';
            return;
          }

          this.router.navigateByUrl(this.authService.homeRoute(), { replaceUrl: true });
        },
        error: (err: any) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.detail || err?.error?.message || 'Identifiants invalides.';
        }
      });
  }
}