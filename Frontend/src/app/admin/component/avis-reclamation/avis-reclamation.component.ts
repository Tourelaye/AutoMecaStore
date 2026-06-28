import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

interface Avis {
  id: number;
  client: string;
  produit: string;
  note: number;
  commentaire: string;
  date: string;
  type: 'avis' | 'reclamation';
  statut: 'nouveau' | 'traite' | 'en_cours';
}

@Component({
  selector: 'app-avis-reclamation',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './avis-reclamation.component.html',
  styleUrl: './avis-reclamation.component.css'
})
export class AvisReclamationComponent implements OnInit {
  avisList: Avis[] = [];
  searchQuery = '';
  showModal = false;
  isEditing = false;
  
  avisForm: Partial<Avis> = {
    client: '',
    produit: '',
    note: 5,
    commentaire: '',
    type: 'avis',
    statut: 'nouveau'
  };

  message = '';
  messageType: 'success' | 'error' = 'success';

  ngOnInit(): void {
    this.loadAvis();
  }

  loadAvis(): void {
    this.avisList = [
      { id: 1, client: 'Jean Dupont', produit: 'Kit Freinage', note: 5, commentaire: 'Excellent produit, livraison rapide', date: '2024-01-20', type: 'avis', statut: 'traite' },
      { id: 2, client: 'Marie Martin', produit: 'Filtre à huile', note: 3, commentaire: 'Produit correct mais emballage abîmé', date: '2024-01-19', type: 'reclamation', statut: 'en_cours' },
      { id: 3, client: 'Pierre Bernard', produit: 'Bougies', note: 1, commentaire: 'Produit défectueux', date: '2024-01-18', type: 'reclamation', statut: 'nouveau' }
    ];
  }

  openAddModal(): void {
    this.isEditing = false;
    this.avisForm = { client: '', produit: '', note: 5, commentaire: '', type: 'avis', statut: 'nouveau' };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveAvis(): void {
    if (!this.avisForm.client || !this.avisForm.commentaire) {
      this.showMessage('Veuillez remplir les champs obligatoires', 'error');
      return;
    }
    
    const newAvis: Avis = {
      id: this.avisList.length + 1,
      client: this.avisForm.client!,
      produit: this.avisForm.produit || '',
      note: this.avisForm.note || 5,
      commentaire: this.avisForm.commentaire!,
      date: new Date().toISOString().split('T')[0],
      type: this.avisForm.type || 'avis',
      statut: this.avisForm.statut || 'nouveau'
    };
    
    this.avisList.unshift(newAvis);
    this.showModal = false;
    this.showMessage('Avis ajouté avec succès !', 'success');
  }

  onSearch(): void {
  }

  showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }

  getTypeLabel(type: string): string {
    return type === 'avis' ? 'Avis' : 'Réclamation';
  }
}
