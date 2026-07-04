import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MockAuthService } from '../../core/services/mock-auth.service';

interface DemoAccount {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  role: string;
  avatar: string;
  type: 'admin' | 'fournisseur';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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

  demoAccounts: DemoAccount[] = [
    {
      email: 'admin@automeca.com', password: 'Admin123@',
      nom: 'Diallo', prenom: 'Ibrahima',
      role: 'Super Admin', avatar: 'IA', type: 'admin',
    },
    {
      email: 'fournisseur@automeca.com', password: 'Fournisseur123@',
      nom: 'Ndiaye', prenom: 'Fatou',
      role: 'Fournisseur', avatar: 'FN', type: 'fournisseur',
    },
  ];

  constructor(
    private router: Router,
    private authService: MockAuthService
  ) {}

  ngOnInit(): void {
    this.generateParticles();

    // ✅ Déjà connecté → redirection immédiate sans clignotement
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
    const emailLower = this.email.trim().toLowerCase();
    this.activeRole =
      emailLower === 'admin@automeca.com'       ? 'admin'       :
      emailLower === 'fournisseur@automeca.com' ? 'fournisseur' : null;
    this.loginStep = 2;
  }

  backStep(): void {
    this.loginStep = 1; this.password = '';
    this.errorMessage = ''; this.activeRole = null; this.successMsg = '';
  }

  onSubmit(): void {
    if (this.isBlocked) return;
    if (this.loginStep === 1) { this.nextStep(); return; }

    this.errorMessage = '';
    this.isLoading    = true;

    this.authService.login(this.email.trim().toLowerCase(), this.password)
      .subscribe({
        next: (user) => {
          this.attempts  = 0;
          this.isLoading = false;
          this.successMsg = `Bienvenue ! Redirection vers votre espace ${user.role}...`;

          if (this.remember) {
            localStorage.setItem('automeca_remember', JSON.stringify({ email: this.email }));
          } else {
            localStorage.removeItem('automeca_remember');
          }

          // ✅ FIX CLIGNOTEMENT :
          // On utilise replaceUrl:true pour éviter que la page login
          // reste dans l'historique et cause des re-renders
          // On supprime aussi le setTimeout — la navigation est immédiate
          // car MockAuthService.login() est synchrone (of())
          const route = this.authService.homeRoute();
          this.router.navigateByUrl(route, { replaceUrl: true });
        },

        error: (err: Error) => {
          this.isLoading = false;
          this.attempts++;
          if (this.attempts >= 3) {
            this.blockAccount();
          } else {
            this.errorMessage = `${err.message} Tentative ${this.attempts}/3.`;
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

  fillDemo(account: DemoAccount): void {
    this.email = account.email; this.activeRole = account.type; this.loginStep = 2;
    setTimeout(() => { this.password = account.password; }, 300);
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