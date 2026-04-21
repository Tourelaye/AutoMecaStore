import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  step = 1;
  stepError: string | null = null;
  isLoading = false;
  accountCreated = false;

  // Visibilité mots de passe
  showPassword = false;
  showConfirm  = false;

  registerForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group(
      {
        prenom:             ['', [Validators.required, Validators.minLength(2)]],
        nom:                ['', [Validators.required, Validators.minLength(2)]],
        telephone:          [''],
        email:              ['', [Validators.required, Validators.email]],
        password:           ['', [Validators.required, Validators.minLength(8),
                              Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)]],
        confirmPassword:    ['', [Validators.required]],
        conditionsAccepted: [false, [Validators.requiredTrue]],
        marketingOptIn:     [false]
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  private get f() {
    return {
      prenom:             this.registerForm.get('prenom')!,
      nom:                this.registerForm.get('nom')!,
      telephone:          this.registerForm.get('telephone')!,
      email:              this.registerForm.get('email')!,
      password:           this.registerForm.get('password')!,
      confirmPassword:    this.registerForm.get('confirmPassword')!,
      conditionsAccepted: this.registerForm.get('conditionsAccepted')!,
      marketingOptIn:     this.registerForm.get('marketingOptIn')!,
    };
  }

  // -------------------------------------------------------
  // Force du mot de passe (0-4)
  // -------------------------------------------------------
  get passwordStrength(): number {
    const pwd = this.f.password.value as string;
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8)            score++;
    if (/[A-Z]/.test(pwd))          score++;
    if (/[a-z]/.test(pwd))          score++;
    if (/\d/.test(pwd))             score++;
    if (/[^a-zA-Z0-9]/.test(pwd))  score++;
    return Math.min(score, 4);
  }

  get passwordStrengthLabel(): string {
    return ['', 'Faible', 'Moyen', 'Bon', 'Fort'][this.passwordStrength];
  }

  get passwordStrengthClass(): string {
    return ['', 'weak', 'medium', 'good', 'strong'][this.passwordStrength];
  }

  // -------------------------------------------------------
  // Navigation stepper
  // -------------------------------------------------------
  next(): void {
    this.stepError = null;
    if (this.step === 1 && !this.isStepValid(1)) {
      this.markStepTouched(1);
      this.stepError = this.getStep1Error();
      return;
    }
    if (this.step === 2 && !this.isStepValid(2)) {
      this.markStepTouched(2);
      this.stepError = this.getStep2Error();
      return;
    }
    if (this.step < 3) { this.step++; this.stepError = null; }
  }

  prev(): void {
    if (this.step > 1) { this.step--; this.stepError = null; }
  }

  createAccount(): void {
    this.stepError = null;
    this.registerForm.markAllAsTouched();
    if (!this.registerForm.valid) {
      if (this.f.conditionsAccepted.invalid) {
        this.stepError = 'Veuillez accepter les conditions d\'utilisation.';
        return;
      }
      this.stepError = 'Veuillez corriger les champs invalides.';
      return;
    }

    this.isLoading = true;
    
    // Données envoyées pour debug
    const registerData = this.registerForm.value;
    console.log('Tentative d\'inscription avec:', registerData);
    
    // Appel API pour l'inscription
    this.authService.register(registerData).subscribe({
      next: (response) => {
        console.log('Inscription réussie:', response);
        // Après inscription réussie, connecter automatiquement l'utilisateur
        this.authService.login(this.f.email.value, this.f.password.value).subscribe({
          next: () => {
            console.log('Connexion automatique réussie');
            this.isLoading = false;
            this.accountCreated = true;
            // Rediriger vers la page d'accueil après 2 secondes
            setTimeout(() => {
              this.router.navigate(['/']);
            }, 2000);
          },
          error: (err) => {
            console.error('Erreur login auto:', err);
            this.isLoading = false;
            this.stepError = 'Compte créé mais erreur lors de la connexion automatique. Veuillez vous connecter manuellement.';
          }
        });
      },
      error: (err) => {
        console.error('Erreur inscription complète:', err);
        this.isLoading = false;
        
        // Messages d'erreur plus spécifiques
        if (err.status === 0) {
          this.stepError = 'Impossible de contacter le serveur. Vérifiez que le backend est démarré sur http://127.0.0.1:8000';
        } else if (err.status === 400) {
          this.stepError = 'Données invalides: ' + (err.error?.detail || JSON.stringify(err.error));
        } else if (err.status === 409) {
          this.stepError = 'Cet email est déjà utilisé. Veuillez vous connecter.';
        } else {
          this.stepError = `Erreur serveur (${err.status}): ${err.error?.detail || 'Veuillez réessayer plus tard.'}`;
        }
      }
    });
  }

  // -------------------------------------------------------
  // Getters template
  // -------------------------------------------------------
  get prenomVal(): string  { return this.f.prenom.value ?? ''; }
  get nomVal(): string     { return this.f.nom.value ?? ''; }
  get emailVal(): string   { return this.f.email.value ?? ''; }

  // -------------------------------------------------------
  // Validation interne
  // -------------------------------------------------------
  private isStepValid(step: 1 | 2 | 3): boolean {
    if (step === 1) return this.f.prenom.valid && this.f.nom.valid;
    if (step === 2) {
      return this.f.email.valid &&
             this.f.password.valid &&
             this.f.confirmPassword.valid &&
             !this.registerForm.errors?.['passwordsMismatch'];
    }
    return this.f.conditionsAccepted.valid;
  }

  private markStepTouched(step: 1 | 2 | 3): void {
    if (step === 1) { this.f.prenom.markAsTouched(); this.f.nom.markAsTouched(); return; }
    if (step === 2) { this.f.email.markAsTouched(); this.f.password.markAsTouched(); this.f.confirmPassword.markAsTouched(); return; }
    this.f.conditionsAccepted.markAsTouched();
  }

  private getStep1Error(): string {
    if (this.f.prenom.hasError('required'))   return 'Le Prénom est obligatoire.';
    if (this.f.prenom.hasError('minlength'))  return 'Le Prénom doit contenir au moins 2 caractères.';
    if (this.f.nom.hasError('required'))      return 'Le Nom est obligatoire.';
    if (this.f.nom.hasError('minlength'))     return 'Le Nom doit contenir au moins 2 caractères.';
    return 'Veuillez compléter vos informations personnelles.';
  }

  private getStep2Error(): string {
    if (this.f.email.hasError('required'))   return 'L\'email est obligatoire.';
    if (this.f.email.hasError('email'))      return 'Veuillez entrer un email valide.';
    if (this.f.password.hasError('required'))return 'Le mot de passe est obligatoire.';
    if (this.f.password.hasError('pattern')) return 'Mot de passe : 8 car. min, 1 majuscule, 1 minuscule, 1 chiffre.';
    if (this.registerForm.errors?.['passwordsMismatch']) return 'Les mots de passe ne correspondent pas.';
    return 'Veuillez corriger les informations de connexion.';
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const p  = group.get('password')?.value;
    const cp = group.get('confirmPassword')?.value;
    if (!p || !cp) return null;
    return p === cp ? null : { passwordsMismatch: true };
  }
}