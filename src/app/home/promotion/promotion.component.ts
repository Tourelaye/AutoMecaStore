import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HomeService, Produit } from '../../core/services/home.service';

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

  produits: PromoProduct[] = [];

  // Timers en temps réel, un par produit
  timers: TimerDisplay[] = [];

  isLoading = true;
  errorMessage = '';

  private intervalId: any;

  constructor(private homeService: HomeService) {}

  ngOnInit(): void {
    this.loadFlashSales();

    // Met à jour toutes les secondes
    this.intervalId = setInterval(() => this.updateTimers(), 1000);
  }

  loadFlashSales(): void {
    this.homeService.getFlashSales().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.produits = response.data.map((p: Produit) => this.mapToPromoProduct(p));
          this.updateTimers();
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des ventes flash:', err);
        this.errorMessage = 'Impossible de charger les promotions.';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private mapToPromoProduct(p: Produit): PromoProduct {
    const prixOriginal = p.prix;
    const prixPromo = p.prix_promo || p.prix;
    const discount = p.pourcentage_reduction || 0;

    // Calculer le prix original barré si on a un pourcentage de réduction
    const prixAncien = discount > 0 ? prixOriginal : (prixOriginal * 1.3);
    const prixNouveau = prixPromo;

    // Date d'expiration de la promo
    const expirationDate = p.date_fin_promo
      ? new Date(p.date_fin_promo)
      : this.addHours(24, 0); // 24h par défaut si pas de date

    return {
      id: p.id,
      nom: p.nom,
      image: p.image_url || null,
      prixAncien,
      prixNouveau,
      discount,
      stock: p.stock,
      stockRestant: Math.floor(p.stock * 0.5), // Simulation pour la barre de progression
      expirationDate,
      categorie: p.categorie_nom || 'Pièce'
    };
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