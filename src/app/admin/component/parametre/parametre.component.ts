import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

interface Parametre {
  id: string;
  nom: string;
  valeur: string;
  description: string;
  categorie: string;
}

@Component({
  selector: 'app-parametre',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './parametre.component.html',
  styleUrl: './parametre.component.css'
})
export class ParametreComponent implements OnInit {
  parametres: Parametre[] = [];
  searchQuery = '';
  showModal = false;
  isEditing = false;
  activeTab = 'general';
  
  parametreForm: Partial<Parametre> = {
    nom: '',
    valeur: '',
    description: '',
    categorie: 'general'
  };

  message = '';
  messageType: 'success' | 'error' = 'success';

  ngOnInit(): void {
    this.loadParametres();
  }

  loadParametres(): void {
    this.parametres = [
      { id: '1', nom: 'Nom du site', valeur: 'AutoMeca Store', description: 'Nom affiché du site', categorie: 'general' },
      { id: '2', nom: 'Email de contact', valeur: 'contact@automeca.store', description: 'Email principal', categorie: 'general' },
      { id: '3', nom: 'Téléphone', valeur: '01 23 45 67 89', description: 'Numéro de téléphone', categorie: 'general' },
      { id: '4', nom: 'Frais de livraison', valeur: '5.99', description: 'Frais fixes de livraison', categorie: 'livraison' },
      { id: '5', nom: 'Gratuit à partir de', valeur: '50', description: 'Livraison gratuite dès', categorie: 'livraison' },
      { id: '6', nom: 'Devise', valeur: 'EUR', description: 'Devise utilisée', categorie: 'paiement' },
      { id: '7', nom: 'TVA', valeur: '20', description: 'Taux de TVA en %', categorie: 'paiement' }
    ];
  }

  openAddModal(): void {
    this.isEditing = false;
    this.parametreForm = { nom: '', valeur: '', description: '', categorie: this.activeTab };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveParametre(): void {
    if (!this.parametreForm.nom || !this.parametreForm.valeur) {
      this.showMessage('Veuillez remplir les champs obligatoires', 'error');
      return;
    }
    
    const newParametre: Parametre = {
      id: Date.now().toString(),
      nom: this.parametreForm.nom!,
      valeur: this.parametreForm.valeur!,
      description: this.parametreForm.description || '',
      categorie: this.parametreForm.categorie || 'general'
    };
    
    this.parametres.unshift(newParametre);
    this.showModal = false;
    this.showMessage('Paramètre ajouté avec succès !', 'success');
  }

  onSearch(): void {
  }

  showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }

  setTab(tab: string): void {
    this.activeTab = tab;
  }

  getParametresByCategorie(): Parametre[] {
    return this.parametres.filter(p => p.categorie === this.activeTab);
  }
}
