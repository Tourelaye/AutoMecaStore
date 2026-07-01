import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-details-produit',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './details-produit.component.html',
  styleUrls: ['./details-produit.component.css']
})
export class DetailsProduitComponent {
  produitId: number = 0;
  produit = {
    id: 1,
    nom: 'Frein à disque avant',
    description: 'Frein à disque haute performance pour véhicules de tourisme. Conçu pour offrir une freinage optimal et une durabilité exceptionnelle.',
    categorie: 'Freinage',
    prix: 89.99,
    stock: 45,
    reference: 'FR-12345',
    marque: 'Bosch',
    dateAjout: '2024-01-15',
    ventes: 128,
    statut: 'Actif'
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.route.params.subscribe(params => {
      this.produitId = params['id'];
    });
  }

  modifierProduit(): void {
    this.router.navigate(['/fournisseur/produits/modifier', this.produitId]);
  }

  supprimerProduit(): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      alert('Produit supprimé (simulation)');
      this.router.navigate(['/fournisseur/produits']);
    }
  }

  getStatutClass(statut: string): string {
    return statut === 'Actif' ? 'badge-success' : 'badge-secondary';
  }
}
