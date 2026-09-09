import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AvisClientService } from '../../core/services/avis-client.service';
import { ProduitService, Produit } from '../../core/services/produit.service';
import { NotificationService } from '../../core/services/notification.service';

export interface Avis {
  id: number;
  nom: string;
  ville: string;
  initiale: string;
  note: number;
  texte: string;
  date: string;
  couleur: string;
  produit: string;
}

@Component({
  selector: 'app-avis-client',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './avis-client.component.html',
  styleUrls: ['./avis-client.component.css']
})
export class AvisClientComponent implements OnInit, AfterViewInit {

  avis: Avis[] = [
    {
      id: 1,
      nom: 'Ahmed M.',
      ville: 'Dakar',
      initiale: 'A',
      note: 5,
      texte: 'Excellent service et livraison rapide. Produits de très bonne qualité, exactement ce que je cherchais !',
      date: 'Il y a 2 jours',
      couleur: '#3b82f6',
      produit: 'Pneu Michelin'
    },
    {
      id: 2,
      nom: 'Fatima B.',
      ville: 'Rufisque',
      initiale: 'F',
      note: 5,
      texte: 'Très satisfaite de ma commande. L\'équipe support est très réactive et professionnelle.',
      date: 'Il y a 5 jours',
      couleur: '#ec4899',
      produit: 'Huile moteur'
    },
    {
      id: 3,
      nom: 'Mohamed K.',
      ville: 'Kaolack',
      initiale: 'M',
      note: 4,
      texte: 'Bonne qualité et prix compétitif. Je recommande fortement AutoMecaStore à tous !',
      date: 'Il y a 1 semaine',
      couleur: '#10b981',
      produit: 'Filtre à air'
    },
    {
      id: 4,
      nom: 'Lina Z.',
      ville: 'Thiès',
      initiale: 'L',
      note: 5,
      texte: 'Service impeccable du début à la fin. Pièces originales, livraison soignée. À bientôt !',
      date: 'Il y a 2 semaines',
      couleur: '#8b5cf6',
      produit: 'Freins Brembo'
    }
  ];

  stats = [
    { valeur: '50 000+', label: 'Clients satisfaits' },
    { valeur: '4.9/5',   label: 'Note moyenne'       },
    { valeur: '98%',     label: 'Recommandent'        },
    { valeur: '24h',     label: 'Livraison rapide'    },
  ];

  // ── Formulaire avis ──
  showReviewForm = false;
  reviewForm: FormGroup;
  reviewLoading = false;
  reviewError: string | null = null;
  reviewSuccess = false;

  // ── Recherche produit ──
  produitSearch = '';
  produitsSearchResults: Produit[] = [];
  produitSelectionne: Produit | null = null;
  searchLoading = false;

  getEtoiles(note: number): number[] { return [1, 2, 3, 4, 5]; }
  isPleine(i: number, note: number): boolean { return i <= note; }

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService,
    private avisClientService: AvisClientService,
    private produitService: ProduitService,
    private notificationService: NotificationService
  ) {
    this.reviewForm = this.fb.group({
      note: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      commentaire: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]]
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    const cards = document.querySelectorAll('.avis-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    cards.forEach(c => observer.observe(c));
  }

  openReviewForm(): void {
    if (!this.authService.isAuthenticated()) {
      this.notificationService.warning('Connectez-vous pour laisser un avis.', 'Connexion requise');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
      return;
    }
    this.showReviewForm = true;
    this.reviewError = null;
    this.reviewSuccess = false;
    this.reviewForm.reset({ note: 5, commentaire: '' });
    this.produitSelectionne = null;
    this.produitSearch = '';
    this.produitsSearchResults = [];
  }

  closeReviewForm(): void {
    this.showReviewForm = false;
    this.reviewForm.reset({ note: 5, commentaire: '' });
    this.produitSelectionne = null;
    this.produitSearch = '';
    this.produitsSearchResults = [];
  }

  onProduitSearch(): void {
    const q = this.produitSearch.trim();
    if (q.length < 2) {
      this.produitsSearchResults = [];
      return;
    }
    this.searchLoading = true;
    this.produitService.rechercherProduits(q).subscribe({
      next: (results: Produit[]) => {
        const list = Array.isArray(results) ? results : (results as any).results ?? [];
        this.produitsSearchResults = list.slice(0, 8);
        this.searchLoading = false;
      },
      error: () => {
        this.searchLoading = false;
        this.produitsSearchResults = [];
      }
    });
  }

  selectProduit(p: Produit): void {
    this.produitSelectionne = p;
    this.produitSearch = p.nom;
    this.produitsSearchResults = [];
  }

  clearProduitSelection(): void {
    this.produitSelectionne = null;
    this.produitSearch = '';
    this.produitsSearchResults = [];
  }

  submitReview(): void {
    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }
    if (!this.produitSelectionne) {
      this.reviewError = 'Veuillez sélectionner un produit à évaluer.';
      return;
    }

    this.reviewLoading = true;
    this.reviewError = null;

    this.avisClientService.createAvis({
      ...this.reviewForm.value,
      produit: this.produitSelectionne.id
    }).subscribe({
      next: () => {
        this.reviewSuccess = true;
        this.reviewLoading = false;
        this.notificationService.success('Votre avis a bien été enregistré. Merci !', 'Avis envoyé');
        setTimeout(() => { this.closeReviewForm(); this.reviewSuccess = false; }, 1800);
      },
      error: (err: any) => {
        this.reviewLoading = false;
        const raw = err.error;
        if (raw?.non_field_errors) {
          this.reviewError = Array.isArray(raw.non_field_errors) ? raw.non_field_errors[0] : raw.non_field_errors;
        } else if (raw?.detail) {
          this.reviewError = raw.detail;
        } else if (typeof raw === 'string') {
          this.reviewError = raw;
        } else if (raw && typeof raw === 'object') {
          const firstKey = Object.keys(raw)[0];
          if (firstKey) {
            const val = raw[firstKey];
            this.reviewError = Array.isArray(val) ? val[0] : String(val);
          } else {
            this.reviewError = 'Impossible d\'envoyer l\'avis.';
          }
        } else {
          this.reviewError = 'Impossible d\'envoyer l\'avis.';
        }
      }
    });
  }
}