import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MockAuthService } from '../../core/services/mock-auth.service';
import { ROLE_HOME } from '../../core/models/auth-user.model';

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

  constructor(
    private router: Router,
    private authService: MockAuthService
  ) {}

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    this.isLoading = true;

    // Authentification fictive : détecte le rôle puis redirige vers l'espace correspondant.
    this.authService.login(this.email, this.password).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.router.navigateByUrl(ROLE_HOME[user.role]);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Adresse email ou mot de passe incorrect.';
      }
    });
  }
}
