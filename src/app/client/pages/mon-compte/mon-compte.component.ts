import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService, Utilisateur } from '../../../core/services/auth.service';

type OngletType = 'profil' | 'securite' | 'confidentialite' | 'commandes' | 'favoris';

@Component({
  selector: 'app-mon-compte',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule],
  templateUrl: './mon-compte.component.html',
  styleUrls: ['./mon-compte.component.css']
})
export class MonCompteComponent implements OnInit, OnDestroy {

  utilisateur: Utilisateur | null = null;
  ongletActif: OngletType = 'profil';

  // Formulaire profil
  profilForm!: FormGroup;
  profilSaving = false;
  profilSuccess = false;
  profilError = '';

  // Formulaire sécurité
  securiteForm!: FormGroup;
  securiteSaving = false;
  securiteSuccess = false;
  securiteError = '';
  showCurrentPwd = false;
  showNewPwd     = false;
  showConfirmPwd = false;

  // Confidentialité
  notifEmail    = true;
  notifSms      = false;
  notifPromo    = true;
  partageData   = false;
  confidSuccess = false;

  private sub!: Subscription;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.sub = this.authService.utilisateur$.subscribe(u => {
      this.utilisateur = u;
      if (u) this.initProfilForm(u);
    });

    // Détection de l'onglet via l'URL (ex: /mon-compte/securite)
    this.route.url.subscribe(segments => {
      const last = segments[segments.length - 1]?.path;
      if (last === 'securite')       this.ongletActif = 'securite';
      else if (last === 'confidentialite') this.ongletActif = 'confidentialite';
      else                           this.ongletActif = 'profil';
    });

    this.initSecuriteForm();
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  // -------------------------------------------------------
  // Navigation onglets
  // -------------------------------------------------------
  setOnglet(onglet: OngletType): void {
    this.ongletActif = onglet;
    this.profilSuccess  = false;
    this.securiteSuccess = false;
    this.confidSuccess  = false;
  }

  // -------------------------------------------------------
  // Formulaire profil
  // -------------------------------------------------------
  private initProfilForm(u: Utilisateur): void {
    this.profilForm = this.fb.group({
      prenom:    [u.prenom,    [Validators.required, Validators.minLength(2)]],
      nom:       [u.nom,       [Validators.required, Validators.minLength(2)]],
      email:     [u.email,     [Validators.required, Validators.email]],
      telephone: [u.telephone ?? ''],
      adresse:   [u.adresse   ?? '']
    });
  }

  saveProfil(): void {
    if (this.profilForm.invalid) { this.profilForm.markAllAsTouched(); return; }
    this.profilSaving = true;
    this.profilError  = '';

    this.authService.updateProfil(this.profilForm.value).subscribe({
      next: () => {
        this.profilSaving = false;
        this.profilSuccess = true;
        setTimeout(() => this.profilSuccess = false, 3000);
      },
      error: () => {
        this.profilSaving = false;
        this.profilError = 'Erreur lors de la mise à jour. Veuillez réessayer.';
      }
    });
  }

  // -------------------------------------------------------
  // Formulaire sécurité
  // -------------------------------------------------------
  private initSecuriteForm(): void {
    this.securiteForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(8),
                             Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.pwdMatchValidator });
  }

  saveSecurite(): void {
    if (this.securiteForm.invalid) { this.securiteForm.markAllAsTouched(); return; }
    this.securiteSaving = true;
    this.securiteError  = '';
    // TODO: appel API changement de mot de passe
    setTimeout(() => {
      this.securiteSaving = false;
      this.securiteSuccess = true;
      this.securiteForm.reset();
      setTimeout(() => this.securiteSuccess = false, 3000);
    }, 1200);
  }

  private pwdMatchValidator(g: any) {
    const n = g.get('newPassword')?.value;
    const c = g.get('confirmPassword')?.value;
    return n && c && n !== c ? { mismatch: true } : null;
  }

  get pwdStrength(): number {
    const p = this.securiteForm?.get('newPassword')?.value ?? '';
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)           s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[a-z]/.test(p))         s++;
    if (/\d/.test(p))            s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  }

  get pwdStrengthLabel(): string {
    return ['', 'Faible', 'Moyen', 'Bon', 'Fort'][this.pwdStrength];
  }

  get pwdStrengthClass(): string {
    return ['', 'weak', 'medium', 'good', 'strong'][this.pwdStrength];
  }

  // -------------------------------------------------------
  // Confidentialité
  // -------------------------------------------------------
  saveConfidentialite(): void {
    // TODO: appel API paramètres confidentialité
    this.confidSuccess = true;
    setTimeout(() => this.confidSuccess = false, 3000);
  }

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------
  getInitiales(): string { return this.authService.getInitiales(); }

  getAvatarColor(): string {
    return this.utilisateur?.role === 'admin'
      ? 'linear-gradient(135deg, #7c3aed, #a78bfa)'
      : 'linear-gradient(135deg, #d32f2f, #ff5a00)';
  }

  getRoleLabel(): string {
    const r = this.utilisateur?.role ?? 'client';
    return r.charAt(0).toUpperCase() + r.slice(1);
  }
}