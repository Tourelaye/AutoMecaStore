import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { NotificationsComponent } from './shared/components/notifications/notifications.component';
import { PanierService } from './core/services/panier.service';
import { Produit } from './models/produit.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    NotificationsComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  hideLayout = false;
  hideFooter = false;
  
  quantite: number = 1; 
  constructor(
    private router: Router,
    private panierService: PanierService
  ) {

    this.router.events.subscribe(() => {

      const url = this.router.url;

      // cacher navbar + footer (auth)
      this.hideLayout =
        url.startsWith('/register') ||
        url.startsWith('/login') ||
        url.startsWith('/mot-de-passe-oublie');

      // cacher footer seulement (catalog)
      this.hideFooter =
        url.startsWith('/catalog');

    });

  }
  isAidePage(): boolean {
    return this.router.url.includes('/aide');
  }
  isFaqPage(): boolean {
    return this.router.url.includes('/faq');
  }

  isPanierPage(): boolean {
    return this.router.url.startsWith('/panier');
  }

  isProduitsPage(): boolean{
    return this.router.url.startsWith('/produits');
  }

  isAdminPage(): boolean{
    const isAdmin = this.router.url.startsWith('/admin');
    console.log('URL actuelle:', this.router.url);
    console.log('Est admin page?', isAdmin);
    return isAdmin;
  }

  isClientProfilePage(): boolean {
    const url = this.router.url;
    // Pages de profil et informations personnelles du client
    return url.startsWith('/profile') ||
           url.startsWith('/commandes') ||
           url.startsWith('/mes-commandes') ||
           url.startsWith('/mon-compte') ||
           url.startsWith('/informations-personnelles') ||
           url.startsWith('/mes-favoris');
  }

  isFournisseurPage(): boolean {
    return this.router.url.startsWith('/fournisseur');
  }

  // Catch-all ajout au panier : chaque composant gère désormais son propre bouton
  // (produit.component, listes, favoris, home). Il ne doit plus y avoir d'ajout global.
  // @HostListener('document:click', ['$event'])
  // onDocumentClick(event: MouseEvent): void { ... }

  private isAddToCartButton(button: Element): boolean {
    const classes = button.classList;
    if (
      classes.contains('btn-cart') ||
      (classes.contains('button-r') && !classes.contains('cart-btn'))
    ) {
      return true;
    }

    const text = (button.textContent ?? '').toLowerCase();
    return text.includes('ajouter au panier') || text.includes('acheter maintenant');
  }

  private buildProduitFromCard(button: Element): Produit {
    const card = button.closest('.product-card, .card');
    const name = this.getText(card, '.product-name')
      || this.getText(card, 'h3')
      || this.getText(card, '.card-title')
      || 'Produit AutoMecaStore';

    const priceText = this.getText(card, '.new-price')
      || this.getText(card, '.text-primary')
      || this.getText(card, '.price');
    const prix = this.extractPrice(priceText);

    return {
      id: this.stableProductId(name, prix),
      nom: name,
      description: this.getText(card, '.card-text') || 'Produit ajouté depuis la boutique',
      prix,
      stock: 9999,
      image: null,
      categorie: 0,
      gestionnaire_stock: 0
    };
  }

  private getText(root: Element | null, selector: string): string | null {
    const value = root?.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
    return value || null;
  }

  private extractPrice(priceText: string | null): number {
    if (!priceText) {
      return 0;
    }

    const normalized = priceText.replace(',', '.');
    const match = normalized.match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : 0;
  }

  /** Identifiant stable par produit (nom + prix) pour fusionner les quantités au lieu d’empiler des lignes. */
  private stableProductId(nom: string, prix: number): number {
    const s = `${nom.trim()}|${prix}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const n = Math.abs(h) % 2147483647;
    return n === 0 ? 1 : n;
  }
}