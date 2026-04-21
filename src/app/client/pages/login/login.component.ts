import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  rememberMe = false;

  // Comptes démo (à retirer en prod)
  demoAccounts = [
    { label: 'Admin',  letter: 'A', role: 'admin',  email: 'admin@automecastore.sn',  password: 'Admin123!', color: '#e74c3c' },
    { label: 'Client', letter: 'C', role: 'client', email: 'client@automecastore.sn', password: 'Client123!', color: '#ff5a00' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Si déjà connecté → redirection
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
      return;
    }

    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false]
    });

    // Pré-remplir si email mémorisé
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      this.loginForm.patchValue({ email: savedEmail, remember: true });
    }
  }

  // -------------------------------------------------------
  // Getters
  // -------------------------------------------------------
  get f() { return this.loginForm.controls; }

  get emailInvalid(): boolean {
    return !!(this.f['email'].invalid && this.f['email'].touched);
  }

  get passwordInvalid(): boolean {
    return !!(this.f['password'].invalid && this.f['password'].touched);
  }

  // -------------------------------------------------------
  // Connexion
  // -------------------------------------------------------
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password, remember } = this.loginForm.value;

    // Mémorisation email
    if (remember) {
      localStorage.setItem('remembered_email', email);
    } else {
      localStorage.removeItem('remembered_email');
    }

    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.errorMessage = 'Email ou mot de passe incorrect.';
        } else if (err.status === 0) {
          this.errorMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
        } else {
          this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
        }
      }
    });
  }

  // -------------------------------------------------------
  // Remplissage démo
  // -------------------------------------------------------
  fillDemo(account: { email: string; password: string }): void {
    this.loginForm.patchValue({ email: account.email, password: account.password });
    this.errorMessage = '';
  }
}