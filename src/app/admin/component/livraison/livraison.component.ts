import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

interface Livraison {
  id: number;
  commandeId: string;
  client: string;
  adresse: string;
  statut: 'en_preparation' | 'en_cours' | 'livree' | 'annulee';
  dateExpedition: string;
  dateLivraison: string;
  transporteur: string;
}

@Component({
  selector: 'app-livraison',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './livraison.component.html',
  styleUrl: './livraison.component.css'
})
export class LivraisonComponent implements OnInit {
  livraisons: Livraison[] = [];
  searchQuery = '';
  showModal = false;
  isEditing = false;
  
  livraisonForm: Partial<Livraison> = {
    commandeId: '',
    client: '',
    adresse: '',
    statut: 'en_preparation',
    transporteur: ''
  };

  message = '';
  messageType: 'success' | 'error' = 'success';

  ngOnInit(): void {
    this.loadLivraisons();
  }

  loadLivraisons(): void {
    this.livraisons = [
      { id: 1, commandeId: 'CMD-001', client: 'Jean Dupont', adresse: 'Paris', statut: 'en_cours', dateExpedition: '2024-01-20', dateLivraison: '2024-01-22', transporteur: 'Chronopost' },
      { id: 2, commandeId: 'CMD-002', client: 'Marie Martin', adresse: 'Lyon', statut: 'livree', dateExpedition: '2024-01-18', dateLivraison: '2024-01-20', transporteur: 'La Poste' },
      { id: 3, commandeId: 'CMD-003', client: 'Pierre Bernard', adresse: 'Marseille', statut: 'en_preparation', dateExpedition: '', dateLivraison: '', transporteur: '' }
    ];
  }

  openAddModal(): void {
    this.isEditing = false;
    this.livraisonForm = { commandeId: '', client: '', adresse: '', statut: 'en_preparation', transporteur: '' };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveLivraison(): void {
    if (!this.livraisonForm.commandeId || !this.livraisonForm.client) {
      this.showMessage('Veuillez remplir les champs obligatoires', 'error');
      return;
    }
    
    const newLivraison: Livraison = {
      id: this.livraisons.length + 1,
      commandeId: this.livraisonForm.commandeId!,
      client: this.livraisonForm.client!,
      adresse: this.livraisonForm.adresse || '',
      statut: this.livraisonForm.statut || 'en_preparation',
      dateExpedition: '',
      dateLivraison: '',
      transporteur: this.livraisonForm.transporteur || ''
    };
    
    this.livraisons.unshift(newLivraison);
    this.showModal = false;
    this.showMessage('Livraison créée avec succès !', 'success');
  }

  onSearch(): void {
  }

  showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }

  getStatutLabel(statut: string): string {
    const labels: Record<string, string> = {
      'en_preparation': 'En préparation',
      'en_cours': 'En cours',
      'livree': 'Livrée',
      'annulee': 'Annulée'
    };
    return labels[statut] || statut;
  }
}
