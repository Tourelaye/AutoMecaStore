import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { PanierService } from '../../../core/services/panier.service';
// import { AuthService, Utilisateur } from '../../../core/services/auth.service';
import { AuthService, Utilisateur } from '../../../core/services/auth.service';
import { ProduitService, Produit } from '../../../core/services/produit.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {

  // --- Panier ---
  totalPanier = 0;
  notification: string | null = null;

  // --- Auth ---
  isLoggedIn = false;
  utilisateur: Utilisateur | null = null;
  showUserMenu = false;

  // --- Recherche ---
  searchQuery = '';
  searchResults: Produit[] = [];
  showResults = false;
  isSearching = false;
  private searchSubject = new Subject<string>();

  // --- Timers & subscriptions ---
  private hideTimer: any;
  private subscriptions: Subscription[] = [];

  constructor(
    private panierService: PanierService,
    private authService: AuthService,
    private produitService: ProduitService,
    private router: Router
  ) {}

  ngOnInit(): void {

    // --- Abonnement au panier ---
    const sub1 = this.panierService.items$.subscribe((items) => {
      this.totalPanier = items.reduce((total, item) => total + item.quantite, 0);
    });

    // --- Abonnement aux notifications panier ---
    const sub2 = this.panierService.lastAdded$.subscribe((productName) => {
      if (!productName) {
        this.notification = null;
        return;
      }
      this.notification = `✅ ${productName} ajouté au panier`;
      if (this.hideTimer) clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        this.notification = null;
        this.panierService.clearNotification();
      }, 2500);
    });

    // --- Abonnement à l'état auth ---
    const sub3 = this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
    });

    const sub4 = this.authService.utilisateur$.subscribe((user) => {
      this.utilisateur = user;
    });

    // --- Recherche avec debounce ---
    const sub5 = this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe((query) => {
      if (query.trim().length >= 2) {
        this.isSearching = true;
        this.produitService.rechercherProduits(query).subscribe({
          next: (produits) => {
            // Gère la réponse paginée ou tableau direct
            if (Array.isArray(produits)) {
              this.searchResults = produits.slice(0, 6);
            } else {
              this.searchResults = (produits as any).results?.slice(0, 6) ?? [];
            }
            this.showResults = true;
            this.isSearching = false;
          },
          error: () => {
            this.searchResults = [];
            this.isSearching = false;
          }
        });
      } else {
        this.searchResults = [];
        this.showResults = false;
      }
    });

    this.subscriptions.push(sub1, sub2, sub3, sub4, sub5);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.hideTimer) clearTimeout(this.hideTimer);
  }

  // ---------------------------------
  // Recherche
  // ---------------------------------
  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  onSearchSubmit(): void {
    if (this.searchQuery.trim()) {
      this.showResults = false;
      this.router.navigate(['/produits'], {
        queryParams: { search: this.searchQuery.trim() }
      });
    }
  }

  selectProduit(produit: Produit): void {
    this.searchQuery = '';
    this.showResults = false;
    this.router.navigate(['/produits'], {
      queryParams: { id: produit.id }
    });
  }

  // ---------------------------------
  // Menu utilisateur
  // ---------------------------------
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  logout(): void {
    this.authService.logout();
    this.showUserMenu = false;
    this.router.navigate(['/']);
  }

  // ---------------------------------
  // Fermer les dropdowns en cliquant dehors
  // ---------------------------------
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.search-box')) {
      this.showResults = false;
    }
    if (!target.closest('.user-menu-wrapper')) {
      this.showUserMenu = false;
    }
  }
}