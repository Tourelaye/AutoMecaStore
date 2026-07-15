import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProduitService } from '../services/produit.service';
import { PromotionService } from '../services/promotion.service';

interface Produit {
  id: number;
  nom: string;
  prix: number;
  image?: string;
}

interface Promotion {
  id: number;
  produitId: number;
  produitNom: string;
  produitImage?: string;
  prixOriginal: number;
  pourcentage: number;
  dateDebut: string; // format 'yyyy-MM-dd'
  dateFin: string;
}

@Component({
  selector: 'app-promotions-fournisseur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promotions.component.html',
  styleUrls: ['./promotions.component.css']
})
export class PromotionsComponent implements OnInit {

  isSaving = false;
  formError = '';

  constructor(
    private produitService: ProduitService,
    private promotionService: PromotionService
  ) {}

  ngOnInit(): void {
    this.loadProduits();
    this.loadPromotions();
  }

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  produitsDisponibles: Produit[] = [];
  promotions: Promotion[] = [];

  form: {
    produitId: number | null;
    pourcentage: number | null;
    dateDebut: string;
    dateFin: string;
  } = {
    produitId: null,
    pourcentage: null,
    dateDebut: '',
    dateFin: ''
  };

  // =============================================
  // GETTERS
  // =============================================
  get produitSelectionne(): Produit | undefined {
    return this.produitsDisponibles.find(p => p.id === this.form.produitId);
  }

  // =============================================
  // ACTIONS
  // =============================================
  appliquerReduction(): void {
    this.formError = '';

    if (!this.form.produitId || !this.form.pourcentage || !this.form.dateDebut || !this.form.dateFin) {
      this.formError = 'Merci de remplir tous les champs obligatoires.';
      return;
    }

    if (this.form.pourcentage <= 0 || this.form.pourcentage > 90) {
      this.formError = 'Le pourcentage doit être compris entre 1 et 90.';
      return;
    }

    if (new Date(this.form.dateFin) <= new Date(this.form.dateDebut)) {
      this.formError = 'La date de fin doit être après la date de début.';
      return;
    }

    const produit = this.produitSelectionne;
    if (!produit) {
      this.formError = 'Produit introuvable.';
      return;
    }

    const dejaEnPromo = this.promotions.some(p => p.produitId === produit.id);
    if (dejaEnPromo) {
      this.formError = 'Ce produit a déjà une promotion active.';
      return;
    }

    this.isSaving = true;
    this.promotionService.createPromotion({
      produit: produit.id,
      pourcentage: this.form.pourcentage!,
      date_debut: this.form.dateDebut,
      date_fin: this.form.dateFin
    }).subscribe({
      next: () => {
        this.loadPromotions();
        this.resetForm();
        this.isSaving = false;
        this.showToast(`Promotion appliquée sur "${produit.nom}"`, 'success');
      },
      error: () => {
        this.showToast('Erreur lors de l’ajout de la promotion', 'error');
        this.isSaving = false;
      }
    });
  }

  supprimerPromo(promo: Promotion): void {
    const confirmation = window.confirm(`Supprimer la promotion sur "${promo.produitNom}" ?`);
    if (!confirmation) return;

    this.promotionService.deletePromotion(promo.id).subscribe({
      next: () => {
        this.loadPromotions();
        this.showToast('Promotion supprimée.', 'success');
      },
      error: () => {
        this.showToast('Erreur lors de la suppression de la promotion', 'error');
      }
    });
  }

  private loadProduits(): void {
    this.produitService.getProduits().subscribe({
      next: produits => {
        this.produitsDisponibles = produits.map(p => ({
          id: p.id,
          nom: p.nom,
          prix: p.prix,
          image: p.image_url || p.image || undefined
        }));
      },
      error: () => {
        this.showToast('Impossible de charger la liste des produits', 'error');
      }
    });
  }

  private loadPromotions(): void {
    this.promotionService.getPromotions().subscribe({
      next: promotions => {
        this.promotions = promotions.map(p => {
          const produit = this.produitsDisponibles.find(pr => pr.id === p.produit);
          const prixOriginal = produit ? produit.prix : 0;
          return {
            id: p.id,
            produitId: p.produit,
            produitNom: p.produit_nom || (produit ? produit.nom : 'Produit inconnu'),
            produitImage: produit ? produit.image : undefined,
            prixOriginal,
            pourcentage: p.pourcentage,
            dateDebut: p.date_debut || '',
            dateFin: p.date_fin || ''
          };
        });
      },
      error: () => {
        this.showToast('Impossible de charger les promotions', 'error');
      }
    });
  }

  private resetForm(): void {
    this.form = { produitId: null, pourcentage: null, dateDebut: '', dateFin: '' };
    this.formError = '';
  }

  // =============================================
  // UTILITAIRES
  // =============================================
  calculPrixReduit(prix: number, pourcentage: number): number {
    return Math.round(prix * (1 - pourcentage / 100));
  }

  formatPrix(prix: number): string {
    return prix.toLocaleString('fr-FR').replace(/,/g, ' ') + ' FCFA';
  }

  formatDateAffichage(dateStr: string): string {
    return dateStr; // déjà au format yyyy-MM-dd, comme dans la capture
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 3000);
  }
}