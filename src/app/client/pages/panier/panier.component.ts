import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

import { PanierService } from '../../../core/services/panier.service';
import { CommandeClientService } from '../../../core/services/commande-client.service';
import { MonCompteService, PanierItem as BackendPanierItem } from '../../../core/services/mon-compte.service';
import { PanierItem } from '../../../models/panier.model';
import { AuthService } from '../../../core/services/auth.service';

type ModeLivraison = 'standard' | 'express' | 'retrait';

@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './panier.component.html',
  styleUrls: ['./panier.component.css'],
  animations: [
    trigger('pageAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('itemAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-24px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(30px)', height: 0, margin: 0, padding: 0 }))
      ])
    ]),
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger('60ms', animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })))
        ], { optional: true })
      ])
    ])
  ]
})
export class PanierComponent implements OnInit, OnDestroy {

  items: PanierItem[] = [];
  private sub!: Subscription;

  // Code promo
  codePromo = '';
  promoAppliquee = false;
  promoErreur = false;
  remisePromo = 0;
  readonly CODES_VALIDES: Record<string, number> = {
    'AUTO10': 10,
    'MECA20': 20,
    'STORE15': 15
  };

  // Livraison
  modeLivraison: ModeLivraison = 'standard';
  optionsLivraison: { key: ModeLivraison; label: string; prix: number; delai: string }[] = [
    { key: 'standard', label: 'Livraison standard',  prix: 4.99,  delai: '3-5 jours ouvrés' },
    { key: 'express',  label: 'Livraison express',   prix: 9.99,  delai: '24-48h' },
    { key: 'retrait',  label: 'Retrait en magasin',  prix: 0,     delai: 'Disponible sous 2h' }
  ];

  // Suppression en cours (pour animation)
  suppressionEnCours: number | null = null;

  // État de la commande
  isCommandeEnCours = false;
  commandeErreur = '';
  commandeSucces = false;
  commandeConfirmee = false;
  commandeDetails: any = null;

