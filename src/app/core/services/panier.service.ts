import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PanierItem } from '../../models/panier.model';
import { Produit } from '../../models/produit.model';

@Injectable({
  providedIn: 'root'
})
export class PanierService {
  private readonly storageKey = 'automeca_panier_items';
  private readonly itemsSubject = new BehaviorSubject<PanierItem[]>(this.loadItems());
  private readonly lastAddedSubject = new BehaviorSubject<string | null>(null);

  readonly items$ = this.itemsSubject.asObservable();
  readonly lastAdded$ = this.lastAddedSubject.asObservable();

  get items(): PanierItem[] {
    return this.itemsSubject.value;
  }

  get totalItems(): number {
    return this.items.reduce((total, item) => total + item.quantite, 0);
  }

  constructor() {}

  ajouterProduit(produit: Produit): void {
    const items = [...this.items];
    const existingItem = items.find((item) => item.produit.id === produit.id);

    if (existingItem) {
      existingItem.quantite += 1;
    } else {
      const nextId = items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
      items.push({
        id: nextId,
        panier: 1,
        produit,
        quantite: 1
      });
    }

    this.updateItems(items);
    this.lastAddedSubject.next(produit.nom);
  }

  clearNotification(): void {
    this.lastAddedSubject.next(null);
  }

  augmenterQuantite(item: PanierItem): void {
    const items = this.items.map((line) =>
      line.id === item.id ? { ...line, quantite: line.quantite + 1 } : line
    );
    this.updateItems(items);
  }

  diminuerQuantite(item: PanierItem): void {
    const line = this.items.find((i) => i.id === item.id);
    if (!line) {
      return;
    }
    if (line.quantite <= 1) {
      this.supprimerLigne(item);
      return;
    }
    const items = this.items.map((l) =>
      l.id === item.id ? { ...l, quantite: l.quantite - 1 } : l
    );
    this.updateItems(items);
  }

  supprimerLigne(item: PanierItem): void {
    this.updateItems(this.items.filter((l) => l.id !== item.id));
  }

  toggleFavori(item: PanierItem): void {
    const items = this.items.map((line) =>
      line.id === item.id
        ? { ...line, favori: !line.favori }
        : line
    );
    this.updateItems(items);
  }

  private loadItems(): PanierItem[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as PanierItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private updateItems(items: PanierItem[]): void {
    this.itemsSubject.next(items);
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }
}
