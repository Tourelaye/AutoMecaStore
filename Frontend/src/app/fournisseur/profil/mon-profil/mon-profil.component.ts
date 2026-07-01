import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mon-profil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mon-profil.component.html',
  styleUrls: ['./mon-profil.component.css']
})
export class MonProfilComponent {
  fournisseur = {
    logo: 'assets/images/fournisseur-logo.png',
    nomEntreprise: 'AutoParts Pro',
    email: 'contact@autopartspro.com',
    telephone: '+33 1 23 45 67 89',
    adresse: '123 Zone Industrielle, 75001 Paris',
    description: 'Leader dans la distribution de pièces automobiles depuis 2010. Nous proposons une large gamme de pièces de qualité pour tous types de véhicules.',
    siret: '123 456 789 00012',
    dateCreation: '2010-05-15'
  };

  isEditing = false;
  editedProfile = { ...this.fournisseur };

  onEdit(): void {
    this.isEditing = true;
    this.editedProfile = { ...this.fournisseur };
  }

  onCancel(): void {
    this.isEditing = false;
    this.editedProfile = { ...this.fournisseur };
  }

  onSave(): void {
    this.fournisseur = { ...this.editedProfile };
    this.isEditing = false;
    alert('Profil mis à jour avec succès (simulation)');
  }
}
