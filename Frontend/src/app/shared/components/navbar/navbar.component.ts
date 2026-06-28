import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { PanierService } from '../../../core/services/panier.service';
import { AuthService, Utilisateur } from '../../../core/services/auth.service';
import { ProduitService, Produit } from '../../../core/services/produit.service';
import { MonCompteService } from '../../../core/services/mon-compte.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {

  totalPanier = 0;
  totalFavoris = 0;
  notification: string | null = null;
  isLoggedIn = false;
  utilisateur: Utilisateur | null = null;
  showUserMenu = false;
  searchQuery = '';
  searchResults: Produit[] = [];
  showResults = false;
  isSearching = false;

  private searchSubject = new Subject<string>();
  private hideTimer: any;
  private subscriptions: Subscription[] = [];

  constructor(
    private panierService: PanierService,
    private authService: AuthService,
    private produitService: ProduitService,
    private monCompteService: MonCompteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to PanierService for local cart (non-authenticated users)
    const sub1 = this.panierService.items$.subscribe(items => {
      this.totalPanier = items.reduce((t, i) => t + i.quantite, 0);
    });
    
    // Subscribe to MonCompteService for backend cart (authenticated users)
    const sub2 = this.monCompteService.panier$.subscribe(panier => {
      if (this.authService.isLoggedIn() && panier) {
        this.totalPanier = panier.nombre_items || 0;
      }
    });
    
    // Subscribe to MonCompteService for favorites (authenticated users)
    const sub3 = this.monCompteService.favoris$.subscribe(favoris => {
      if (this.authService.isLoggedIn() && favoris) {
        this.totalFavoris = favoris.total || 0;
      }
    });
    
    const sub4 = this.panierService.lastAdded$.subscribe(name => {
      if (!name) { this.notification = null; return; }
      this.notification = `✅ ${name} ajouté au panier`;
      if (this.hideTimer) clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        this.notification = null;
        this.panierService.clearNotification();
      }, 2500);
    });
    
    const sub5 = this.authService.isLoggedIn$.subscribe(v => {
      this.isLoggedIn = v;
      // Refresh data when login state changes
      if (v) {
        this.monCompteService.refreshAllData();
      }
    });
    
    const sub6 = this.authService.utilisateur$.subscribe(u => this.utilisateur = u);
    
    const sub7 = this.searchSubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe(q => {
      if (q.trim().length >= 2) {
        this.isSearching = true;
        this.produitService.rechercherProduits(q).subscribe({
          next: (res: any) => {
            this.searchResults = (Array.isArray(res) ? res : res.results ?? []).slice(0, 6);
            this.showResults = true;
            this.isSearching = false;
          },
          error: () => { this.searchResults = []; this.isSearching = false; }
        });
      } else {
        this.searchResults = [];
        this.showResults = false;
      }
    });
    
    this.subscriptions.push(sub1, sub2, sub3, sub4, sub5, sub6, sub7);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    if (this.hideTimer) clearTimeout(this.hideTimer);
  }

  onSearchInput(): void { this.searchSubject.next(this.searchQuery); }

  onSearchSubmit(): void {
    if (this.searchQuery.trim()) {
      this.showResults = false;
      this.router.navigate(['/produits'], { queryParams: { search: this.searchQuery.trim() } });
    }
  }

  selectProduit(produit: Produit): void {
    this.searchQuery = '';
    this.showResults = false;
    this.router.navigate(['/produits'], { queryParams: { id: produit.id } });
  }

  toggleUserMenu(): void { 
    this.showUserMenu = !this.showUserMenu;
    this.toggleBodyScroll();
  }

  private toggleBodyScroll(): void {
    if (this.showUserMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  logout(): void {
    this.authService.logout();
    this.showUserMenu = false;
    this.toggleBodyScroll();
    this.router.navigate(['/login']);
  }

  navigateToProfile(): void {
    this.showUserMenu = false;
    this.toggleBodyScroll();
    this.router.navigate(['/mon-compte']);
  }

  navigateToOrders(): void {
    this.showUserMenu = false;
    this.toggleBodyScroll();
    this.router.navigate(['/mes-commandes']);
  }

  navigateToFavorites(): void {
    this.showUserMenu = false;
    this.toggleBodyScroll();
    this.router.navigate(['/mes-favoris']);
  }

  navigateToSettings(): void {
    this.showUserMenu = false;
    this.toggleBodyScroll();
    this.router.navigate(['/parametres']);
  }

  navigateToHelp(): void {
    this.showUserMenu = false;
    this.toggleBodyScroll();
    this.router.navigate(['/aide']);
  }

  getInitiales(): string { return this.authService.getInitiales(); }

  getAvatarColor(): string {
    return this.utilisateur?.role === 'admin'
      ? 'linear-gradient(135deg, #7c3aed, #a78bfa)'
      : 'linear-gradient(135deg, #d32f2f, #ff5a00)';
  }

  getRoleLabel(): string {
    const r = this.utilisateur?.role ?? 'client';
    return r.charAt(0).toUpperCase() + r.slice(1);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.search-box')) {
      this.showResults = false;
    }
    if (!target.closest('.user-menu-wrapper') && !target.closest('.user-dropdown')) {
      if (this.showUserMenu) {
        this.showUserMenu = false;
        this.toggleBodyScroll();
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.showUserMenu) {
        this.showUserMenu = false;
        this.toggleBodyScroll();
      }
      if (this.showResults) {
        this.showResults = false;
      }
    }
  }
}