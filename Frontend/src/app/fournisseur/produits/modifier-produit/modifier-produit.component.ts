import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modifier-produit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modifier-produit.component.html',
  styleUrls: ['./modifier-produit.component.css']
})
export class ModifierProduitComponent {
  produitId: number = 0;
  produit = {
    nom: 'Frein à disque avant',
    description: 'Frein à disque haute performance pour véhicules de tourisme',
    categorie: 'Freinage',
    prix: 89.99,
    stock: 45,
    reference: 'FR-12345',
    marque: 'Bosch',
    image: null as File | null
  };

  categories = ['Freinage', 'Filtration', 'Électrique', 'Suspension', 'Allumage', 'Moteur', 'Refroidissement', 'Transmission'];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.route.params.subscribe(params => {
      this.produitId = params['id'];
      // Ici, charger les données du produit depuis l'API
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.produit.image = input.files[0];
    }
  }

  onSubmit(): void {
    console.log('Produit modifié:', this.produit);
    alert('Produit modifié avec succès (simulation)');
    this.router.navigate(['/fournisseur/produits']);
  }

  onCancel(): void {
    this.router.navigate(['/fournisseur/produits']);
  }
}
