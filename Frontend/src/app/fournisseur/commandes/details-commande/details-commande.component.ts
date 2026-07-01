import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-details-commande',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './details-commande.component.html',
  styleUrls: ['./details-commande.component.css']
})
export class DetailsCommandeComponent {
  commandeId: string = '';
  commande = {
    id: 'CMD-001',
    client: {
      nom: 'Jean Dupont',
      email: 'jean.dupont@email.com',
      telephone: '+33 6 12 34 56 78',
      adresse: '123 Rue de la Paix, 75001 Paris'
    },
    date: '2024-06-28',
    montant: 1250,
    statut: 'En cours',
    produits: [
      { nom: 'Frein à disque avant', quantite: 2, prix: 89.99 },
      { nom: 'Filtre à huile', quantite: 1, prix: 12.50 },
      { nom: 'Batterie 12V', quantite: 1, prix: 129.99 }
    ],
    livraison: {
      methode: 'Standard',
      adresse: '123 Rue de la Paix, 75001 Paris',
      dateEstimee: '2024-07-02'
    }
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.route.params.subscribe(params => {
      this.commandeId = params['id'];
    });
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

  updateStatut(newStatut: string): void {
    this.commande.statut = newStatut;
    alert(`Statut mis à jour: ${newStatut}`);
  }
}
