import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanierService } from '../../core/services/panier.service';
import { Produit } from '../../models/produit.model';
// import { ProduitService } from '../../../core/services/produit.service'; // ← décommenter quand Django prêt

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

  isLoading = false;
  errorMessage = '';
  produitAjoute: number | null = null;

  // Timer global 24h (affiché dans le header)
  timerGlobal: TimerDisplay = { heures: '00', minutes: '00', secondes: '00', expired: false, urgence: false };

  // Timers individuels par produit
  timers: TimerDisplay[] = [];

  private intervalId: any;
  private expirationGlobale!: Date;

  produits: VenteEclairProduit[] = [];

  constructor(private panierService: PanierService) {}

  ngOnInit(): void {

    // Expiration globale dans 24h
    this.expirationGlobale = this.addHours(24);

    // -------------------------------------------------------
    // MOCK DATA
    // -------------------------------------------------------
    this.produits = [
      {
        id: 1,
        nom: 'Huile moteur Castrol 5W30',
        marque: 'CASTROL',
        image: 'assets/products/filter.png',
        prixNouveau: 12.99,
        prixAncien: 18.99,
        discount: 30,
        stock: 3,
        stockTotal: 20,
        livraison: true,
        expirationDate: this.addHours(2, 45)
      },
      {
        id: 2,
        nom: 'Plaquettes de frein Brembo',
        marque: 'BREMBO',
        image: 'assets/products/brake.png',
        prixNouveau: 34.99,
        prixAncien: 49.99,
        discount: 30,
        stock: 7,
        stockTotal: 15,
        livraison: true,
        expirationDate: this.addHours(5, 10)
      },
      {
        id: 3,
        nom: 'Amortisseur Monroe avant',
        marque: 'MONROE',
        image: 'assets/products/shock.png',
        prixNouveau: 59.99,
        prixAncien: 84.99,
        discount: 29,
        stock: 1,
        stockTotal: 10,
        livraison: false,
        expirationDate: this.addHours(0, 48)   // moins d'1h → urgence max
      },
      {
        id: 4,
        nom: 'Kit distribution Gates',
        marque: 'GATES',
        image: 'assets/products/kit.png',
        prixNouveau: 149.99,
        prixAncien: 209.99,
        discount: 29,
        stock: 5,
        stockTotal: 12,
        livraison: true,
        expirationDate: this.addHours(8, 0)
      }
    ];

    this.updateTimers();
    this.intervalId = setInterval(() => this.updateTimers(), 1000);

    // -------------------------------------------------------
    // APPEL API DJANGO — décommenter quand les produits existent
    // -------------------------------------------------------
    // this.isLoading = true;
    // this.produitService.getProduits().subscribe({
    //   next: (data: any) => {
    //     const list = Array.isArray(data) ? data : data.results;
    //     this.produits = list
    //       .filter((p: any) => p.est_en_promo)
    //       .slice(0, 6)
    //       .map((p: any, i: number) => ({
    //         id: p.id,
    //         nom: p.nom,
    //         marque: p.marque ?? 'AutoMecaStore',
    //         image: p.image ?? null,
    //         prixNouveau: parseFloat(p.prix_promo ?? p.prix),
    //         prixAncien: parseFloat(p.prix),
    //         discount: Math.round((1 - (p.prix_promo ?? p.prix) / p.prix) * 100),
    //         stock: p.stock,
    //         stockTotal: p.stock + Math.floor(Math.random() * 10),
    //         livraison: true,
    //         expirationDate: p.date_fin_promo
    //           ? new Date(p.date_fin_promo)
    //           : this.addHours(6 + i)
    //       }));
    //     this.updateTimers();
    //     this.isLoading = false;
    //   },
    //   error: () => {
    //     this.errorMessage = 'Impossible de charger les ventes éclair.';
    //     this.isLoading = false;
    //   }
    // });
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
    this.timerGlobal = this.computeTimer(this.expirationGlobale, now);

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

  private addHours(h: number, m: number = 0): Date {
    const d = new Date();
    d.setHours(d.getHours() + h);
    d.setMinutes(d.getMinutes() + m);
    return d;
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
  // Panier
  // -------------------------------------------------------
  // ajouterAuPanier(produit: VenteEclairProduit, event: Event): void {
  //   event.stopPropagation();
  //   if (produit.stock === 0) return;

  //   this.panierService.ajouterAuPanier({
  //     produit: produit.id,
  //     nom: produit.nom,
  //     prix: produit.prixNouveau,
  //     quantite: 1,
  //     image: produit.image ?? undefined
  //   });

  //   this.produitAjoute = produit.id;
  //   setTimeout(() => {
  //     if (this.produitAjoute === produit.id) this.produitAjoute = null;
  //   }, 1500);
  // }
  ajouterAuPanier(produit: VenteEclairProduit, event: Event): void {
    event.stopPropagation();
    if (produit.stock === 0) return;

    const p: Produit & { quantite: number } = {
      id: produit.id,
      nom: produit.nom,
      description: '',
      prix: produit.prixNouveau,
      stock: produit.stock,
      image: produit.image,
      categorie: null,
      gestionnaire_stock: null,
      quantite: 1
    };
    this.panierService.ajouterProduit(p);

    this.produitAjoute = produit.id;
    setTimeout(() => {
      if (this.produitAjoute === produit.id) this.produitAjoute = null;
    }, 1500);
  }
}