import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
// import { ProduitService } from '../../../core/services/produit.service'; // ← décommenter quand Django est prêt

export interface PromoProduct {
  id: number;
  nom: string;
  image: string | null;
  prixAncien: number;
  prixNouveau: number;
  discount: number;       // pourcentage de réduction
  stock: number;          // stock total
  stockRestant: number;   // stock restant (pour la barre de progression)
  expirationDate: Date;   // date d'expiration de l'offre
  categorie: string;
}

interface TimerDisplay {
  heures: string;
  minutes: string;
  secondes: string;
  expired: boolean;
}

@Component({
  selector: 'app-promotion',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './promotion.component.html',
  styleUrls: ['./promotion.component.css']
})
export class PromotionComponent implements OnInit, OnDestroy {

  // -------------------------------------------------------
  // MOCK DATA — remplacer par l'appel API quand Django prêt
  // -------------------------------------------------------
  produits: PromoProduct[] = [
    {
      id: 1,
      nom: 'Kit Freinage',
      image: null,
      prixAncien: 129.99,
      prixNouveau: 89.99,
      discount: 31,
      stock: 20,
      stockRestant: 9,
      expirationDate: this.addHours(2, 45),
      categorie: 'Automobile'
    },
    {
      id: 2,
      nom: 'Batterie 12V',
      image: null,
      prixAncien: 159.99,
      prixNouveau: 119.99,
      discount: 25,
      stock: 10,
      stockRestant: 3,
      expirationDate: this.addHours(1, 20),
      categorie: 'Automobile'
    },
    {
      id: 3,
      nom: 'Kit Embrayage',
      image: null,
      prixAncien: 299.99,
      prixNouveau: 199.99,
      discount: 33,
      stock: 15,
      stockRestant: 11,
      expirationDate: this.addHours(4, 15),
      categorie: 'Moto & Scooter'
    }
  ];

  // Timers en temps réel, un par produit
  timers: TimerDisplay[] = [];

  isLoading = false;
  errorMessage = '';

  private intervalId: any;

  constructor(
    // private produitService: ProduitService  // ← décommenter quand Django prêt
  ) {}

  ngOnInit(): void {
    // Initialise les timers
    this.updateTimers();

    // Met à jour toutes les secondes
    this.intervalId = setInterval(() => this.updateTimers(), 1000);

    // -------------------------------------------------------
    // APPEL API DJANGO — décommenter quand les produits existent
    // -------------------------------------------------------
    // this.isLoading = true;
    // this.produitService.getProduits().subscribe({
    //   next: (data: any) => {
    //     const produits = Array.isArray(data) ? data : data.results;
    //     this.produits = produits.slice(0, 4).map((p: any, i: number) => ({
    //       id: p.id,
    //       nom: p.nom,
    //       image: p.image ?? null,
    //       prixAncien: parseFloat(p.prix) * 1.3,
    //       prixNouveau: parseFloat(p.prix),
    //       discount: 30,
    //       stock: p.stock,
    //       stockRestant: Math.floor(p.stock * 0.4),
    //       expirationDate: this.addHours(2 + i, 0),
    //       categorie: p.categorie?.nom ?? 'Pièce'
    //     }));
    //     this.updateTimers();
    //     this.isLoading = false;
    //   },
    //   error: () => {
    //     this.errorMessage = 'Impossible de charger les promotions.';
    //     this.isLoading = false;
    //   }
    // });
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  // -------------------------------------------------------
  // Calcule et met à jour les timers
  // -------------------------------------------------------
  private updateTimers(): void {
    const now = new Date().getTime();

    this.timers = this.produits.map(p => {
      const diff = p.expirationDate.getTime() - now;

      if (diff <= 0) {
        return { heures: '00', minutes: '00', secondes: '00', expired: true };
      }

      const totalSeconds = Math.floor(diff / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      return {
        heures: h.toString().padStart(2, '0'),
        minutes: m.toString().padStart(2, '0'),
        secondes: s.toString().padStart(2, '0'),
        expired: false
      };
    });
  }

  // -------------------------------------------------------
  // Calcule le pourcentage de stock vendu (pour la barre)
  // -------------------------------------------------------
  getProgressPercent(produit: PromoProduct): number {
    const vendu = produit.stock - produit.stockRestant;
    return Math.min(100, Math.round((vendu / produit.stock) * 100));
  }

  getStockVendu(produit: PromoProduct): number {
    return produit.stock - produit.stockRestant;
  }

  // -------------------------------------------------------
  // Utilitaire : ajouter des heures/minutes à maintenant
  // -------------------------------------------------------
  private addHours(hours: number, minutes: number = 0): Date {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  }
}