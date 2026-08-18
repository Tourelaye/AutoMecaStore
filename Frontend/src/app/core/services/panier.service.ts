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
            image: item.image,
            reference: (item as any).produit?.reference || ''
          } as any,
          nom: item.produit_nom,
          prix: item.prix,
          quantite: item.quantite,
          stock: (item as any).stock,
          sous_total: (item as any).sous_total,
          favori: false,
          fournisseur_id: item.fournisseur_id,
          fournisseur_nom: item.fournisseur_nom,
          magasin_id: item.magasin_id,
          magasin_nom: item.magasin_nom,
          mode_reception: (item.mode_reception as 'livraison' | 'retrait_magasin') || 'livraison'
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
        const parsed = JSON.parse(stored);
        const items = (Array.isArray(parsed) ? parsed : []).map((i: any) => ({
          ...i,
          mode_reception: (i.mode_reception === 'retrait' || i.mode_reception === 'retrait_magasin')
            ? 'retrait_magasin'
            : 'livraison'
        }));
        this.itemsSubject.next(items as PanierItem[]);
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
      this.ajouterAuPanierBackend(
        item.produit.id,
        item.quantite,
        item.fournisseur_id,
        item.magasin_id,
        item.mode_reception ?? 'livraison'
      ).subscribe({
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
    const newKey = this.getCartItemKey(item);

    if (!newKey) {
      this.notificationService.error('Impossible d\'ajouter au panier : offre incomplète.');
      return;
    }

    const index = items.findIndex(i => this.getCartItemKey(i) === newKey);

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

  private ajouterAuPanierBackend(
    produitId: number,
    quantite: number,
    fournisseurId?: number,
    magasinId?: number,
    modeReception: 'livraison' | 'retrait_magasin' = 'livraison'
  ): Observable<any> {
    const body: any = { produit_id: produitId, quantite: quantite };
    // Le backend attend 'retrait_magasin' pour le retrait
    body.mode_reception = modeReception === 'retrait_magasin' ? 'retrait_magasin' : 'livraison';
    if (fournisseurId) {
      body.fournisseur_id = fournisseurId;
    }
    if (magasinId) {
      body.magasin_id = magasinId;
    }
    return this.http.post(`${this.apiUrl}/panier/add/`, body).pipe(
      tap(() => {
        // Synchronise le panier local avec le backend après l'ajout
        this.syncBackendToLocal();
      })
    );
  }

  // =========================
  // IDENTIFICATION D'UNE LIGNE
  // =========================
  private getCartItemKey(
    item: { produit: { id?: number } | null | undefined; fournisseur_id?: number | null; magasin_id?: number | null }
  ): string | null {
    const p = item?.produit?.id;
    const f = item?.fournisseur_id;
    const m = item?.magasin_id;
    if (p == null || f == null || m == null) return null;
    return `${p}#${f}#${m}`;
  }

  // =========================
  // RESOLUTION D'UNE OFFRE PAR DEFAUT
  // =========================
  private resoudreOffreParDefaut(data: any): {
    fournisseur_id: number;
    fournisseur_nom?: string;
    magasin_id: number;
    magasin_nom?: string;
    prix: number;
    stock?: number;
  } | null {
    const offres: any[] = data.offres || [];

    // 1) Si l'appelant a fourni un fournisseur/magasin explicite
    const fournisseurId = data.fournisseur_id ?? data.fournisseur;
    const magasinId = data.magasin_id ?? data.magasin_detail?.id;

    if (fournisseurId != null && magasinId != null) {
      const offreChoisie = offres.find((o: any) =>
        o.fournisseur?.id === fournisseurId && o.magasin?.id === magasinId
      );
      if (offreChoisie) {
        return {
          fournisseur_id: offreChoisie.fournisseur.id,
          fournisseur_nom: offreChoisie.fournisseur.nom_entreprise,
          magasin_id: offreChoisie.magasin.id,
          magasin_nom: offreChoisie.magasin?.nom_magasin,
          prix: offreChoisie.prix ?? data.prix,
          stock: offreChoisie.stock ?? data.stock
        };
      }
      return {
        fournisseur_id: fournisseurId,
        fournisseur_nom: data.fournisseur_nom,
        magasin_id: magasinId,
        magasin_nom: data.magasin_nom ?? data.magasin_detail?.nom_magasin,
        prix: data.prix,
        stock: data.stock
      };
    }

    // 2) Une seule offre -> utiliser automatiquement
    if (offres.length === 1) {
      const o = offres[0];
      return {
        fournisseur_id: o.fournisseur?.id,
        fournisseur_nom: o.fournisseur?.nom_entreprise,
        magasin_id: o.magasin?.id,
        magasin_nom: o.magasin?.nom_magasin,
        prix: o.prix ?? data.prix,
        stock: o.stock ?? data.stock
      };
    }

    // 3) Plusieurs offres sans choix explicite -> refuser et demander la selection
    if (offres.length > 1) {
      this.notificationService.warning(
        'Veuillez sélectionner un magasin pour ajouter ce produit au panier.',
        'Magasin requis'
      );
      return null;
    }

    // 4) Dernier recours : fournisseur/magasin principal du produit
    if (data.fournisseur != null && data.magasin_detail?.id != null) {
      return {
        fournisseur_id: data.fournisseur,
        fournisseur_nom: data.fournisseur_nom,
        magasin_id: data.magasin_detail.id,
        magasin_nom: data.magasin_nom ?? data.magasin_detail.nom_magasin,
        prix: data.prix,
        stock: data.stock
      };
    }

    return null;
  }

  // =========================
  // ADD PRODUCT (alias propre)
  // =========================
  ajouterProduit(data: Produit & {
    quantite: number;
    fournisseur_id?: number;
    magasin_id?: number;
    fournisseur_nom?: string;
    magasin_nom?: string;
    mode_reception?: 'livraison' | 'retrait_magasin';
    magasin?: any;
  }): void {

    const offre = this.resoudreOffreParDefaut(data);
    if (!offre) {
      this.notificationService.warning(
        'Veuillez sélectionner un magasin/fournisseur pour ce produit.',
        'Offre manquante'
      );
      return;
    }

    const item: PanierItem = {
      produit: data,
      nom: data.nom,
      prix: offre.prix,
      quantite: data.quantite,
      stock: offre.stock,
      favori: false,
      fournisseur_id: offre.fournisseur_id,
      fournisseur_nom: offre.fournisseur_nom,
      magasin_id: offre.magasin_id,
      magasin_nom: offre.magasin_nom,
      mode_reception: (data.mode_reception as 'livraison' | 'retrait_magasin') || 'livraison',
      magasin: data.magasin || undefined
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
      // Use localStorage fallback
      const key = this.getCartItemKey(item);
      const items = this.items.map(i =>
        (this.getCartItemKey(i) === key)
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
      const key = this.getCartItemKey(item);
      const items = this.items.map(i => {
        if (this.getCartItemKey(i) === key) {
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
      const key = this.getCartItemKey(item);
      const items = this.items.filter(i => this.getCartItemKey(i) !== key);
      this.save(items);
    }
  }

  supprimerDuPanier(produitId: number, fournisseurId?: number, magasinId?: number): void {
    if (this.authService.isLoggedIn()) {
      // Need to find the item ID first from backend cart
      this.monCompteService.getPanier().subscribe(panier => {
        const targetKey = this.getCartItemKey({
          produit: { id: produitId },
          fournisseur_id: fournisseurId,
          magasin_id: magasinId
        } as PanierItem);
        const item = panier.items.find(i =>
          this.getCartItemKey({
            produit: { id: i.produit_id },
            fournisseur_id: i.fournisseur_id,
            magasin_id: i.magasin_id
          } as PanierItem) === targetKey
        );
        if (item) {
          this.monCompteService.supprimerDuPanier(item.id).subscribe();
        }
      });
    } else {
      // Local storage fallback
      const targetKey = this.getCartItemKey({
        produit: { id: produitId },
        fournisseur_id: fournisseurId,
        magasin_id: magasinId
      } as PanierItem);
      const items = this.items.filter(i => this.getCartItemKey(i) !== targetKey);
      this.save(items);
    }
  }

  // =========================
  // FAVORI
  // =========================
  toggleFavori(item: PanierItem) {
    const key = this.getCartItemKey(item);
    const items = this.items.map(i =>
      (this.getCartItemKey(i) === key)
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
      concatMap(item => this.ajouterAuPanierBackend(item.produit.id, item.quantite, item.fournisseur_id, item.magasin_id, item.mode_reception)),
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
            image: item.image,
            reference: (item as any).produit?.reference || ''
          } as any,
          nom: item.produit_nom,
          prix: item.prix,
          quantite: item.quantite,
          stock: (item as any).stock,
          sous_total: (item as any).sous_total,
          favori: false,
          fournisseur_id: item.fournisseur_id,
          fournisseur_nom: item.fournisseur_nom,
          magasin_id: item.magasin_id,
          magasin_nom: item.magasin_nom,
          mode_reception: (item.mode_reception as 'livraison' | 'retrait_magasin') || 'livraison'
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