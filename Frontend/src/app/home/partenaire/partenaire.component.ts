import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../core/services/notification.service';

export interface Partenaire {
  nom: string;
  initiale: string;
  couleur: string;
  textColor: string;
  description: string;
  depuis: string;
}

export interface Stat {
  valeur: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-partenaire',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './partenaire.component.html',
  styleUrl: './partenaire.component.css'
})
export class PartenaireComponent implements AfterViewInit {

  partenaires: Partenaire[] = [
    { nom: 'Bosch',       initiale: 'B', couleur: '#dc2626', textColor: '#fff', description: 'Équipementier mondial',  depuis: 'Depuis 2022' },
    { nom: 'Michelin',    initiale: 'M', couleur: '#2563eb', textColor: '#fff', description: 'Leader pneumatiques',    depuis: 'Depuis 2022' },
    { nom: 'Brembo',      initiale: 'B', couleur: '#b91c1c', textColor: '#fff', description: 'Systèmes de freinage',   depuis: 'Depuis 2023' },
    { nom: 'Varta',       initiale: 'V', couleur: '#0369a1', textColor: '#fff', description: 'Batteries automobiles',  depuis: 'Depuis 2023' },
    { nom: 'Mann-Filter', initiale: 'M', couleur: '#ca8a04', textColor: '#fff', description: 'Filtration de précision', depuis: 'Depuis 2022' },
    { nom: 'Gates',       initiale: 'G', couleur: '#7c3aed', textColor: '#fff', description: 'Transmission & distribution', depuis: 'Depuis 2024' },
  ];

  stats: Stat[] = [
    { valeur: '50+',   label: 'Marques partenaires',  icon: 'bi-award-fill'        },
    { valeur: '10K+',  label: 'Produits certifiés',   icon: 'bi-patch-check-fill'  },
    { valeur: '99.8%', label: 'Taux de satisfaction', icon: 'bi-star-fill'         },
    { valeur: '3+',    label: 'Années de confiance',  icon: 'bi-calendar-check-fill' },
  ];

  // ── Modal partenariat ──
  showPartenariatForm = false;
  partenaireForm: FormGroup;
  partenaireLoading = false;
  partenaireError: string | null = null;
  partenaireSuccess = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private notificationService: NotificationService
  ) {
    this.partenaireForm = this.fb.group({
      nom_entreprise: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      marque: ['', [Validators.maxLength(100)]],
      email_contact: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.maxLength(20)]],
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]]
    });
  }

  ngAfterViewInit(): void {
    const els = document.querySelectorAll('.brand-card, .stat-card, .cta-block');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
  }

  openPartenariatForm(): void {
    this.showPartenariatForm = true;
    this.partenaireError = null;
    this.partenaireSuccess = false;
    this.partenaireForm.reset();
  }

  closePartenariatForm(): void {
    this.showPartenariatForm = false;
    this.partenaireForm.reset();
  }

  submitPartenariat(): void {
    if (this.partenaireForm.invalid) {
      this.partenaireForm.markAllAsTouched();
      return;
    }

    this.partenaireLoading = true;
    this.partenaireError = null;

    const v = this.partenaireForm.value;

    this.http.post('http://127.0.0.1:8000/api/partenariat/create/', {
      nom_entreprise: v.nom_entreprise,
      marque: v.marque || '',
      email_contact: v.email_contact,
      telephone: v.telephone || '',
      message: v.message
    }).subscribe({
      next: () => {
        this.partenaireSuccess = true;
        this.partenaireLoading = false;
        this.notificationService.success('Votre demande a été envoyée. Nous vous contacterons rapidement.', 'Partenariat envoyé');
        setTimeout(() => { this.closePartenariatForm(); this.partenaireSuccess = false; }, 2000);
      },
      error: (err: any) => {
        this.partenaireLoading = false;
        const raw = err.error;
        if (raw && typeof raw === 'object') {
          const firstKey = Object.keys(raw)[0];
          if (firstKey) {
            const val = raw[firstKey];
            this.partenaireError = Array.isArray(val) ? val[0] : String(val);
          } else {
            this.partenaireError = 'Erreur lors de l\'envoi. Veuillez réessayer.';
          }
        } else {
          this.partenaireError = 'Erreur lors de l\'envoi. Veuillez réessayer.';
        }
      }
    });
  }
}