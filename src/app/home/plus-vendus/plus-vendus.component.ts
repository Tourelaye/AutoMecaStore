import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanierService } from '../../core/services/panier.service';
import { Produit } from '../../models/produit.model';
// import { ProduitService } from '../../../core/services/produit.service'; // ← décommenter quand Django prêt

export interface PlusVenduProduit {
  id: number;
  nom: string;
  marque: string;
  image: string | null;
  prixNouveau: number;
  prixAncien: number | null;
  note: number;
  avis: number;
  badge: string;
  expirationDate: Date;
  stock: number;
  livraison: boolean;
  rang: number;
  ventesSemaine: number; // nombre de ventes cette semaine
}

interface TimerDisplay {
  heures: string;
  minutes: string;
  secondes: string;
  expired: boolean;
}

@Component({
  selector: 'app-plus-vendus',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './plus-vendus.component.html',
  styleUrls: ['./plus-vendus.component.css']
})
export class PlusVendusComponent implements OnInit, OnDestroy {

  isLoading = false;
  errorMessage = '';
  produitAjoute: number | null = null;
  timers: TimerDisplay[] = [];
  private intervalId: any;

  produits: PlusVenduProduit[] = [];

  constructor(private panierService: PanierService) {}

  ngOnInit(): void {

    // -------------------------------------------------------
    // MOCK DATA — remplacer par appel API quand Django prêt
    // -------------------------------------------------------
    this.produits = [
      {
        id: 1,
        nom: 'Huile moteur Castrol 5W30',
        marque: 'CASTROL',
        image: 'assets/products/filter.png',
        prixNouveau: 12.99,
        prixAncien: 18.99,
        note: 5,
        avis: 412,
        badge: '🏆 Top ventes',
        expirationDate: this.addHours(12, 45),
        stock: 32,
        livraison: true,
        rang: 1,
        ventesSemaine: 847
      },
      {
        id: 2,
        nom: 'Filtre à air universel',
        marque: 'BOSCH',
        image: 'assets/products/brake.png',
        prixNouveau: 24.99,
        prixAncien: 34.99,
        note: 4,
        avis: 287,
        badge: '⭐ Populaire',
        expirationDate: this.addHours(8, 20),
        stock: 5,
        livraison: true,
        rang: 2,
        ventesSemaine: 623
      },
      {
        id: 3,
        nom: 'Plaquettes de frein Brembo',
        marque: 'BREMBO',
        image: 'assets/products/shock.png',
        prixNouveau: 49.99,
        prixAncien: null,
        note: 4,
        avis: 195,
        badge: '🔥 Recommandé',
        expirationDate: this.addHours(5, 10),
        stock: 18,
        livraison: false,
        rang: 3,
        ventesSemaine: 498
      },
      {
        id: 4,
        nom: 'Kit vidange complet',
        marque: 'TOTAL',
        image: 'assets/products/kit.png',
        prixNouveau: 39.99,
        prixAncien: 54.99,
        note: 5,
        avis: 163,
        badge: '💎 Premium',
        expirationDate: this.addHours(3, 30),
        stock: 2,
        livraison: true,
        rang: 4,
        ventesSemaine: 341
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
    //     this.produits = list.slice(0, 6).map((p: any, i: number) => ({
    //       id: p.id,
    //       nom: p.nom,
    //       marque: p.marque ?? 'AutoMecaStore',
    //       image: p.image ?? null,
    //       prixNouveau: parseFloat(p.prix_promo ?? p.prix),
    //       prixAncien: p.prix_promo ? parseFloat(p.prix) : null,
    //       note: 4 + Math.random(),
    //       avis: Math.floor(Math.random() * 400) + 100,
    //       badge: i === 0 ? '🏆 Top ventes' : i === 1 ? '⭐ Populaire' : '🔥 Recommandé',
    //       expirationDate: this.addHours(6 + i * 2, 0),
    //       stock: p.stock,
    //       livraison: true,
    //       rang: i + 1,
    //       ventesSemaine: Math.floor(Math.random() * 800) + 200
    //     }));
    //     this.updateTimers();
    //     this.intervalId = setInterval(() => this.updateTimers(), 1000);
    //     this.isLoading = false;
    //   },
    //   error: () => {
    //     this.errorMessage = 'Impossible de charger les produits.';
    //     this.isLoading = false;
    //   }
    // });
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  // -------------------------------------------------------
  // Timer temps réel
  // -------------------------------------------------------
  private updateTimers(): void {
    const now = new Date().getTime();
    this.timers = this.produits.map(p => {
      const diff = p.expirationDate.getTime() - now;
      if (diff <= 0) {
        return { heures: '00', minutes: '00', secondes: '00', expired: true };
      }
      const total = Math.floor(diff / 1000);
      return {
        heures: Math.floor(total / 3600).toString().padStart(2, '0'),
        minutes: Math.floor((total % 3600) / 60).toString().padStart(2, '0'),
        secondes: (total % 60).toString().padStart(2, '0'),
        expired: false
      };
    });
  }

  private addHours(h: number, m: number = 0): Date {
    const d = new Date();
    d.setHours(d.getHours() + h);
    d.setMinutes(d.getMinutes() + m);
    return d;
  }

  // -------------------------------------------------------
  // Étoiles
  // -------------------------------------------------------
  getEtoiles(note: number): number[] {
    return [1, 2, 3, 4, 5];
  }

  isPleine(i: number, note: number): boolean {
    return i <= Math.floor(note);
  }

  isDemi(i: number, note: number): boolean {
    return i === Math.ceil(note) && note % 1 >= 0.5;
  }

  // -------------------------------------------------------
  // Panier
  // -------------------------------------------------------
  ajouterAuPanier(produit: PlusVenduProduit, event: Event): void {
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

  isStockFaible(p: PlusVenduProduit): boolean {
    return p.stock > 0 && p.stock <= 5;
  }

  // Médaille selon le rang
  getMedaille(rang: number): string {
    if (rang === 1) return '🥇';
    if (rang === 2) return '🥈';
    if (rang === 3) return '🥉';
    return `#${rang}`;
  }
}