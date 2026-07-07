import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type ActiviteType = 'produit' | 'commande' | 'stock' | 'promotion';

interface Activite {
  id: number;
  type: ActiviteType;
  titre: string;
  detail: string;
  date: Date;
}

@Component({
  selector: 'app-historiques',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historiques.component.html',
  styleUrls: ['./historiques.component.css']
})
export class HistoriquesComponent {

  searchTerm = '';
  selectedType = '';
  toastMsg = '';
  showConfirmClear = false;
  private toastTimeout: any;

  // TODO: remplacer par un appel API (getHistoriqueActivite())
  activites: Activite[] = [
    {
      id: 1,
      type: 'produit',
      titre: 'Produit "Alternateur Valéo 14V" ajouté au catalogue.',
      detail: 'Référence : REF-VAL-439560 | Prix : 85 000 FCFA | Stock initial : 8 unités',
      date: new Date(Date.now() - 2 * 60 * 1000)
    },
    {
      id: 2,
      type: 'commande',
      titre: 'Nouvelle commande en attente #CMD-2026-0922 reçue.',
      detail: 'Client : Garage du Centre | 1x Alternateur Valéo | Total : 85 000 FCFA',
      date: new Date(Date.now() - 5 * 60 * 1000)
    },
    {
      id: 3,
      type: 'stock',
      titre: 'Stock critique pour "Filtre à Huile Moteur Bosch Premium".',
      detail: 'Stock actuel : 3 unités (Seuil critique : 10 unités).',
      date: new Date(Date.now() - 12 * 60 * 1000)
    },
    {
      id: 4,
      type: 'promotion',
      titre: 'Promotion de -15% sur Plaquettes Brembo expirée.',
      detail: "La promotion planifiée s'est achevée avec succès aujourd'hui.",
      date: new Date(Date.now() - 20 * 60 * 1000)
    }
  ];

  get activitesFiltrees(): Activite[] {
    return this.activites
      .filter(a => {
        const matchesType = !this.selectedType || a.type === this.selectedType;
        const term = this.searchTerm.toLowerCase().trim();
        const matchesSearch = !term ||
          a.titre.toLowerCase().includes(term) ||
          a.detail.toLowerCase().includes(term);
        return matchesType && matchesSearch;
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // =============================================
  // SIMULATEUR — ajoute un événement réaliste en tête de liste
  // =============================================
  simulerProduitAjoute(): void {
    const noms = ['Alternateur Valéo 14V', 'Bougie NGK Iridium', 'Radiateur Nissens', 'Courroie Gates'];
    const nom = noms[Math.floor(Math.random() * noms.length)];
    const ref = 'REF-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const prix = (Math.floor(Math.random() * 15) + 3) * 10000;
    const stock = Math.floor(Math.random() * 20) + 3;

    this.ajouterActivite({
      type: 'produit',
      titre: `Produit "${nom}" ajouté au catalogue.`,
      detail: `Référence : ${ref} | Prix : ${prix.toLocaleString('fr-FR')} FCFA | Stock initial : ${stock} unités`
    });
  }

  simulerCommandeRecue(): void {
    const clients = ['Garage du Centre', 'Auto Réparation Sénégal', 'Garage Modernes', 'Sénégal Motors'];
    const client = clients[Math.floor(Math.random() * clients.length)];
    const num = 'CMD-2026-' + Math.floor(1000 + Math.random() * 8999);
    const total = (Math.floor(Math.random() * 40) + 5) * 10000;

    this.ajouterActivite({
      type: 'commande',
      titre: `Nouvelle commande en attente #${num} reçue.`,
      detail: `Client : ${client} | Total : ${total.toLocaleString('fr-FR')} FCFA`
    });
  }

  simulerStockAjuste(): void {
    const produits = ['Filtre à Huile Bosch Premium', 'Plaquettes Frein Brembo', 'Kit Chaîne DID 520'];
    const produit = produits[Math.floor(Math.random() * produits.length)];
    const stockActuel = Math.floor(Math.random() * 8) + 1;
    const seuil = Math.floor(Math.random() * 10) + 5;

    this.ajouterActivite({
      type: 'stock',
      titre: `Stock critique pour "${produit}".`,
      detail: `Stock actuel : ${stockActuel} unités (Seuil critique : ${seuil} unités).`
    });
  }

  simulerPromotionCreee(): void {
    const produits = ['Plaquettes Brembo', 'Filtre à Huile Bosch', 'Kit Chaîne DID'];
    const produit = produits[Math.floor(Math.random() * produits.length)];
    const pct = [10, 15, 20, 25][Math.floor(Math.random() * 4)];

    this.ajouterActivite({
      type: 'promotion',
      titre: `Nouvelle promotion de -${pct}% créée sur "${produit}".`,
      detail: `Réduction active immédiatement. Vous pouvez la gérer depuis l'onglet Promotions.`
    });
  }

  private ajouterActivite(partial: { type: ActiviteType; titre: string; detail: string }): void {
    this.activites.unshift({
      id: Date.now(),
      date: new Date(),
      ...partial
    });
    this.showToast('Nouvel événement ajouté à l\'historique.');
  }

  // =============================================
  // SUPPRESSION
  // =============================================
  confirmerEffacement(): void {
    if (this.activites.length === 0) return;
    this.showConfirmClear = true;
  }

  effacerHistorique(): void {
    this.activites = [];
    this.showConfirmClear = false;
    this.showToast('Historique effacé.');
    // TODO: appeler ton service (DELETE /fournisseur/historique)
  }

  // =============================================
  // UTILITAIRES
  // =============================================
  getIcon(type: ActiviteType): string {
    switch (type) {
      case 'produit': return 'bi-box-seam-fill';
      case 'commande': return 'bi-cart3';
      case 'stock': return 'bi-exclamation-triangle-fill';
      case 'promotion': return 'bi-tag-fill';
    }
  }

  getTypeLabel(type: ActiviteType): string {
    switch (type) {
      case 'produit': return 'Produit';
      case 'commande': return 'Commande';
      case 'stock': return 'Stock';
      case 'promotion': return 'Promotion';
    }
  }

  formatTemps(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;

    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Aujourd'hui à ${date.getHours().toString().padStart(2, '0')}h${date.getMinutes().toString().padStart(2, '0')}`;

    return date.toLocaleDateString('fr-FR') + ' à ' + date.getHours().toString().padStart(2, '0') + 'h' + date.getMinutes().toString().padStart(2, '0');
  }

  private showToast(msg: string): void {
    this.toastMsg = msg;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 2500);
  }
}