  constructor(
    private panierService: PanierService,
    private commandeService: CommandeClientService,
    private router: Router,
    private authService: AuthService,
    private monCompteService: MonCompteService
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      // Use backend cart when authenticated
      this.monCompteService.getPanier().subscribe();
      this.sub = this.monCompteService.panier$.subscribe(panierResponse => {
        if (panierResponse) {
          this.items = panierResponse.items.map(item => ({
            id: item.id,
            produit: {
              id: item.produit_id,
              nom: item.produit_nom,
              prix: item.prix,
              image: item.image
            } as any,
            nom: item.produit_nom,
            prix: item.prix,
            quantite: item.quantite,
            favori: false
          }));
        } else {
          this.items = [];
        }
      });
    } else {
      // Use localStorage when not authenticated
      this.sub = this.panierService.items$.subscribe(items => {
        this.items = items;
      });
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // -------------------------------------------------------
  // Calculs
  // -------------------------------------------------------
  get sousTotal(): number {
    return this.items.reduce((sum, item) => sum + item.prix * item.quantite, 0);
  }

  get fraisLivraison(): number {
    const opt = this.optionsLivraison.find(o => o.key === this.modeLivraison);
    return opt ? opt.prix : 4.99;
  }

  get montantRemise(): number {
    return this.sousTotal * (this.remisePromo / 100);
  }

  get total(): number {
    return Math.max(0, this.sousTotal - this.montantRemise + this.fraisLivraison);
  }

  get nbArticles(): number {
    return this.items.reduce((sum, i) => sum + i.quantite, 0);
  }

  get delaiLivraison(): string {
    return this.optionsLivraison.find(o => o.key === this.modeLivraison)?.delai ?? '';
  }

  get livraisonGratuite(): boolean {
    return this.sousTotal >= 100;
  }

  get progressLivraisonGratuite(): number {
    return Math.min(100, (this.sousTotal / 100) * 100);
  }

  // -------------------------------------------------------
  // Quantités
  // -------------------------------------------------------
  increaseQty(item: PanierItem): void {
    if (this.authService.isLoggedIn()) {
      // Use backend when authenticated
      if (item.id !== undefined) {
        this.monCompteService.mettreAJourQuantite(item.id, item.quantite + 1).subscribe();
      }
    } else {
      // Use localStorage when not authenticated
      this.panierService.augmenterQuantite(item);
    }
  }

  decreaseQty(item: PanierItem): void {
    if (this.authService.isLoggedIn()) {
      // Use backend when authenticated
      if (item.id !== undefined && item.quantite > 1) {
        this.monCompteService.mettreAJourQuantite(item.id, item.quantite - 1).subscribe();
      }
    } else {
      // Use localStorage when not authenticated
      if (item.quantite <= 1) return;
      this.panierService.diminuerQuantite(item);
    }
  }

  // -------------------------------------------------------
  // Suppression
  // -------------------------------------------------------
  removeItem(item: PanierItem): void {
    this.suppressionEnCours = item.produit.id;
    setTimeout(() => {
      if (this.authService.isLoggedIn()) {
        // Use backend when authenticated
        if (item.id !== undefined) {
          this.monCompteService.supprimerDuPanier(item.id).subscribe();
        }
      } else {
        // Use localStorage when not authenticated
        this.panierService.supprimerLigne(item);
      }
      this.suppressionEnCours = null;
    }, 200);
  }

  viderPanier(): void {
    if (confirm('Vider tout le panier ?')) {
      if (this.authService.isLoggedIn()) {
        // For authenticated users, we need to delete all items one by one
        // or implement a bulk delete endpoint
        this.monCompteService.getPanier().subscribe(panier => {
          panier.items.forEach(item => {
            this.monCompteService.supprimerDuPanier(item.id).subscribe();
          });
        });
      } else {
        // Use localStorage when not authenticated
        this.panierService.viderPanier();
      }
    }
  }

  // -------------------------------------------------------
  // Favoris
  // -------------------------------------------------------
  toggleFavorite(item: PanierItem): void {
    this.panierService.toggleFavori(item);
  }

  // -------------------------------------------------------
  // Code promo
  // -------------------------------------------------------
  appliquerPromo(): void {
    const code = this.codePromo.trim().toUpperCase();
    if (this.CODES_VALIDES[code]) {
      this.remisePromo = this.CODES_VALIDES[code];
      this.promoAppliquee = true;
      this.promoErreur = false;
    } else {
      this.promoErreur = true;
      this.promoAppliquee = false;
      this.remisePromo = 0;
    }
  }

  retirerPromo(): void {
    this.codePromo = '';
    this.promoAppliquee = false;
    this.promoErreur = false;
    this.remisePromo = 0;
  }

  // -------------------------------------------------------
  // Commande
  // -------------------------------------------------------
  passerCommande(): void {
    console.log('🔍 passerCommande appelé');
    console.log('📦 Items:', this.items);
    console.log('🔐 Authentifié:', this.authService.isLoggedIn());
    
    if (this.items.length === 0) {
      this.commandeErreur = 'Votre panier est vide';
      console.log('❌ Panier vide');
      return;
    }

    if (!confirm('Confirmer votre commande ? Vous recevrez une confirmation par email.')) {
      console.log('❌ Utilisateur a annulé');
      return;
    }

    console.log('✅ Confirmation acceptée, création commande...');
    this.isCommandeEnCours = true;
    this.commandeErreur = '';
    this.commandeSucces = false;

    this.commandeService.creerCommandeDepuisPanier(this.items).subscribe({
      next: (commande) => {
        console.log('✅ Commande créée avec succès:', commande);
        this.commandeSucces = true;
        this.isCommandeEnCours = false;
        this.commandeConfirmee = true;
        this.commandeDetails = commande;
        console.log('🎉 commandeConfirmee:', this.commandeConfirmee);
        console.log('🎉 commandeDetails:', this.commandeDetails);
        
        // Vider le panier après commande réussie
        if (this.authService.isLoggedIn()) {
          console.log('🔐 Utilisateur authentifié, vidage backend...');
          // Clear backend cart
          this.monCompteService.getPanier().subscribe(panier => {
            console.log('📦 Panier backend:', panier);
            panier.items.forEach(item => {
              this.monCompteService.supprimerDuPanier(item.id).subscribe(() => {
                console.log('🗑️ Item supprimé:', item.id);
              });
            });
          });
        } else {
          console.log('🔓 Utilisateur non authentifié, vidage localStorage...');
          // Clear localStorage
          this.panierService.viderPanier();
        }
      },
      error: (err) => {
        console.error('❌ Erreur lors de la création de la commande:', err);
        this.commandeErreur = 'Erreur lors de la création de la commande. Veuillez réessayer.';
        this.isCommandeEnCours = false;
      }
    });
  }

  continuerAchats(): void {
    this.commandeConfirmee = false;
    this.commandeDetails = null;
    this.router.navigate(['/catalogue']);
  }

  voirMesCommandes(): void {
    this.commandeConfirmee = false;
    this.commandeDetails = null;
    this.router.navigate(['/mon-compte'], { fragment: 'commandes' });
  }

  // -------------------------------------------------------
  // Track
  // -------------------------------------------------------
  trackById(index: number, item: PanierItem): number {
    return item.produit.id;
  }
}