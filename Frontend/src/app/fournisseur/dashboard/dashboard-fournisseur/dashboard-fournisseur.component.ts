import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-fournisseur',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-fournisseur.component.html',
  styleUrls: ['./dashboard-fournisseur.component.css']
})
export class DashboardFournisseurComponent {
  stats = {
    totalProduits: 156,
    totalCommandes: 89,
    produitsRupture: 12,
    chiffreAffaires: 45678
  };

  recentOrders = [
    { id: 'CMD-001', client: 'Jean Dupont', date: '2024-06-28', montant: 1250, statut: 'En cours' },
    { id: 'CMD-002', client: 'Marie Martin', date: '2024-06-28', montant: 890, statut: 'Livré' },
    { id: 'CMD-003', client: 'Pierre Bernard', date: '2024-06-27', montant: 2100, statut: 'En attente' },
    { id: 'CMD-004', client: 'Sophie Petit', date: '2024-06-27', montant: 560, statut: 'En cours' },
    { id: 'CMD-005', client: 'Luc Dubois', date: '2024-06-26', montant: 1780, statut: 'Livré' }
  ];

  lowStockProducts = [
    { id: 1, nom: 'Frein à disque avant', stock: 3, categorie: 'Freinage' },
    { id: 2, nom: 'Filtre à huile', stock: 5, categorie: 'Filtration' },
    { id: 3, nom: 'Batterie 12V', stock: 2, categorie: 'Électrique' },
    { id: 4, nom: 'Amortisseur arrière', stock: 4, categorie: 'Suspension' },
    { id: 5, nom: 'Bougie d\'allumage', stock: 8, categorie: 'Allumage' }
  ];

  topSellingProducts = [
    { id: 1, nom: 'Kit plaquettes frein', ventes: 45, revenus: 11250 },
    { id: 2, nom: 'Filtre à air', ventes: 38, revenus: 7600 },
    { id: 3, nom: 'Huile moteur 5W30', ventes: 32, revenus: 6400 },
    { id: 4, nom: 'Batterie 12V', ventes: 28, revenus: 8400 },
    { id: 5, nom: 'Essuie-glaces', ventes: 25, revenus: 3750 }
  ];

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'Livré': return 'badge-success';
      case 'En cours': return 'badge-warning';
      case 'En attente': return 'badge-info';
      default: return 'badge-secondary';
    }
  }

  getRandomTrend(): number {
    return Math.floor(Math.random() * 20) + 5;
  }
}
