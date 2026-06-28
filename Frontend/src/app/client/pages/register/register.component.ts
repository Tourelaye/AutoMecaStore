import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  pattern: RegExp;
  minLength: number;
  maxLength: number;
  example: string;
}

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

  // Phone input
  selectedCountry: Country;
  countries: Country[] = [
    {
      code: 'intl',
      name: 'International (Autre)',
      dialCode: '+',
      flag: '🌍',
      pattern: /^\d+$/,
      minLength: 8,
      maxLength: 15,
      example: 'Votre numéro international'
    },
    {
      code: 'sn',
      name: 'Sénégal',
      dialCode: '+221',
      flag: '🇸🇳',
      pattern: /^77|78|76|70|75/,
      minLength: 9,
      maxLength: 9,
      example: '77 123 45 67'
    },
    {
      code: 'fr',
      name: 'France',
      dialCode: '+33',
      flag: '🇫🇷',
      pattern: /^[67]/,
      minLength: 9,
      maxLength: 9,
      example: '6 12 34 56 78'
    },
    {
      code: 'ci',
      name: 'Côte d\'Ivoire',
      dialCode: '+225',
      flag: '🇨🇮',
      pattern: /^07|05|01/,
      minLength: 10,
      maxLength: 10,
      example: '07 01 02 03 04'
    },
    {
      code: 'us',
      name: 'États-Unis',
      dialCode: '+1',
      flag: '🇺🇸',
      pattern: /^[2-9]/,
      minLength: 10,
      maxLength: 10,
      example: '555 123 4567'
    },
    {
      code: 'ml',
      name: 'Mali',
      dialCode: '+223',
      flag: '🇲🇱',
      pattern: /^[2-9]/,
      minLength: 8,
      maxLength: 8,
      example: '20 21 22 23'
    },
    {
      code: 'bf',
      name: 'Burkina Faso',
      dialCode: '+226',
      flag: '🇧🇫',
      pattern: /^[67]/,
      minLength: 8,
      maxLength: 8,
      example: '70 01 02 03'
    },
    {
      code: 'ne',
      name: 'Niger',
      dialCode: '+227',
      flag: '🇳🇪',
      pattern: /^[89]/,
      minLength: 8,
      maxLength: 8,
      example: '90 01 02 03'
    },
    {
      code: 'gh',
      name: 'Ghana',
      dialCode: '+233',
      flag: '🇬🇭',
      pattern: /^[2-5]/,
      minLength: 9,
      maxLength: 9,
      example: '20 123 4567'
    },
    {
      code: 'ng',
      name: 'Nigeria',
      dialCode: '+234',
      flag: '🇳🇬',
      pattern: /^[78]/,
      minLength: 10,
      maxLength: 10,
      example: '801 234 5678'
    },
    {
      code: 'cm',
      name: 'Cameroun',
      dialCode: '+237',
      flag: '🇨🇲',
      pattern: /^[67]/,
      minLength: 9,
      maxLength: 9,
      example: '6 12 34 56 78'
    }
  ];

  countryDropdownOpen = false;

  registerForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Default to International option - user can select specific country
    this.selectedCountry = this.countries[0];
    
    this.registerForm = this.fb.group(
      {
        prenom:             ['', [Validators.required, Validators.minLength(2)]],
        nom:                ['', [Validators.required, Validators.minLength(2)]],
        telephone:          ['', [Validators.required, this.phoneValidator()]],
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
    
    // Prepare registration data with full phone number
    const registerData = {
      ...this.registerForm.value,
      telephone: this.getFullPhoneNumber(), // Send full international format
      country: this.selectedCountry.code, // Send country code
      dialCode: this.selectedCountry.dialCode // Send dial code separately
    };
    
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
    if (step === 1) return this.f.prenom.valid && this.f.nom.valid && this.f.telephone.valid;
    if (step === 2) {
      return this.f.email.valid &&
             this.f.password.valid &&
             this.f.confirmPassword.valid &&
             !this.registerForm.errors?.['passwordsMismatch'];
    }
    return this.f.conditionsAccepted.valid;
  }

  private markStepTouched(step: 1 | 2 | 3): void {
    if (step === 1) { this.f.prenom.markAsTouched(); this.f.nom.markAsTouched(); this.f.telephone.markAsTouched(); return; }
    if (step === 2) { this.f.email.markAsTouched(); this.f.password.markAsTouched(); this.f.confirmPassword.markAsTouched(); return; }
    this.f.conditionsAccepted.markAsTouched();
  }

  private getStep1Error(): string {
    if (this.f.prenom.hasError('required'))   return 'Le Prénom est obligatoire.';
    if (this.f.prenom.hasError('minlength'))  return 'Le Prénom doit contenir au moins 2 caractères.';
    if (this.f.nom.hasError('required'))      return 'Le Nom est obligatoire.';
    if (this.f.nom.hasError('minlength'))     return 'Le Nom doit contenir au moins 2 caractères.';
    if (this.f.telephone.hasError('required')) return 'Le numéro de téléphone est requis.';
    if (this.f.telephone.hasError('phoneTooShort')) return `Numéro trop court (minimum ${this.selectedCountry.minLength} chiffres)`;
    if (this.f.telephone.hasError('phoneTooLong')) return `Numéro trop long (maximum ${this.selectedCountry.maxLength} chiffres)`;
    if (this.f.telephone.hasError('phoneInvalidPattern')) return `Numéro invalide pour ${this.selectedCountry.name}. Format: ${this.selectedCountry.example}`;
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

  // Phone validator based on selected country
  private phoneValidator(): Validators {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      // Remove all non-digit characters
      const digits = value.replace(/\D/g, '');
      
      // For International option, be more flexible
      if (this.selectedCountry.code === 'intl') {
        // Just check if it's a reasonable length for international numbers
        if (digits.length < 8) {
          return { phoneTooShort: true };
        }
        if (digits.length > 15) {
          return { phoneTooLong: true };
        }
        // No pattern check for international - just digits
        return null;
      }
      
      // For specific countries, use strict validation
      // Check length
      if (digits.length < this.selectedCountry.minLength) {
        return { phoneTooShort: true };
      }
      if (digits.length > this.selectedCountry.maxLength) {
        return { phoneTooLong: true };
      }

      // Check pattern
      if (!this.selectedCountry.pattern.test(digits)) {
        return { phoneInvalidPattern: true };
      }

      return null;
    };
  }

  // Country change handler
  onCountryChange(country: Country): void {
    this.selectedCountry = country;
    this.countryDropdownOpen = false;
    
    // Re-validate phone field when country changes
    const phoneControl = this.registerForm.get('telephone');
    if (phoneControl && phoneControl.value) {
      phoneControl.updateValueAndValidity();
    }
  }

  // Phone input handler for formatting
  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove all non-digits

    // Format based on country
    if (this.selectedCountry.code === 'intl') {
      // International: no specific formatting, just add spaces for readability
      value = value.replace(/(\d{3})(?=\d)/g, '$1 ');
    } else if (this.selectedCountry.code === 'sn') {
      // Senegal: 77 123 45 67
      if (value.length > 2) value = value.slice(0, 2) + ' ' + value.slice(2);
      if (value.length > 5) value = value.slice(0, 5) + ' ' + value.slice(5);
      if (value.length > 8) value = value.slice(0, 8) + ' ' + value.slice(8);
    } else if (this.selectedCountry.code === 'fr') {
      // France: 6 12 34 56 78
      if (value.length > 1) value = value.slice(0, 1) + ' ' + value.slice(1);
      if (value.length > 4) value = value.slice(0, 4) + ' ' + value.slice(4);
      if (value.length > 7) value = value.slice(0, 7) + ' ' + value.slice(7);
    } else if (this.selectedCountry.code === 'ci') {
      // Côte d'Ivoire: 07 01 02 03 04
      if (value.length > 2) value = value.slice(0, 2) + ' ' + value.slice(2);
      if (value.length > 5) value = value.slice(0, 5) + ' ' + value.slice(5);
      if (value.length > 8) value = value.slice(0, 8) + ' ' + value.slice(8);
    } else if (this.selectedCountry.code === 'us') {
      // USA: 555 123 4567
      if (value.length > 3) value = value.slice(0, 3) + ' ' + value.slice(3);
      if (value.length > 7) value = value.slice(0, 7) + ' ' + value.slice(7);
    } else {
      // Default: add space every 3 digits
      value = value.replace(/(\d{3})(?=\d)/g, '$1 ');
    }

    input.value = value;
  }

  // Get phone error message
  getPhoneErrorMessage(): string {
    const phoneControl = this.registerForm.get('telephone');
    if (!phoneControl) return '';

    if (phoneControl.hasError('required')) {
      return 'Le numéro de téléphone est requis';
    }
    if (phoneControl.hasError('phoneTooShort')) {
      if (this.selectedCountry.code === 'intl') {
        return 'Numéro trop court (minimum 8 chiffres)';
      }
      return `Numéro trop court (minimum ${this.selectedCountry.minLength} chiffres)`;
    }
    if (phoneControl.hasError('phoneTooLong')) {
      if (this.selectedCountry.code === 'intl') {
        return 'Numéro trop long (maximum 15 chiffres)';
      }
      return `Numéro trop long (maximum ${this.selectedCountry.maxLength} chiffres)`;
    }
    if (phoneControl.hasError('phoneInvalidPattern')) {
      if (this.selectedCountry.code === 'intl') {
        return 'Numéro invalide. Entrez uniquement des chiffres.';
      }
      return `Numéro invalide pour ${this.selectedCountry.name}. Format: ${this.selectedCountry.example}`;
    }

    return 'Numéro invalide';
  }

  // Toggle country dropdown
  toggleCountryDropdown(): void {
    this.countryDropdownOpen = !this.countryDropdownOpen;
  }

  // Get full phone number with country code
  getFullPhoneNumber(): string {
    const phoneControl = this.registerForm.get('telephone');
    if (!phoneControl || !phoneControl.value) return '';
    
    const digits = phoneControl.value.replace(/\D/g, '');
    
    // For International option, user should include country code in the number
    if (this.selectedCountry.code === 'intl') {
      // If user didn't include country code, just use the digits
      // Otherwise, keep what they typed (they should include +country_code)
      const value = phoneControl.value.trim();
      if (value.startsWith('+')) {
        return value.replace(/\D/g, ''); // Return just the digits with + added later
      }
      return '+' + digits;
    }
    
    return this.selectedCountry.dialCode + digits;
  }

  // Filter countries for search
  filteredCountries: Country[] = [];
  countrySearchQuery = '';

  filterCountries(query: string): void {
    this.countrySearchQuery = query.toLowerCase();
    this.filteredCountries = this.countries.filter(country =>
      country.name.toLowerCase().includes(this.countrySearchQuery) ||
      country.code.toLowerCase().includes(this.countrySearchQuery) ||
      country.dialCode.includes(this.countrySearchQuery)
    );
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.phone-input-wrapper');
    if (dropdown && !dropdown.contains(target)) {
      this.countryDropdownOpen = false;
    }
  }
}