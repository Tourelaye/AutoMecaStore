import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-parametres-fournisseur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametres-fournisseur.component.html',
  styleUrls: ['./parametres-fournisseur.component.css']
})
export class ParametresFournisseurComponent {
  activeTab = 'password';

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  notificationSettings = {
    emailOrders: true,
    emailMessages: true,
    emailReviews: false,
    pushOrders: true,
    pushMessages: false
  };

  preferences = {
    language: 'fr',
    currency: 'EUR',
    timezone: 'Europe/Paris'
  };

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  onChangePassword(): void {
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
    alert('Mot de passe modifié avec succès (simulation)');
    this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
  }

  onSaveNotifications(): void {
    alert('Paramètres de notification enregistrés (simulation)');
  }

  onSavePreferences(): void {
    alert('Préférences enregistrées (simulation)');
  }
}
