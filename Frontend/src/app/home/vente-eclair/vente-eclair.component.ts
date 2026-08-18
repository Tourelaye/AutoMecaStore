import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { PanierService } from '../../core/services/panier.service';
import { HomeService, Produit as HomeProduit } from '../../core/services/home.service';

export interface VenteEclairProduit {
  id: number;
  nom: string;
  marque: string;
  image: string | null;
  prixNouveau: number;
  prixAncien: number;
  discount: number;
  stock: number;
  stockTotal: number;
  livraison: boolean;
  expirationDate: Date;  // timer individuel par produit
  heureFin: string;      // heure de fin de la vente éclair
}

interface TimerDisplay {
  heures: string;
  minutes: string;
  secondes: string;
  expired: boolean;
  urgence: boolean; // moins de 1h restante
}

@Component({
  selector: 'app-vente-eclair',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './vente-eclair.component.html',
  styleUrls: ['./vente-eclair.component.css']
})
export class VenteEclairComponent implements OnInit, OnDestroy {

  isLoading = true;
  errorMessage = '';
  produitAjoute: number | null = null;

  // Timer global basé sur l'heure de fin de la vente éclair
  timerGlobal: TimerDisplay = { heures: '00', minutes: '00', secondes: '00', expired: false, urgence: false };

  // Timers individuels par produit
  timers: TimerDisplay[] = [];

  private intervalId: any;
  private expirationGlobale!: Date;

  produits: VenteEclairProduit[] = [];

  constructor(
    private panierService: PanierService,
    private homeService: HomeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFlashDeals();
  }

  loadFlashDeals(): void {
    this.homeService.getFlashDeals().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.produits = response.data.map((p: HomeProduit) => this.mapToVenteEclair(p));
          
          // Définir l'expiration globale basée sur le produit le plus proche de la fin
          if (this.produits.length > 0) {
            const now = new Date();
            const finProduits = this.produits.map(prod => {
              const [hours, minutes] = prod.heureFin.split(':').map(Number);
              const fin = new Date();
              fin.setHours(hours, minutes, 0, 0);
              return fin;
            });
            this.expirationGlobale = finProduits.reduce((a, b) => a < b ? a : b);
          }
          
          this.updateTimers();
          this.intervalId = setInterval(() => this.updateTimers(), 1000);
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des ventes éclair:', err);
        this.errorMessage = 'Impossible de charger les ventes éclair.';
        this.isLoading = false;
      }
    });
  }

  private mapToVenteEclair(p: HomeProduit): VenteEclairProduit {
    const prixNouveau = p.prix_promo || p.prix;
    const prixAncien = p.prix;
    const discount = p.pourcentage_reduction || (p.prix_promo ? Math.round((1 - p.prix_promo / p.prix) * 100) : 0);

    // Heure de fin de la vente éclair
    const heureFin = p.heure_fin_eclair || '18:00';
    
    // Calculer l'expiration basée sur l'heure de fin aujourd'hui
    const [hours, minutes] = heureFin.split(':').map(Number);
    const expirationDate = new Date();
    expirationDate.setHours(hours, minutes, 0, 0);

    return {
      id: p.id,
      nom: p.nom,
      marque: p.marque || 'AutoMecaStore',
      image: p.image_url || null,
      prixNouveau,
      prixAncien,
      discount,
      stock: p.stock,
      stockTotal: p.stock + Math.floor(Math.random() * 10), // Simulation
      livraison: true,
      expirationDate,
      heureFin
    };
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  // -------------------------------------------------------
  // Timers
  // -------------------------------------------------------
  private updateTimers(): void {
    const now = new Date().getTime();

    // Timer global
    if (this.expirationGlobale) {
      this.timerGlobal = this.computeTimer(this.expirationGlobale, now);
    }

    // Timers par produit
    this.timers = this.produits.map(p => this.computeTimer(p.expirationDate, now));
  }

  private computeTimer(expiration: Date, now: number): TimerDisplay {
    const diff = expiration.getTime() - now;
    if (diff <= 0) {
      return { heures: '00', minutes: '00', secondes: '00', expired: true, urgence: false };
    }
    const total = Math.floor(diff / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return {
      heures: h.toString().padStart(2, '0'),
      minutes: m.toString().padStart(2, '0'),
      secondes: s.toString().padStart(2, '0'),
      expired: false,
      urgence: h < 1  // moins d'une heure
    };
  }

  // -------------------------------------------------------
  // Stock : pourcentage vendu
  // -------------------------------------------------------
  getStockVenduPct(p: VenteEclairProduit): number {
    const vendu = p.stockTotal - p.stock;
    return Math.min(100, Math.round((vendu / p.stockTotal) * 100));
  }

  isStockCritique(p: VenteEclairProduit): boolean {
    return p.stock > 0 && p.stock <= 3;
  }

  // -------------------------------------------------------
  // Navigation & Panier
  // -------------------------------------------------------
  goToProduit(id: number): void {
    this.router.navigate(['/produits'], { queryParams: { id } });
  }

  ajouterAuPanier(produit: VenteEclairProduit, event: Event): void {
    event.stopPropagation();
    if (produit.stock === 0) return;
    // Redirige vers la fiche produit pour laisser le client choisir l'offre/magasin
    this.goToProduit(produit.id);
  }
}