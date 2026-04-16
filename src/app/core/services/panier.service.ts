import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Produit } from '../../models/produit.model';
import { PanierItem } from '../../models/panier.model';

@Injectable({
  providedIn: 'root'
})
export class PanierService {

  private apiUrl = 'http://localhost:8000/api';

  private itemsSubject = new BehaviorSubject<PanierItem[]>([]);
  public items$ = this.itemsSubject.asObservable();

  private lastAddedSubject = new BehaviorSubject<string | null>(null);
  public lastAdded$ = this.lastAddedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.loadFromStorage();
  }

  // =========================
  // STORAGE
  // =========================
  private loadFromStorage(): void {
    const stored = localStorage.getItem('panier_items');
    if (stored) {
      try {
        this.itemsSubject.next(JSON.parse(stored));
      } catch {
        this.itemsSubject.next([]);
      }
    }
  }

  private saveToStorage(items: PanierItem[]): void {
    localStorage.setItem('panier_items', JSON.stringify(items));
  }

  // =========================
  // GET ITEMS
  // =========================
  private get items(): PanierItem[] {
    return this.itemsSubject.value;
  }

  private save(items: PanierItem[]) {
    this.itemsSubject.next(items);
    this.saveToStorage(items);
  }

  // =========================
  // ADD PRODUCT
  // =========================
  ajouterAuPanier(item: PanierItem): void {

    const items = [...this.items];

    const index = items.findIndex(i => i.produit.id === item.produit.id);

    if (index !== -1) {
      items[index].quantite += item.quantite;
    } else {
      items.push({
        ...item,
        favori: false
      });
    }

    this.save(items);

    this.lastAddedSubject.next(item.nom);
  }

  // =========================
  // ADD PRODUCT (alias propre)
  // =========================
  ajouterProduit(data: Produit & { quantite: number }): void {

    const item: PanierItem = {
      produit: data,
      nom: data.nom,
      prix: data.prix,
      quantite: data.quantite,
      favori: false
    };

    this.ajouterAuPanier(item);
  }

  // =========================
  // QUANTITE +
  // =========================
  augmenterQuantite(item: PanierItem) {
    const items = this.items.map(i =>
      i.produit.id === item.produit.id
        ? { ...i, quantite: i.quantite + 1 }
        : i
    );
    this.save(items);
  }

  // =========================
  // QUANTITE -
  // =========================
  diminuerQuantite(item: PanierItem) {
    const items = this.items.map(i => {
      if (i.produit.id === item.produit.id) {
        const q = i.quantite - 1;
        return q > 0 ? { ...i, quantite: q } : i;
      }
      return i;
    });

    this.save(items);
  }

  // =========================
  // DELETE ITEM
  // =========================
  supprimerLigne(item: PanierItem) {
    const items = this.items.filter(i => i.produit.id !== item.produit.id);
    this.save(items);
  }

  supprimerDuPanier(produitId: number): void {
    const items = this.items.filter(i => i.produit.id !== produitId);
    this.save(items);
  }

  // =========================
  // FAVORI
  // =========================
  toggleFavori(item: PanierItem) {
    const items = this.items.map(i =>
      i.produit.id === item.produit.id
        ? { ...i, favori: !i.favori }
        : i
    );
    this.save(items);
  }

  // =========================
  // CLEAR
  // =========================
  viderPanier(): void {
    this.save([]);
  }

  clearNotification(): void {
    this.lastAddedSubject.next(null);
  }

  // =========================
  // TOTALS
  // =========================
  getTotalArticles(): number {
    return this.items.reduce((t, i) => t + i.quantite, 0);
  }

  getMontantTotal(): number {
    return this.items.reduce(
      (t, i) => t + i.prix * i.quantite,
      0
    );
  }

  getTotal(): number {
    return this.getMontantTotal();
  }

  // =========================
  // API
  // =========================
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  syncAvecServeur(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/panier/sync/`,
      { items: this.items },
      { headers: this.getHeaders() }
    );
  }
}