import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-liste-produits',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './liste-produits.component.html',
  styleUrls: ['./liste-produits.component.css']
})
export class ListeProduitsComponent {
  produits = [
    { id: 1, nom: 'Frein à disque avant', categorie: 'Freinage', prix: 89.99, stock: 45, statut: 'Actif' },
    { id: 2, nom: 'Filtre à huile', categorie: 'Filtration', prix: 12.50, stock: 120, statut: 'Actif' },
    { id: 3, nom: 'Batterie 12V', categorie: 'Électrique', prix: 129.99, stock: 3, statut: 'Actif' },
    { id: 4, nom: 'Amortisseur arrière', categorie: 'Suspension', prix: 79.99, stock: 28, statut: 'Actif' },
    { id: 5, nom: 'Bougie d\'allumage', categorie: 'Allumage', prix: 8.99, stock: 8, statut: 'Actif' },
    { id: 6, nom: 'Kit plaquettes frein', categorie: 'Freinage', prix: 45.00, stock: 67, statut: 'Actif' },
    { id: 7, nom: 'Courroie de distribution', categorie: 'Moteur', prix: 35.99, stock: 15, statut: 'Inactif' },
    { id: 8, nom: 'Pompe à eau', categorie: 'Refroidissement', prix: 55.00, stock: 22, statut: 'Actif' }
  ];

  searchTerm = '';
  selectedCategorie = '';
  categories = ['Toutes', 'Freinage', 'Filtration', 'Électrique', 'Suspension', 'Allumage', 'Moteur', 'Refroidissement'];

  constructor(private router: Router) {}

  get filteredProduits() {
    return this.produits.filter(produit => {
      const matchesSearch = produit.nom.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCategorie = this.selectedCategorie === '' || this.selectedCategorie === 'Toutes' || produit.categorie === this.selectedCategorie;
      return matchesSearch && matchesCategorie;
    });
  }

  onCategorieChange(categorie: string): void {
    this.selectedCategorie = categorie;
  }

  modifierProduit(id: number): void {
    this.router.navigate(['/fournisseur/produits/modifier', id]);
  }

  supprimerProduit(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      this.produits = this.produits.filter(p => p.id !== id);
    }
  }

  getStatutClass(statut: string): string {
    return statut === 'Actif' ? 'badge-success' : 'badge-secondary';
  }

  getStockClass(stock: number): string {
    if (stock <= 5) return 'stock-critical';
    if (stock <= 15) return 'stock-low';
    return 'stock-ok';
  }
}
