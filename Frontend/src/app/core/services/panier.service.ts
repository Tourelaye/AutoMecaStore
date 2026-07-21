import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { tap, concatMap, toArray } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { CommandeService } from './commande.service';
import { NotificationService } from './notification.service';
import { MonCompteService } from './mon-compte.service';
import { Produit } from '../../models/produit.model';
import { PanierItem } from '../../models/panier.model';

@Injectable({
  providedIn: 'root'
})
export class PanierService {

  private apiUrl = 'http://127.0.0.1:8000/account';

  private itemsSubject = new BehaviorSubject<PanierItem[]>([]);
  public items$ = this.itemsSubject.asObservable();

  private lastAddedSubject = new BehaviorSubject<string | null>(null);
  public lastAdded$ = this.lastAddedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private commandeService: CommandeService,
    private notificationService: NotificationService,
    private monCompteService: MonCompteService
  ) {
    this.loadFromStorage();

    // Garde le panier local synchronisé avec le backend pour les utilisateurs connectés
    this.monCompteService.panier$.subscribe(panier => {
      if (this.authService.isLoggedIn() && panier && panier.items) {
        const localItems: PanierItem[] = panier.items.map(item => ({
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
        this.save(localItems);
      }
    });
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
    console.log('🛒 Ajout au panier:', item);
    console.log('🔑 Utilisateur authentifié:', this.authService.isLoggedIn());

    // Sync with backend if user is authenticated
    if (this.authService.isLoggedIn()) {
      this.ajouterAuPanierBackend(item.produit.id, item.quantite).subscribe({
        next: (response) => {
          console.log('✅ Backend response:', response);
          // Synchronise le state et notifie
          this.lastAddedSubject.next(item.nom);
        },
        error: (error) => {
          console.error('❌ Backend error, using localStorage fallback:', error);
          this.ajouterAuPanierLocal(item);
        }
      });
    } else {
      // Fallback to localStorage for non-authenticated users
      console.log('📦 Using localStorage (not authenticated)');
      this.ajouterAuPanierLocal(item);
    }
  }

  private ajouterAuPanierLocal(item: PanierItem): void {
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

  private ajouterAuPanierBackend(produitId: number, quantite: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/panier/add/`,
      { produit_id: produitId, quantite: quantite }
    ).pipe(
      tap(() => {
        // Synchronise le panier local avec le backend après l'ajout
        this.syncBackendToLocal();
      })
    );
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
    if (this.authService.isLoggedIn()) {
      // Sync with backend
      if (item.id !== undefined) {
        this.monCompteService.mettreAJourQuantite(item.id, (item.quantite || 0) + 1).subscribe();
      }
    } else {
      // Local storage fallback
      const items = this.items.map(i =>
        i.produit.id === item.produit.id
          ? { ...i, quantite: i.quantite + 1 }
          : i
      );
      this.save(items);
    }
  }

  // =========================
  // QUANTITE -
  // =========================
  diminuerQuantite(item: PanierItem) {
    if (this.authService.isLoggedIn()) {
      // Sync with backend
      if (item.id !== undefined && item.quantite > 1) {
        this.monCompteService.mettreAJourQuantite(item.id, item.quantite - 1).subscribe();
      }
    } else {
      // Local storage fallback
      const items = this.items.map(i => {
        if (i.produit.id === item.produit.id) {
          const q = i.quantite - 1;
          return q > 0 ? { ...i, quantite: q } : i;
        }
        return i;
      });
      this.save(items);
    }
  }

  // =========================
  // DELETE ITEM
  // =========================
  supprimerLigne(item: PanierItem) {
    if (this.authService.isLoggedIn()) {
      // Sync with backend
      if (item.id !== undefined) {
        this.monCompteService.supprimerDuPanier(item.id).subscribe();
      }
    } else {
      // Local storage fallback
      const items = this.items.filter(i => i.produit.id !== item.produit.id);
      this.save(items);
    }
  }

  supprimerDuPanier(produitId: number): void {
    if (this.authService.isLoggedIn()) {
      // Need to find the item ID first from backend cart
      this.monCompteService.getPanier().subscribe(panier => {
        const item = panier.items.find(i => i.produit_id === produitId);
        if (item) {
          this.monCompteService.supprimerDuPanier(item.id).subscribe();
        }
      });
    } else {
      // Local storage fallback
      const items = this.items.filter(i => i.produit.id !== produitId);
      this.save(items);
    }
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
  syncAvecServeur(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/panier/sync/`,
      { items: this.items }
    );
  }

  // =========================
  // SYNC LOCAL STORAGE TO BACKEND
  // =========================
  syncLocalStorageToBackend(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    const localItems = this.items;
    if (localItems.length === 0) {
      return;
    }

    console.log('🔄 Syncing localStorage cart to backend:', localItems);

    // Add each item to backend sequentially, then clear localStorage
    from(localItems).pipe(
      concatMap(item => this.ajouterAuPanierBackend(item.produit.id, item.quantite)),
      toArray()
    ).subscribe({
      next: () => {
        console.log('✅ All items synced to backend');
        this.viderPanier();
      },
      error: (error) => {
        console.error('❌ Error syncing cart to backend:', error);
      }
    });
  }

  // =========================
  // SYNC BACKEND TO LOCAL STORAGE
  // =========================
  syncBackendToLocal(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    this.monCompteService.getPanier().subscribe(panier => {
      if (panier) {
        const localItems: PanierItem[] = (panier.items || []).map(item => ({
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
        this.save(localItems);
        console.log('🔄 Backend cart synced to localStorage:', localItems);
      }
    });
  }
  passerCommande(): Observable<any> {
    if (this.items.length === 0) {
      this.notificationService.error('Votre panier est vide');
      return new Observable(observer => {
        observer.error('Panier vide');
      });
    }

    return new Observable(observer => {
      this.commandeService.creerCommandeDepuisPanier().subscribe({
        next: (commande) => {
          this.notificationService.success(`Commande ${commande.reference} créée avec succès!`);
          this.viderPanier(); // Vider le panier après commande réussie
          observer.next(commande);
          observer.complete();
        },
        error: (err) => {
          console.error('Erreur lors de la création de la commande:', err);
          this.notificationService.error('Erreur lors de la création de la commande');
          observer.error(err);
        }
      });
    });
  }
}