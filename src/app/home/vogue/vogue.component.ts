import { Component } from '@angular/core';

@Component({
  selector: 'app-vogue',
  imports: [],
  templateUrl: './vogue.component.html',
  styleUrl: './vogue.component.css'
})
export class VogueComponent {
  // La vue appelle addToCart(produits) / addToPanier(produits).
  // La logique panier/notification est gérée globalement dans `AppComponent`
  // via un HostListener, donc ici on évite de dupliquer l'ajout.
  produits: unknown = null;

  addToCart(_: unknown): void {
    // intentionally empty
  }

  addToPanier(_: unknown): void {
    // intentionally empty
  }
}
