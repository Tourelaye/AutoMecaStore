import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

export type CategorieParam = 'general' | 'livraison' | 'paiement' | 'notifications' | 'securite';

export interface Parametre {
  id: number;
  nom: string;
  cle: string;
  valeur: string;
  description: string;
  categorie: CategorieParam;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
  modifie?: boolean;
}

@Component({
  selector: 'app-parametre',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './parametre.component.html',
  styleUrls: ['./parametre.component.css']
})
export class ParametreComponent implements OnInit {

  activeTab: CategorieParam = 'general';
  searchQuery   = '';
  searchFocused = false;
  showModal     = false;
  saving        = false;
  savingId: number | null = null;

  message     = '';
  messageType: 'success' | 'error' = 'success';
  private notifTimer: any;

  parametreForm: Partial<Parametre> = this.emptyForm();

  readonly tabs: { key: CategorieParam; label: string; icon: string; color: string }[] = [
    { key: 'general',       label: 'Général',       icon: 'bi-gear-fill',        color: '#60a5fa' },
    { key: 'livraison',     label: 'Livraison',     icon: 'bi-truck-front-fill', color: '#4ade80' },
    { key: 'paiement',      label: 'Paiement',      icon: 'bi-credit-card-fill', color: '#a78bfa' },
    { key: 'notifications', label: 'Notifications', icon: 'bi-bell-fill',        color: '#fbbf24' },
    { key: 'securite',      label: 'Sécurité',      icon: 'bi-shield-lock-fill', color: '#f87171' },
  ];

  parametres: Parametre[] = [
    // ── GÉNÉRAL ──
    { id: 1,  nom: 'Nom de la boutique',       cle: 'shop_name',            valeur: 'AutoMecaStore',        description: 'Nom affiché sur le site et les factures',          categorie: 'general',       type: 'text'   },
    { id: 2,  nom: 'Email de contact',          cle: 'contact_email',        valeur: 'contact@automeca.sn',  description: 'Adresse email principale de contact',              categorie: 'general',       type: 'text'   },
    { id: 3,  nom: 'Téléphone',                 cle: 'phone',                valeur: '+221 77 000 00 00',    description: 'Numéro affiché en pied de page',                   categorie: 'general',       type: 'text'   },
    { id: 4,  nom: 'Adresse physique',          cle: 'address',              valeur: 'Plateau, Dakar',       description: 'Adresse du siège social',                          categorie: 'general',       type: 'text'   },
    { id: 5,  nom: 'Devise',                    cle: 'currency',             valeur: 'FCFA',                 description: 'Devise utilisée dans la boutique',                 categorie: 'general',       type: 'select', options: ['FCFA','EUR','USD'] },
    { id: 6,  nom: 'Langue par défaut',         cle: 'default_lang',         valeur: 'fr',                   description: 'Langue de l\'interface',                           categorie: 'general',       type: 'select', options: ['fr','en','ar'] },

    // ── LIVRAISON ──
    { id: 7,  nom: 'Frais de livraison',        cle: 'delivery_fee',         valeur: '2500',                 description: 'Frais de base en FCFA',                            categorie: 'livraison',     type: 'number' },
    { id: 8,  nom: 'Livraison gratuite dès',    cle: 'free_delivery_min',    valeur: '50000',                description: 'Montant minimum pour livraison gratuite',          categorie: 'livraison',     type: 'number' },
    { id: 9,  nom: 'Délai de livraison (j)',    cle: 'delivery_delay',       valeur: '3',                    description: 'Délai estimé en jours ouvrés',                     categorie: 'livraison',     type: 'number' },
    { id: 10, nom: 'Transporteur par défaut',   cle: 'default_carrier',      valeur: 'DHL',                  description: 'Transporteur utilisé si non précisé',              categorie: 'livraison',     type: 'select', options: ['DHL','Chronopost','Colissimo','GLS'] },
    { id: 11, nom: 'Zones de livraison',        cle: 'delivery_zones',       valeur: 'Dakar, Thiès, S-L',    description: 'Villes desservies (séparées par virgule)',          categorie: 'livraison',     type: 'text'   },

    // ── PAIEMENT ──
    { id: 12, nom: 'Paiement à la livraison',  cle: 'cash_on_delivery',     valeur: 'true',                 description: 'Autoriser le paiement à la livraison',            categorie: 'paiement',      type: 'boolean'},
    { id: 13, nom: 'Wave activé',              cle: 'wave_enabled',         valeur: 'true',                 description: 'Activer le paiement via Wave',                     categorie: 'paiement',      type: 'boolean'},
    { id: 14, nom: 'Orange Money activé',      cle: 'orange_money_enabled', valeur: 'true',                 description: 'Activer le paiement via Orange Money',            categorie: 'paiement',      type: 'boolean'},
    { id: 15, nom: 'TVA (%)',                   cle: 'tva_rate',             valeur: '18',                   description: 'Taux de TVA appliqué sur les commandes',           categorie: 'paiement',      type: 'number' },
    { id: 16, nom: 'Clé publique Stripe',      cle: 'stripe_public_key',    valeur: 'pk_test_...',          description: 'Clé publique pour l\'intégration Stripe',          categorie: 'paiement',      type: 'text'   },

    // ── NOTIFICATIONS ──
    { id: 17, nom: 'Email nouvelles commandes', cle: 'notif_new_order',     valeur: 'true',                 description: 'Recevoir un email pour chaque nouvelle commande',  categorie: 'notifications', type: 'boolean'},
    { id: 18, nom: 'Email stock critique',      cle: 'notif_low_stock',     valeur: 'true',                 description: 'Alerte email si stock ≤ seuil critique',           categorie: 'notifications', type: 'boolean'},
    { id: 19, nom: 'Email d\'envoi admin',      cle: 'admin_email_notif',   valeur: 'admin@automeca.sn',    description: 'Email destinataire des notifications admin',       categorie: 'notifications', type: 'text'   },
    { id: 20, nom: 'Seuil stock critique',      cle: 'low_stock_threshold', valeur: '5',                    description: 'Quantité en dessous de laquelle une alerte est émise', categorie: 'notifications', type: 'number'},

    // ── SÉCURITÉ ──
    { id: 21, nom: 'Tentatives connexion max', cle: 'max_login_attempts',   valeur: '5',                    description: 'Nombre max de tentatives avant blocage',           categorie: 'securite',      type: 'number' },
    { id: 22, nom: 'Durée session (min)',       cle: 'session_duration',     valeur: '60',                   description: 'Durée d\'inactivité avant déconnexion auto',       categorie: 'securite',      type: 'number' },
    { id: 23, nom: 'Double authentification',  cle: '2fa_enabled',          valeur: 'false',                description: 'Activer la 2FA pour les admins',                   categorie: 'securite',      type: 'boolean'},
    { id: 24, nom: 'HTTPS forcé',              cle: 'force_https',          valeur: 'true',                 description: 'Rediriger toutes les requêtes vers HTTPS',         categorie: 'securite',      type: 'boolean'},
  ];

