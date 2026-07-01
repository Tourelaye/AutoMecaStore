import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-liste-livraisons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './liste-livraisons.component.html',
  styleUrls: ['./liste-livraisons.component.css']
})
export class ListeLivraisonsComponent {
  livraisons = [
    { id: 'LIV-001', commande: 'CMD-001', client: 'Jean Dupont', date: '2024-06-28', adresse: '123 Rue de la Paix, Paris', statut: 'En transit', transporteur: 'Colissimo' },
    { id: 'LIV-002', commande: 'CMD-002', client: 'Marie Martin', date: '2024-06-28', adresse: '456 Avenue des Champs, Lyon', statut: 'Livré', transporteur: 'DHL' },
    { id: 'LIV-003', commande: 'CMD-003', client: 'Pierre Bernard', date: '2024-06-27', adresse: '789 Boulevard Haussmann, Marseille', statut: 'En préparation', transporteur: 'UPS' },
    { id: 'LIV-004', commande: 'CMD-004', client: 'Sophie Petit', date: '2024-06-27', adresse: '321 Rue de Rivoli, Bordeaux', statut: 'En transit', transporteur: 'Colissimo' },
    { id: 'LIV-005', commande: 'CMD-005', client: 'Luc Dubois', date: '2024-06-26', adresse: '654 Place de la Concorde, Toulouse', statut: 'Livré', transporteur: 'DHL' }
  ];

  searchTerm = '';
  selectedStatut = '';
  statuts = ['Toutes', 'En préparation', 'En transit', 'Livré', 'Annulé'];

  get filteredLivraisons() {
    return this.livraisons.filter(livraison => {
      const matchesSearch = livraison.client.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           livraison.id.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatut = this.selectedStatut === '' || this.selectedStatut === 'Toutes' || livraison.statut === this.selectedStatut;
      return matchesSearch && matchesStatut;
    });
  }

  onStatutChange(statut: string): void {
    this.selectedStatut = statut;
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'Livré': return 'badge-success';
      case 'En transit': return 'badge-warning';
      case 'En préparation': return 'badge-info';
      case 'Annulé': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }
}
