import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-liste-commandes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './liste-commandes.component.html',
  styleUrls: ['./liste-commandes.component.css']
})
export class ListeCommandesComponent {
  commandes = [
    { id: 'CMD-001', client: 'Jean Dupont', date: '2024-06-28', montant: 1250, statut: 'En cours', produits: 5 },
    { id: 'CMD-002', client: 'Marie Martin', date: '2024-06-28', montant: 890, statut: 'Livré', produits: 3 },
    { id: 'CMD-003', client: 'Pierre Bernard', date: '2024-06-27', montant: 2100, statut: 'En attente', produits: 8 },
    { id: 'CMD-004', client: 'Sophie Petit', date: '2024-06-27', montant: 560, statut: 'En cours', produits: 2 },
    { id: 'CMD-005', client: 'Luc Dubois', date: '2024-06-26', montant: 1780, statut: 'Livré', produits: 4 },
    { id: 'CMD-006', client: 'Claire Moreau', date: '2024-06-26', montant: 920, statut: 'Annulé', produits: 3 },
    { id: 'CMD-007', client: 'Michel Lefebvre', date: '2024-06-25', montant: 1450, statut: 'En cours', produits: 6 },
    { id: 'CMD-008', client: 'Isabelle Roux', date: '2024-06-25', montant: 670, statut: 'Livré', produits: 2 }
  ];

  searchTerm = '';
  selectedStatut = '';
  statuts = ['Toutes', 'En attente', 'En cours', 'Livré', 'Annulé'];

  constructor(private router: Router) {}

  get filteredCommandes() {
    return this.commandes.filter(commande => {
      const matchesSearch = commande.client.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           commande.id.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatut = this.selectedStatut === '' || this.selectedStatut === 'Toutes' || commande.statut === this.selectedStatut;
      return matchesSearch && matchesStatut;
    });
  }

  onStatutChange(statut: string): void {
    this.selectedStatut = statut;
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'Livré': return 'badge-success';
      case 'En cours': return 'badge-warning';
      case 'En attente': return 'badge-info';
      case 'Annulé': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }
}
