import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PanierService {

  private items: any[] = JSON.parse(localStorage.getItem('panier') || '[]');

  // 🔥 stream des items
  private itemsSubject = new BehaviorSubject<any[]>(this.items);
  items$ = this.itemsSubject.asObservable();

  // 🔥 compteur
  private panierCount = new BehaviorSubject<number>(this.getTotalQuantity());
  panierCount$ = this.panierCount.asObservable();

  constructor() {}

  /* 🔥 calcul total */
  private getTotalQuantity(): number {
    return this.items.reduce((total, item) => total + item.quantite, 0);
  }

  /* 🔥 update global */
  private updatePanier() {
    localStorage.setItem('panier', JSON.stringify(this.items));

    this.itemsSubject.next(this.items); // 🔥 IMPORTANT
    this.panierCount.next(this.getTotalQuantity()); // 🔥 IMPORTANT
  }

  /* ➕ ajouter */
  addToPanier(produit: any) {
    const existing = this.items.find(i => i.produit.id === produit.id);

    if (existing) {
      existing.quantite++;
    } else {
      this.items.push({ produit, quantite: 1 });
    }

    this.updatePanier();
  }

  /* ❌ supprimer */
  removeItem(item: any) {
    this.items = this.items.filter(i => i !== item);
    this.updatePanier();
  }

  /* ➕ augmenter */
  increaseQty(item: any) {
    item.quantite++;
    this.updatePanier();
  }

  /* ➖ diminuer */
  decreaseQty(item: any) {
    if (item.quantite > 1) {
      item.quantite--;
    } else {
      this.removeItem(item);
    }
    this.updatePanier();
  }

  getPanier() {
    return this.items;
  }
}