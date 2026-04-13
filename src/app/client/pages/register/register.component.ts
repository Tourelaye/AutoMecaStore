import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  step = 1;
  stepError: string | null = null;

  registerForm!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.registerForm = this.fb.group(
      {
        prenom: ['', [Validators.required, Validators.minLength(2)]],
        nom: ['', [Validators.required, Validators.minLength(2)]],
        telephone: [''],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            // min 1 majuscule, 1 minuscule, 1 chiffre
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
          ]
        ],
        confirmPassword: ['', [Validators.required]],
        conditionsAccepted: [false, [Validators.requiredTrue]],
        marketingOptIn: [false]
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  private get f() {
    return {
      prenom: this.registerForm.get('prenom')!,
      nom: this.registerForm.get('nom')!,
      telephone: this.registerForm.get('telephone')!,
      email: this.registerForm.get('email')!,
      password: this.registerForm.get('password')!,
      confirmPassword: this.registerForm.get('confirmPassword')!,
      conditionsAccepted: this.registerForm.get('conditionsAccepted')!,
      marketingOptIn: this.registerForm.get('marketingOptIn')!,
    };
  }

  next(): void {
    this.stepError = null;

    if (this.step === 1) {
      if (!this.isStepValid(1)) {
        this.markStepTouched(1);
        this.stepError = this.getStep1Error();
        return;
      }
    }

    if (this.step === 2) {
      if (!this.isStepValid(2)) {
        this.markStepTouched(2);
        this.stepError = this.getStep2Error();
        return;
      }
    }

    if (this.step < 3) {
      this.step++;
      this.stepError = null;
    }
  }

  prev(): void {
    if (this.step > 1) {
      this.step--;
      this.stepError = null;
    }
  }

  createAccount(): void {
    this.stepError = null;
    this.registerForm.markAllAsTouched();

    if (!this.registerForm.valid) {
      if (this.f.conditionsAccepted.invalid) {
        this.stepError = 'Veuillez accepter les conditions d’utilisation pour continuer.';
        return;
      }
      this.stepError = 'Veuillez corriger les champs invalides avant de créer votre compte.';
      return;
    }

    // TODO: Appel API pour créer le compte.
    // Pour l’instant, on laisse passer quand le formulaire est valide.
    // console.log('Compte prêt à être créé', this.registerForm.value);
  }

  private isStepValid(step: 1 | 2 | 3): boolean {
    if (step === 1) {
      return this.f.prenom.valid && this.f.nom.valid;
    }

    if (step === 2) {
      const passwordsMatch =
        !this.registerForm.errors?.['passwordsMismatch'] &&
        this.f.confirmPassword.valid;

      return (
        this.f.email.valid &&
        this.f.password.valid &&
        passwordsMatch
      );
    }

    return this.f.conditionsAccepted.valid;
  }

  private markStepTouched(step: 1 | 2 | 3): void {
    if (step === 1) {
      this.f.prenom.markAsTouched();
      this.f.nom.markAsTouched();
      return;
    }

    if (step === 2) {
      this.f.email.markAsTouched();
      this.f.password.markAsTouched();
      this.f.confirmPassword.markAsTouched();
      return;
    }

    this.f.conditionsAccepted.markAsTouched();
  }

  private getStep1Error(): string {
    if (this.f.prenom.hasError('required')) return 'Le champ Prénom est obligatoire.';
    if (this.f.prenom.hasError('minlength')) return 'Le Prénom doit contenir au moins 2 caractères.';
    if (this.f.nom.hasError('required')) return 'Le champ Nom est obligatoire.';
    if (this.f.nom.hasError('minlength')) return 'Le Nom doit contenir au moins 2 caractères.';
    return 'Veuillez compléter les informations personnelles.';
  }

  private getStep2Error(): string {
    if (this.f.email.hasError('required')) return 'Le champ Email est obligatoire.';
    if (this.f.email.hasError('email')) return 'Veuillez entrer un email valide.';

    if (this.f.password.hasError('required')) return 'Le champ Mot de passe est obligatoire.';
    if (this.f.password.hasError('pattern')) {
      return 'Mot de passe invalide : 8 caractères minimum, 1 majuscule, 1 minuscule et 1 chiffre.';
    }
    if (this.f.password.hasError('minlength')) return 'Mot de passe trop court (minimum 8 caractères).';

    const passwordsMismatch = this.registerForm.errors?.['passwordsMismatch'];
    if (passwordsMismatch) return 'Les mots de passe ne correspondent pas.';

    if (this.f.confirmPassword.hasError('required')) return 'Veuillez confirmer votre mot de passe.';

    return 'Veuillez corriger les informations de connexion.';
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (!password || !confirmPassword) return null;
    return password === confirmPassword ? null : { passwordsMismatch: true };
  }
}