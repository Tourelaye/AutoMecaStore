import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanierService } from '../../core/services/panier.service';
import { HomeService, Produit as HomeProduit } from '../../core/services/home.service';

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

  isLoading = true;
  errorMessage = '';
  produitAjoute: number | null = null;
  timers: TimerDisplay[] = [];
  private intervalId: any;

  produits: PlusVenduProduit[] = [];

  constructor(
    private panierService: PanierService,
    private homeService: HomeService
  ) {}

  ngOnInit(): void {
    this.loadBestSellers();
    this.intervalId = setInterval(() => this.updateTimers(), 1000);
  }

  loadBestSellers(): void {
    this.homeService.getBestSellers(6).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.produits = response.data.map((p: HomeProduit, i: number) => this.mapToPlusVendu(p, i));
          this.updateTimers();
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des bestsellers:', err);
        this.errorMessage = 'Impossible de charger les produits les plus vendus.';
        this.isLoading = false;
      }
    });
  }

  private mapToPlusVendu(p: HomeProduit, index: number): PlusVenduProduit {
    const prixNouveau = p.prix_promo || p.prix;
    const prixAncien = p.prix_promo ? p.prix : null;

    // Badge selon le rang
    let badge = '🔥 Recommandé';
    if (index === 0) badge = '🏆 Top ventes';
    else if (index === 1) badge = '⭐ Populaire';
    else if (index === 2) badge = '💎 Premium';

    return {
      id: p.id,
      nom: p.nom,
      marque: p.marque || 'AutoMecaStore',
      image: p.image_url || null,
      prixNouveau,
      prixAncien,
      note: p.note_moyenne ?? 0,
      avis: p.nombre_avis ?? 0,
      badge,
      expirationDate: this.addHours(24, 0), // 24h par défaut
      stock: p.stock,
      livraison: true,
      rang: index + 1,
      ventesSemaine: p.nombre_ventes || 0
    };
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

    const p = {
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
    this.panierService.ajouterProduit(p as any);

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