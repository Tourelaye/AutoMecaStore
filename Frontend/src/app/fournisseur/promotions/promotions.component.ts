import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
export class PromotionsComponent {

  isSaving = false;
  formError = '';

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  // TODO: remplacer par les produits réels du fournisseur (via un service)
  produitsDisponibles: Produit[] = [
    { id: 1, nom: 'Jeu de 4 Plaquettes de Frein Brembo Avant', prix: 45000 },
    { id: 2, nom: 'Filtre à Huile Moteur Bosch Premium', prix: 12000 },
    { id: 3, nom: 'Kit Chaîne DID 520 Renforcé O-Ring', prix: 38000 },
    { id: 4, nom: 'Vanne de Freinage Pneumatique Wabco', prix: 155000 }
  ];

  // TODO: remplacer par un appel API (getPromotions())
  promotions: Promotion[] = [
    {
      id: 1,
      produitId: 1,
      produitNom: 'Jeu de 4 Plaquettes de Frein Brembo Avant',
      produitImage: '',
      prixOriginal: 45000,
      pourcentage: 15,
      dateDebut: '2026-08-01',
      dateFin: '2026-08-10'
    }
  ];

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

    // Vérifie qu'il n'y a pas déjà une promo active sur ce produit
    const dejaEnPromo = this.promotions.some(p => p.produitId === produit.id);
    if (dejaEnPromo) {
      this.formError = 'Ce produit a déjà une promotion active.';
      return;
    }

    this.isSaving = true;

    // TODO: remplacer par un appel à ton service (POST /promotions)
    setTimeout(() => {
      const nouvellePromo: Promotion = {
        id: Date.now(),
        produitId: produit.id,
        produitNom: produit.nom,
        produitImage: produit.image,
        prixOriginal: produit.prix,
        pourcentage: this.form.pourcentage!,
        dateDebut: this.form.dateDebut,
        dateFin: this.form.dateFin
      };

      this.promotions.unshift(nouvellePromo);
      this.resetForm();
      this.isSaving = false;
      this.showToast(`Promotion appliquée sur "${produit.nom}"`, 'success');
    }, 500);
  }

  supprimerPromo(promo: Promotion): void {
    const confirmation = window.confirm(`Supprimer la promotion sur "${promo.produitNom}" ?`);
    if (!confirmation) return;

    this.promotions = this.promotions.filter(p => p.id !== promo.id);

    // TODO: appeler ton service (DELETE /promotions/:id)
    this.showToast('Promotion supprimée.', 'success');
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