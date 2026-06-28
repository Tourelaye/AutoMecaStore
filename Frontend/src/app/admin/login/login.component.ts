import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface AdminAccount {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  role: string;
  avatar: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  email    = '';
  password = '';

  showPassword = false;
  isLoading    = false;
  errorMessage = '';
  loginAttempts = 0;

  // Comptes admin autorisés (pour affichage et démo seulement)
  private readonly ADMIN_EMAILS = ['admin@automeca.com'];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  // -------------------------------------------------------
  // Connexion
  // -------------------------------------------------------
  onSubmit(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    if (this.loginAttempts >= 5) {
      this.errorMessage = 'Trop de tentatives. Compte temporairement bloqué.';
      return;
    }

    this.isLoading = true;

    // Appel API réel pour l'authentification
    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        // Vérifie si l'utilisateur a le rôle admin
        const user = this.authService.getUtilisateur();
        const isAdmin = user?.role === 'administrateur' || user?.role === 'gestionnaire';

        if (!isAdmin) {
          this.authService.logout();
          this.errorMessage = 'Accès réservé aux administrateurs.';
          this.isLoading = false;
          return;
        }

        // Stocke aussi les infos admin pour l'affichage
        localStorage.setItem('admin_user', JSON.stringify({
          email:  user?.email,
          nom:    user?.nom,
          prenom: user?.prenom,
          role:   user?.role,
          avatar: 'ID'
        }));

        this.loginAttempts = 0;
        this.router.navigate(['/admin/dashboard']);
        this.isLoading = false;
      },
      error: (err) => {
        this.loginAttempts++;
        this.errorMessage = err.error?.detail || `Email ou mot de passe incorrect. (${5 - this.loginAttempts} tentative${5 - this.loginAttempts > 1 ? 's' : ''} restante${5 - this.loginAttempts > 1 ? 's' : ''})`;
        this.isLoading = false;
      }
    });
  }

  // -------------------------------------------------------
  // Remplissage rapide (démo)
  // -------------------------------------------------------
  fillDemo(account: AdminAccount): void {
    this.email    = account.email;
    this.password = account.password;
    this.errorMessage = '';
  }
}