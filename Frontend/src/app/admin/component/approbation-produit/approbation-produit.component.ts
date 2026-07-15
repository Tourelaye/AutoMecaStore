import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApprobationProduitService, Produit } from '../../../admin/service/approbation-produit.service';

@Component({
  selector: 'app-approbation-produit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approbation-produit.component.html',
  styleUrls: ['./approbation-produit.component.css']
})
export class ApprobationProduitComponent implements OnInit {
  produitsEnAttente: Produit[] = [];
  produitSelectionne: Produit | null = null;
  motifRejet: string = '';
  loading: boolean = false;
  showRejetModal: boolean = false;

  constructor(private approbationService: ApprobationProduitService) {}

  ngOnInit(): void {
    this.chargerProduitsEnAttente();
  }

  chargerProduitsEnAttente(): void {
    this.loading = true;
    this.approbationService.getProduitsEnAttente().subscribe({
      next: (produits: Produit[]) => {
        this.produitsEnAttente = produits;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des produits en attente:', error);
        this.loading = false;
      }
    });
  }

  approuverProduit(produit: Produit): void {
    if (!confirm(`Voulez-vous vraiment approuver le produit "${produit.nom}" ?`)) {
      return;
    }

    this.approbationService.approuverProduit(produit.id).subscribe({
      next: (produitApprouve: Produit) => {
        // Retirer le produit de la liste
        this.produitsEnAttente = this.produitsEnAttente.filter(p => p.id !== produit.id);
        alert('Produit approuvé avec succès !');
      },
      error: (error: any) => {
        console.error('Erreur lors de l\'approbation:', error);
        alert('Erreur lors de l\'approbation du produit.');
      }
    });
  }

  ouvrirModalRejet(produit: Produit): void {
    this.produitSelectionne = produit;
    this.motifRejet = '';
    this.showRejetModal = true;
  }

  fermerModalRejet(): void {
    this.showRejetModal = false;
    this.produitSelectionne = null;
    this.motifRejet = '';
  }

  rejeterProduit(): void {
    if (!this.produitSelectionne || !this.motifRejet.trim()) {
      alert('Veuillez fournir un motif de rejet.');
      return;
    }

    this.approbationService.rejeterProduit(this.produitSelectionne.id, this.motifRejet).subscribe({
      next: (produitRejete: Produit) => {
        // Retirer le produit de la liste
        this.produitsEnAttente = this.produitsEnAttente.filter(p => p.id !== this.produitSelectionne!.id);
        this.fermerModalRejet();
        alert('Produit rejeté avec succès !');
      },
      error: (error: any) => {
        console.error('Erreur lors du rejet:', error);
        alert('Erreur lors du rejet du produit.');
      }
    });
  }

  getImageUrl(image?: string): string {
    if (!image) return 'assets/images/placeholder-product.png';
    if (image.startsWith('http')) return image;
    return `http://127.0.0.1:8000${image}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder-product.png';
  }
}
