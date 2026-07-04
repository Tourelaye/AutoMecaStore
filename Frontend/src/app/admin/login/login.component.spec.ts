import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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

  // ---- Form fields ----
  email    = '';
  password = '';
  remember = false;

  // ---- UI state ----
  showPassword  = false;
  isLoading     = false;
  loginStep     = 1;          // 1 = email, 2 = password
  capsLock      = false;
  passwordStrength = 0;       // 0-4
  activeRole: 'admin' | 'fournisseur' | null = null;

  // ---- Alerts ----
  errorMessage  = '';
  successMsg    = '';
  attempts      = 0;
  isBlocked     = false;
  blockCountdown = 0;
  private blockTimer: any;

  // ---- Particles ----
  particles: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];

  // ---- Comptes démo ----
  demoAccounts: DemoAccount[] = [
    {
      email: 'admin@automeca.com',
      password: 'Admin@2025!',
      nom: 'Diallo', prenom: 'Ibrahima',
      role: 'Super Admin', avatar: 'IA',
      type: 'admin',
    },
    {
      email: 'fournisseur@automeca.com',
      password: 'Fourn@2025!',
      nom: 'Ndiaye', prenom: 'Fatou',
      role: 'Fournisseur', avatar: 'FN',
      type: 'fournisseur',
    },
  ];

  // ---- Comptes valides (mock) ----
  private validAccounts = [
    { email: 'admin@automeca.com',       password: 'Admin@2025!',  role: 'admin'       },
    { email: 'fournisseur@automeca.com', password: 'Fourn@2025!',  role: 'fournisseur' },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.generateParticles();
    const saved = localStorage.getItem('automeca_remember');
    if (saved) {
      const data = JSON.parse(saved);
      this.email    = data.email || '';
      this.remember = true;
    }
  }

  ngOnDestroy(): void {
    if (this.blockTimer) clearInterval(this.blockTimer);
  }

  // ---- Particules flottantes ----
  generateParticles(): void {
    this.particles = Array.from({ length: 18 }, () => ({
      x:       Math.random() * 100,
      y:       Math.random() * 100,
      size:    Math.random() * 3 + 1,
      speed:   Math.random() * 20 + 10,
      opacity: Math.random() * 0.4 + 0.1,
    }));
  }

  // ---- Étape 1 → 2 ----
  nextStep(): void {
    if (!this.email || !this.email.includes('@')) {
      this.errorMessage = 'Veuillez saisir une adresse email valide.';
      return;
    }
    this.errorMessage = '';
    // Détection auto du rôle
    const found = this.validAccounts.find(a => a.email === this.email);
    this.activeRole = found ? (found.role as 'admin' | 'fournisseur') : null;
    this.loginStep = 2;
  }

  backStep(): void {
    this.loginStep   = 1;
    this.password    = '';
    this.errorMessage = '';
    this.activeRole  = null;
  }

  // ---- Soumission ----
  onSubmit(): void {
    if (this.isBlocked) return;
    if (this.loginStep === 1) { this.nextStep(); return; }

    this.errorMessage = '';
    this.isLoading    = true;

    setTimeout(() => {
      const account = this.validAccounts.find(
        a => a.email === this.email && a.password === this.password
      );

      if (account) {
        this.attempts = 0;
        this.successMsg = 'Connexion réussie ! Redirection...';

        if (this.remember) {
          localStorage.setItem('automeca_remember', JSON.stringify({ email: this.email }));
        } else {
          localStorage.removeItem('automeca_remember');
        }

        setTimeout(() => {
          if (account.role === 'admin') {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate(['/fournisseur/dashboard']);
          }
        }, 1200);
      } else {
        this.attempts++;
        this.isLoading = false;
        if (this.attempts >= 3) {
          this.blockAccount();
        } else {
          this.errorMessage = `Identifiants incorrects. Tentative ${this.attempts}/3.`;
        }
      }

      if (account) this.isLoading = false;
    }, 1400);
  }

  // ---- Blocage temporaire ----
  blockAccount(): void {
    this.isBlocked      = true;
    this.blockCountdown = 30;
    this.errorMessage   = '';
    this.blockTimer = setInterval(() => {
      this.blockCountdown--;
      if (this.blockCountdown <= 0) {
        clearInterval(this.blockTimer);
        this.isBlocked = false;
        this.attempts  = 0;
      }
    }, 1000);
  }

  // ---- Remplir démo ----
  fillDemo(account: DemoAccount): void {
    this.email      = account.email;
    this.activeRole = account.type;
    this.loginStep  = 2;
    setTimeout(() => { this.password = account.password; }, 300);
  }

  // ---- Caps Lock ----
  onKeyDown(event: KeyboardEvent): void {
    this.capsLock = event.getModifierState?.('CapsLock') ?? false;
  }

  // ---- Force du mot de passe ----
  calcStrength(): void {
    const p = this.password;
    let s = 0;
    if (p.length >= 8)              s++;
    if (/[A-Z]/.test(p))           s++;
    if (/[0-9]/.test(p))           s++;
    if (/[^A-Za-z0-9]/.test(p))    s++;
    this.passwordStrength = s;
  }

  get strengthLabel(): string {
    return ['', 'Faible', 'Moyen', 'Bon', 'Fort'][this.passwordStrength];
  }

  get strengthColor(): string {
    return ['', '#ef4444', '#f97316', '#eab308', '#22c55e'][this.passwordStrength];
  }

  // ---- Email valide ----
  get emailValid(): boolean {
    return this.email.includes('@') && this.email.includes('.');
  }

  // ---- Role label ----
  get roleLabel(): string {
    if (this.activeRole === 'admin')       return 'Administrateur';
    if (this.activeRole === 'fournisseur') return 'Fournisseur';
    return '';
  }
}