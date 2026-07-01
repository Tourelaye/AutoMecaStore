import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ajouter-produit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ajouter-produit.component.html',
  styleUrls: ['./ajouter-produit.component.css']
})
export class AjouterProduitComponent {
  produit = {
    nom: '',
    description: '',
    categorie: '',
    prix: 0,
    stock: 0,
    reference: '',
    marque: '',
    image: null as File | null
  };

  categories = ['Freinage', 'Filtration', 'Électrique', 'Suspension', 'Allumage', 'Moteur', 'Refroidissement', 'Transmission'];

  constructor(private router: Router) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.produit.image = input.files[0];
    }
  }

  onSubmit(): void {
    console.log('Produit à ajouter:', this.produit);
    alert('Produit ajouté avec succès (simulation)');
    this.router.navigate(['/fournisseur/produits']);
  }

  onCancel(): void {
    this.router.navigate(['/fournisseur/produits']);
  }
}
