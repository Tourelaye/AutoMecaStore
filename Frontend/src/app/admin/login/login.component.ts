import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {

  email    = '';
  password = '';
  remember = false;

  showPassword     = false;
  isLoading        = false;
  loginStep        = 1;
  capsLock         = false;
  passwordStrength = 0;
  activeRole: 'admin' | 'fournisseur' | null = null;

  errorMessage   = '';
  successMsg     = '';
  attempts       = 0;
  isBlocked      = false;
  blockCountdown = 0;
  private blockTimer: any;

  particles: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.generateParticles();

    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.authService.homeRoute());
      return;
    }

    const saved = localStorage.getItem('automeca_remember');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.email    = data.email || '';
        this.remember = true;
      } catch { /* ignore */ }
    }
  }

  ngOnDestroy(): void {
    if (this.blockTimer) clearInterval(this.blockTimer);
  }

  generateParticles(): void {
    this.particles = Array.from({ length: 18 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 3 + 1, speed: Math.random() * 20 + 10,
      opacity: Math.random() * 0.4 + 0.1,
    }));
  }

  nextStep(): void {
    if (!this.email || !this.email.includes('@')) {
      this.errorMessage = 'Veuillez saisir une adresse email valide.';
      return;
    }
    this.errorMessage = '';
    this.loginStep = 2;
  }

  backStep(): void {
    this.loginStep = 1; this.password = '';
    this.errorMessage = ''; this.activeRole = null; this.successMsg = '';
  }

  onSubmit(): void {
    if (this.isBlocked) return;

    this.errorMessage = '';
    this.successMsg   = '';

    if (!this.email || !this.email.includes('@') || !this.email.includes('.')) {
      this.errorMessage = 'Veuillez saisir une adresse email valide.';
      return;
    }
    if (!this.password) {
      this.errorMessage = 'Veuillez saisir votre mot de passe.';
      return;
    }

    this.isLoading = true;

    this.authService.login(this.email.trim().toLowerCase(), this.password, 'admin')
      .subscribe({
        next: () => {
          this.attempts  = 0;
          this.isLoading = false;
          const role = this.authService.getCurrentUserRole();
          const user = this.authService.getCurrentUser();

          if (role !== 'admin' || !user?.is_staff) {
            this.authService.logout();
            this.errorMessage = 'Accès réservé aux administrateurs.';
            return;
          }

          this.successMsg = 'Bienvenue ! Redirection vers l\'espace admin...';

          if (this.remember) {
            localStorage.setItem('automeca_remember', JSON.stringify({ email: this.email }));
          } else {
            localStorage.removeItem('automeca_remember');
          }

          this.router.navigateByUrl('/admin/dashboard', { replaceUrl: true });
        },

        error: (err: any) => {
          this.isLoading = false;
          this.attempts++;
          let msg = err?.error?.detail || err?.error?.message || err?.message || 'Identifiants invalides.';
          if (typeof msg === 'string' && msg.startsWith('Http failure response')) {
            msg = 'Identifiants invalides.';
          }
          if (this.attempts >= 3) {
            this.blockAccount();
          } else {
            this.errorMessage = `${msg} Tentative ${this.attempts}/3.`;
          }
        }
      });
  }

  blockAccount(): void {
    this.isBlocked = true; this.blockCountdown = 30; this.errorMessage = '';
    this.blockTimer = setInterval(() => {
      this.blockCountdown--;
      if (this.blockCountdown <= 0) {
        clearInterval(this.blockTimer);
        this.isBlocked = false; this.attempts = 0;
      }
    }, 1000);
  }

  onKeyDown(event: KeyboardEvent): void {
    this.capsLock = event.getModifierState?.('CapsLock') ?? false;
  }

  calcStrength(): void {
    const p = this.password; let s = 0;
    if (p.length >= 8) s++; if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    this.passwordStrength = s;
  }

  get strengthLabel(): string { return ['','Faible','Moyen','Bon','Fort'][this.passwordStrength]; }
  get strengthColor(): string { return ['','#ef4444','#f97316','#eab308','#22c55e'][this.passwordStrength]; }
  get emailValid(): boolean   { return this.email.includes('@') && this.email.includes('.'); }
  get roleLabel(): string {
    if (this.activeRole === 'admin') return 'Administrateur';
    if (this.activeRole === 'fournisseur') return 'Fournisseur';
    return '';
  }
}