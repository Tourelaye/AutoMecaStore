import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type TabParametres = 'securite' | 'notifications' | 'paiements';

interface Session {
  appareil: string;
  icon: string;
  localisation: string;
  derniereActivite: string;
  current: boolean;
}

interface NotifPref {
  key: string;
  label: string;
  description: string;
  icon: string;
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface MethodeVersement {
  id: number;
  type: 'banque' | 'mobile';
  nom: string;
  detail: string;
  parDefaut: boolean;
}

@Component({
  selector: 'app-parametres-fournisseur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametres-fournisseur.component.html',
  styleUrls: ['./parametres-fournisseur.component.css']
})
export class ParametresComponent {

  activeTab: TabParametres = 'securite';

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  // =============================================
  // SÉCURITÉ
  // =============================================
  pwdForm_data = { actuel: '', nouveau: '', confirmation: '' };
  pwdError = '';
  isSavingPwd = false;

  securite = {
    deuxFA: false,
    telephoneMasque: '+221 77 *** ** 30'
  };

  sessions: Session[] = [
    { appareil: 'Chrome sur Windows', icon: 'bi-windows', localisation: 'Dakar, Sénégal', derniereActivite: "Aujourd'hui, 14:32", current: true },
    { appareil: 'Application mobile Android', icon: 'bi-phone', localisation: 'Dakar, Sénégal', derniereActivite: 'Hier, 19:10', current: false },
    { appareil: 'Safari sur iPhone', icon: 'bi-apple', localisation: 'Thiès, Sénégal', derniereActivite: '3 jours', current: false }
  ];

  // =============================================
  // NOTIFICATIONS
  // =============================================
  seuilGlobal = 5;

  notifPrefs: NotifPref[] = [
    { key: 'commandes', label: 'Nouvelle commande', description: 'À chaque commande reçue d\'un client', icon: 'bi-cart3', email: true, push: true, sms: false },
    { key: 'stock', label: 'Alerte stock faible / rupture', description: 'Quand un produit passe sous le seuil critique', icon: 'bi-exclamation-triangle', email: true, push: true, sms: true },
    { key: 'ventes', label: 'Versement reçu', description: 'Confirmation de reversement sur votre compte', icon: 'bi-cash-coin', email: true, push: false, sms: false },
    { key: 'avis', label: 'Nouvel avis client', description: 'Quand un client laisse un avis sur un produit', icon: 'bi-star', email: false, push: true, sms: false },
    { key: 'promos', label: 'Fin de promotion', description: 'Rappel 24h avant la fin d\'une campagne active', icon: 'bi-tag', email: true, push: false, sms: false }
  ];

  // =============================================
  // PAIEMENTS
  // =============================================
  showAddMethod = false;

  methodesVersement: MethodeVersement[] = [
    { id: 1, type: 'banque', nom: 'CBAO Groupe Attijariwafa Bank', detail: 'SN012 01001 034567890123 45', parDefaut: true },
    { id: 2, type: 'mobile', nom: 'Wave / Orange Money', detail: '+221 77 845 20 30', parDefaut: false }
  ];

  nouvelleMethode: { type: 'banque' | 'mobile'; nom: string; detail: string } = {
    type: 'banque',
    nom: '',
    detail: ''
  };

  // =============================================
  // ACTIONS — SÉCURITÉ
  // =============================================
  changerMotDePasse(): void {
    this.pwdError = '';

    if (this.pwdForm_data.nouveau.length < 8) {
      this.pwdError = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (this.pwdForm_data.nouveau !== this.pwdForm_data.confirmation) {
      this.pwdError = 'La confirmation ne correspond pas au nouveau mot de passe.';
      return;
    }

    this.isSavingPwd = true;

    // TODO: appeler ton service (PUT /auth/password)
    setTimeout(() => {
      this.isSavingPwd = false;
      this.pwdForm_data = { actuel: '', nouveau: '', confirmation: '' };
      this.showToast('Mot de passe mis à jour avec succès.', 'success');
    }, 600);
  }

  toggle2FA(): void {
    this.securite.deuxFA = !this.securite.deuxFA;
    // TODO: appeler ton service (PUT /auth/2fa)
    this.showToast(this.securite.deuxFA ? '2FA activée.' : '2FA désactivée.', 'success');
  }

  deconnecterSession(session: Session): void {
    this.sessions = this.sessions.filter(s => s !== session);
    // TODO: appeler ton service (DELETE /auth/sessions/:id)
    this.showToast(`Session "${session.appareil}" déconnectée.`, 'success');
  }

  desactiverBoutique(): void {
    const confirmation = window.confirm('Voulez-vous vraiment désactiver temporairement votre boutique ? Vos produits ne seront plus visibles.');
    if (!confirmation) return;

    // TODO: appeler ton service (PUT /fournisseur/statut)
    this.showToast('Boutique désactivée temporairement.', 'success');
  }

  // =============================================
  // ACTIONS — NOTIFICATIONS
  // =============================================
  enregistrerNotifications(): void {
    // TODO: appeler ton service (PUT /fournisseur/notifications)
    this.showToast('Préférences de notification enregistrées.', 'success');
  }

  // =============================================
  // ACTIONS — PAIEMENTS
  // =============================================
  definirParDefaut(methode: MethodeVersement): void {
    this.methodesVersement.forEach(m => (m.parDefaut = m.id === methode.id));
    // TODO: appeler ton service (PUT /fournisseur/methodes/:id/defaut)
    this.showToast(`"${methode.nom}" est maintenant votre méthode par défaut.`, 'success');
  }

  supprimerMethode(methode: MethodeVersement): void {
    if (methode.parDefaut) {
      this.showToast('Impossible de supprimer la méthode par défaut.', 'error');
      return;
    }
    const confirmation = window.confirm(`Supprimer "${methode.nom}" ?`);
    if (!confirmation) return;

    this.methodesVersement = this.methodesVersement.filter(m => m.id !== methode.id);
    // TODO: appeler ton service (DELETE /fournisseur/methodes/:id)
    this.showToast('Méthode de versement supprimée.', 'success');
  }

  ajouterMethode(): void {
    const nouvelle: MethodeVersement = {
      id: Date.now(),
      type: this.nouvelleMethode.type,
      nom: this.nouvelleMethode.nom,
      detail: this.nouvelleMethode.detail,
      parDefaut: this.methodesVersement.length === 0
    };

    this.methodesVersement.push(nouvelle);
    this.nouvelleMethode = { type: 'banque', nom: '', detail: '' };
    this.showAddMethod = false;

    // TODO: appeler ton service (POST /fournisseur/methodes)
    this.showToast('Nouvelle méthode de versement ajoutée.', 'success');
  }

  // =============================================
  // UTILITAIRES
  // =============================================
  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 3000);
  }
}