  ngOnInit(): void {}

  // ── Tabs ─────────────────────────────────────────────────────
  setTab(tab: CategorieParam): void { this.activeTab = tab; }

  getActiveTab() {
    return this.tabs.find(t => t.key === this.activeTab)!;
  }

  getTabColor(): string { return this.getActiveTab().color; }

  hasModifiedInTab(key: CategorieParam): boolean {
    return this.parametres.some(p => p.categorie === key && p.modifie);
  }

  // ── Filtrage ─────────────────────────────────────────────────
  getParametresByCategorie(): Parametre[] {
    let list = this.parametres.filter(p => p.categorie === this.activeTab);
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p =>
        p.nom.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.cle.toLowerCase().includes(q)
      );
    }
    return list;
  }

  // ── Sauvegarde individuelle ───────────────────────────────────
  saveParametre(param: Parametre): void {
    this.savingId = param.id;
    setTimeout(() => {
      param.modifie = false;
      this.savingId = null;
      this.showMessage(`"${param.nom}" sauvegardé !`, 'success');
    }, 600);
  }

  onParamChange(param: Parametre): void { param.modifie = true; }

  // ── Sauvegarde globale ────────────────────────────────────────
  saveAll(): void {
    const modifies = this.parametres.filter(p => p.modifie);
    if (!modifies.length) { this.showMessage('Aucune modification à sauvegarder.', 'error'); return; }
    this.saving = true;
    setTimeout(() => {
      modifies.forEach(p => p.modifie = false);
      this.saving = false;
      this.showMessage(`${modifies.length} paramètre(s) sauvegardé(s) !`, 'success');
    }, 800);
  }

  hasUnsaved(): boolean { return this.parametres.some(p => p.modifie); }

  getModifiedCount(): number {
    return this.parametres.filter(p => p.modifie && p.categorie === this.activeTab).length;
  }

  // ── Modal ajouter ─────────────────────────────────────────────
  openAddModal(): void {
    this.parametreForm = { ...this.emptyForm(), categorie: this.activeTab };
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; this.parametreForm = this.emptyForm(); }

  addParametre(): void {
    if (!this.parametreForm.nom || !this.parametreForm.valeur) {
      this.showMessage('Veuillez remplir les champs obligatoires.', 'error'); return;
    }
    const newId = Math.max(0, ...this.parametres.map(p => p.id)) + 1;
    this.parametres.push({
      ...this.parametreForm,
      id:   newId,
      cle:  (this.parametreForm.nom ?? '').toLowerCase().replace(/\s+/g, '_'),
      type: 'text',
    } as Parametre);
    this.showMessage('Paramètre ajouté avec succès !', 'success');
    this.closeModal();
  }

  // ── Reset ──────────────────────────────────────────────────────
  resetParametre(param: Parametre): void {
    param.modifie = false;
    this.showMessage(`"${param.nom}" réinitialisé.`, 'success');
  }

  // ── Helpers Boolean ───────────────────────────────────────────
  getBoolValue(valeur: string): boolean { return valeur === 'true'; }

  toggleBool(param: Parametre): void {
    param.valeur  = param.valeur === 'true' ? 'false' : 'true';
    param.modifie = true;
  }

  // ── Notification ─────────────────────────────────────────────
  showMessage(msg: string, type: 'success' | 'error'): void {
    if (this.notifTimer) clearTimeout(this.notifTimer);
    this.message     = msg;
    this.messageType = type;
    this.notifTimer  = setTimeout(() => this.message = '', 3500);
  }

  private emptyForm(): Partial<Parametre> {
    return { nom: '', valeur: '', description: '', categorie: 'general', type: 'text' };
  }
}
