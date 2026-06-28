import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

interface Promotion {
  id: number;
  nom: string;
  code: string;
  reduction: number;
  type: 'pourcentage' | 'montant';
  dateDebut: string;
  dateFin: string;
  utilisations: number;
  statut: 'active' | 'expiree' | 'desactivee';
}

@Component({
  selector: 'app-promotion',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './promotion.component.html',
  styleUrl: './promotion.component.css'
})
export class PromotionComponent implements OnInit {
  promotions: Promotion[] = [];
  searchQuery = '';
  showModal = false;
  isEditing = false;
  
  promotionForm: Partial<Promotion> = {
    nom: '',
    code: '',
    reduction: 10,
    type: 'pourcentage',
    dateDebut: '',
    dateFin: '',
    statut: 'active'
  };

  message = '';
  messageType: 'success' | 'error' = 'success';

  ngOnInit(): void {
    this.loadPromotions();
  }

  loadPromotions(): void {
    this.promotions = [
      { id: 1, nom: 'Soldes d\'hiver', code: 'HIVER24', reduction: 20, type: 'pourcentage', dateDebut: '2024-01-01', dateFin: '2024-01-31', utilisations: 45, statut: 'active' },
      { id: 2, nom: 'Nouveau client', code: 'BIENVENUE', reduction: 10, type: 'pourcentage', dateDebut: '2024-01-01', dateFin: '2024-12-31', utilisations: 23, statut: 'active' },
      { id: 3, nom: 'Black Friday', code: 'BLACK24', reduction: 30, type: 'pourcentage', dateDebut: '2023-11-24', dateFin: '2023-11-27', utilisations: 156, statut: 'expiree' }
    ];
  }

  openAddModal(): void {
    this.isEditing = false;
    this.promotionForm = { nom: '', code: '', reduction: 10, type: 'pourcentage', dateDebut: '', dateFin: '', statut: 'active' };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  savePromotion(): void {
    if (!this.promotionForm.nom || !this.promotionForm.code || !this.promotionForm.reduction) {
      this.showMessage('Veuillez remplir les champs obligatoires', 'error');
      return;
    }
    
    const newPromotion: Promotion = {
      id: this.promotions.length + 1,
      nom: this.promotionForm.nom!,
      code: this.promotionForm.code!.toUpperCase(),
      reduction: this.promotionForm.reduction!,
      type: this.promotionForm.type || 'pourcentage',
      dateDebut: this.promotionForm.dateDebut || '',
      dateFin: this.promotionForm.dateFin || '',
      utilisations: 0,
      statut: this.promotionForm.statut || 'active'
    };
    
    this.promotions.unshift(newPromotion);
    this.showModal = false;
    this.showMessage('Promotion créée avec succès !', 'success');
  }

  onSearch(): void {
  }

  showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }

  getReductionLabel(promo: Promotion): string {
    return promo.type === 'pourcentage' ? `${promo.reduction}%` : `${promo.reduction}€`;
  }
}
