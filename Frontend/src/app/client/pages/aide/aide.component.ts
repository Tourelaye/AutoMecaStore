import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-aide',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ScrollRevealDirective],
  templateUrl: './aide.component.html',
  styleUrl: './aide.component.css'
})
export class AideComponent {
  supportForm: FormGroup;
  loading = false;
  success = false;
  error: string | null = null;

  categories = [
    { value: 'commande', label: 'Suivi de commande' },
    { value: 'retour', label: 'Retour & remboursement' },
    { value: 'paiement', label: 'Problème de paiement' },
    { value: 'livraison', label: 'Livraison' },
    { value: 'compte', label: 'Mon compte' },
    { value: 'autre', label: 'Autre demande' },
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.supportForm = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      categorie: ['', [Validators.required]],
      sujet: ['', [Validators.required, Validators.minLength(3)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  submitSupport(): void {
    if (this.supportForm.invalid) {
      this.supportForm.markAllAsTouched();
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.notificationService.warning('Connectez-vous pour envoyer un message au support.', 'Connexion requise');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/client/aide' } });
      return;
    }

    this.loading = true;
    this.error = null;

    const v = this.supportForm.value;
    const objet = `[${v.categorie}] ${v.sujet}`;
    const contenu = [
      `Nom: ${v.prenom} ${v.nom}`,
      `Email: ${v.email}`,
      v.telephone ? `Téléphone: ${v.telephone}` : '',
      '',
      v.message
    ].filter(Boolean).join('\n');

    this.http.post('http://127.0.0.1:8000/api/message/create/', {
      objet,
      contenu
    }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.notificationService.success('Votre message a été envoyé. Nous vous répondrons rapidement.', 'Message envoyé');
        setTimeout(() => {
          this.success = false;
          this.supportForm.reset();
        }, 3000);
      },
      error: (err: any) => {
        this.loading = false;
        const raw = err.error;
        if (raw && typeof raw === 'object') {
          if (raw.detail) {
            this.error = raw.detail;
          } else {
            const firstKey = Object.keys(raw)[0];
            if (firstKey) {
              const val = raw[firstKey];
              this.error = Array.isArray(val) ? val[0] : String(val);
            } else {
              this.error = 'Erreur lors de l\'envoi. Veuillez réessayer.';
            }
          }
        } else {
          this.error = 'Erreur lors de l\'envoi. Veuillez réessayer.';
        }
      }
    });
  }
}
