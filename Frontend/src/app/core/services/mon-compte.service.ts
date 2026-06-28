import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface ClientInfo {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  adresse?: string;
  role: string;
  date_inscription: string;
  point_fidelite: number;
  mode_paiement_favoris?: string;
  is_active: boolean;
}

export interface LigneCommande {
  produit_nom: string;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
}

export interface Commande {
  id: number;
  reference: string;
  date_commande: string;
  montant_total: number;
  statut: 'en_attente' | 'en_cours' | 'paye' | 'livre';
  nombre_produits: number;
  lignes: LigneCommande[];
}

export interface CommandesResponse {
  commandes: Commande[];
  total: number;
}

export interface Favori {
  id: number;
  produit_id: number;
  produit_nom: string;
  prix: number;
  image: string;
  date_ajout: string;
}

export interface FavorisResponse {
  favoris: Favori[];
  total: number;
}

export interface PanierItem {
  id: number;
  produit_id: number;
  produit_nom: string;
  prix: number;
  image: string;
  quantite: number;
  sous_total: number;
}

export interface PanierResponse {
  items: PanierItem[];
  total: number;
  nombre_items: number;
}

@Injectable({
  providedIn: 'root'
})
export class MonCompteService {
  private readonly API_URL = 'http://127.0.0.1:8000/account';
  
  // BehaviorSubjects pour la mise à jour automatique
  private clientInfoSubject = new BehaviorSubject<ClientInfo | null>(null);
  private commandesSubject = new BehaviorSubject<CommandesResponse | null>(null);
  private favorisSubject = new BehaviorSubject<FavorisResponse | null>(null);
  private panierSubject = new BehaviorSubject<PanierResponse | null>(null);
  
  // Observables publics
  clientInfo$ = this.clientInfoSubject.asObservable();
  commandes$ = this.commandesSubject.asObservable();
  favoris$ = this.favorisSubject.asObservable();
  panier$ = this.panierSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ==============================
  // INFORMATIONS UTILISATEUR
  // ==============================
  
  getClientInfo(): Observable<ClientInfo> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<ClientInfo>(`${this.API_URL}/me/`, { headers }).pipe(
      tap(clientInfo => {
        this.clientInfoSubject.next(clientInfo);
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des infos client:', error);
        throw error;
      })
    );
  }

  updateClientInfo(clientInfo: Partial<ClientInfo>): Observable<ClientInfo> {
    const headers = this.getAuthHeaders();
    
    return this.http.put<ClientInfo>(`${this.API_URL}/me/`, clientInfo, { headers }).pipe(
      tap(updatedInfo => {
        this.clientInfoSubject.next(updatedInfo);
      }),
      catchError(error => {
        console.error('Erreur lors de la mise à jour des infos client:', error);
        throw error;
      })
    );
  }

  // ==============================
  // COMMANDES
  // ==============================
  
  getMesCommandes(): Observable<CommandesResponse> {
    const headers = this.getAuthHeaders();
    console.log('📡 GET /mes-commandes/ - Headers:', headers);
    
    return this.http.get<CommandesResponse>(`${this.API_URL}/mes-commandes/`, { headers }).pipe(
      tap(commandes => {
        console.log('📦 COMMANDES API RESPONSE:', commandes);
        this.commandesSubject.next(commandes);
      }),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des commandes:', error);
        // Retourner une réponse vide en cas d'erreur
        const emptyResponse: CommandesResponse = { commandes: [], total: 0 };
        this.commandesSubject.next(emptyResponse);
        return of(emptyResponse);
      })
    );
  }

  // ==============================
  // FAVORIS
  // ==============================
  
  getFavoris(): Observable<FavorisResponse> {
    const headers = this.getAuthHeaders();
    console.log('📡 GET /favoris/ - Headers:', headers);
    
    return this.http.get<FavorisResponse>(`${this.API_URL}/favoris/`, { headers }).pipe(
      tap(favoris => {
        console.log('❤️ FAVORIS API RAW RESPONSE:', favoris);
        console.log('❤️ FAVORIS ARRAY:', favoris.favoris);
        console.log('❤️ FAVORIS TOTAL:', favoris.total);
        console.log('❤️ FAVORIS LENGTH:', favoris.favoris?.length || 0);
        this.favorisSubject.next(favoris);
        console.log('❤️ FAVORIS SUBJECT UPDATED');
      }),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des favoris:', error);
        // Retourner une réponse vide en cas d'erreur
        const emptyResponse: FavorisResponse = { favoris: [], total: 0 };
        this.favorisSubject.next(emptyResponse);
        return of(emptyResponse);
      })
    );
  }

  ajouterFavori(produitId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    console.log('📡 POST /favoris/ - produit_id:', produitId);
    console.log('📡 POST /favoris/ - Headers:', headers);
    
    return this.http.post(`${this.API_URL}/favoris/`, { produit_id: produitId }, { headers }).pipe(
      tap(response => {
        console.log('✅ FAVORI POST RESPONSE:', response);
        // Rafraîchir la liste des favoris après ajout
        console.log('🔄 Refreshing favoris after add...');
        this.getFavoris().subscribe({
          next: (data) => console.log('✅ Favoris refreshed after add:', data),
          error: (err) => console.error('❌ Error refreshing favoris:', err)
        });
      }),
      catchError(error => {
        console.error('❌ Erreur lors de l\'ajout aux favoris:', error);
        console.error('❌ Error details:', error.error);
        throw error;
      })
    );
  }

  retirerFavori(produitId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    console.log('📡 DELETE /favoris/ - produit_id:', produitId);
    console.log('📡 DELETE /favoris/ - Headers:', headers);

    return this.http.delete(`${this.API_URL}/favoris/`, {
      headers,
      body: { produit_id: produitId }
    }).pipe(
      tap(response => {
        console.log('✅ FAVORI DELETE RESPONSE:', response);
        // Rafraîchir la liste des favoris après suppression
        console.log('🔄 Refreshing favoris after remove...');
        this.getFavoris().subscribe({
          next: (data) => console.log('✅ Favoris refreshed after remove:', data),
          error: (err) => console.error('❌ Error refreshing favoris:', err)
        });
      }),
      catchError(error => {
        console.error('❌ Erreur lors du retrait des favoris:', error);
        console.error('❌ Error details:', error.error);
        throw error;
      })
    );
  }

  // ==============================
  // PANIER
  // ==============================
  
  getPanier(): Observable<PanierResponse> {
    const headers = this.getAuthHeaders();
    console.log('📡 GET /panier/ - Headers:', headers);
    
    return this.http.get<PanierResponse>(`${this.API_URL}/panier/`, { headers }).pipe(
      tap(panier => {
        console.log('🛒 PANIER API RESPONSE:', panier);
        this.panierSubject.next(panier);
      }),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération du panier:', error);
        // Retourner une réponse vide en cas d'erreur
        const emptyResponse: PanierResponse = { items: [], total: 0, nombre_items: 0 };
        this.panierSubject.next(emptyResponse);
        return of(emptyResponse);
      })
    );
  }

  supprimerDuPanier(itemId: number): Observable<any> {
    const headers = this.getAuthHeaders();

    return this.http.delete(`${this.API_URL}/panier/delete/${itemId}/`, { headers }).pipe(
      tap(() => {
        // Rafraîchir le panier après suppression
        this.getPanier().subscribe();
      }),
      catchError(error => {
        console.error('Erreur lors de la suppression du panier:', error);
        throw error;
      })
    );
  }

  mettreAJourQuantite(itemId: number, quantite: number): Observable<any> {
    const headers = this.getAuthHeaders();

    return this.http.patch(`${this.API_URL}/panier/update/${itemId}/`, { quantite }, { headers }).pipe(
      tap(() => {
        // Rafraîchir le panier après mise à jour
        this.getPanier().subscribe();
      }),
      catchError(error => {
        console.error('Erreur lors de la mise à jour de la quantité:', error);
        throw error;
      })
    );
  }

  // ==============================
  // UTILITAIRES
  // ==============================
  
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    console.log('🔑 TOKEN:', token ? 'PRÉSENT' : 'ABSENT');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    console.log('📋 HEADERS:', headers);
    return headers;
  }

  // ==============================
  // MISE À JOUR AUTOMATIQUE
  // ==============================
  
  refreshAllData(): void {
    console.log('🔄 REFRESH ALL DATA APPELE');
    this.getClientInfo().subscribe({
      next: (data) => console.log('✅ Client info chargée:', data),
      error: (err) => console.error('❌ Erreur client info:', err)
    });
    this.getMesCommandes().subscribe({
      next: (data) => console.log('✅ Commandes chargées:', data),
      error: (err) => console.error('❌ Erreur commandes:', err)
    });
    this.getFavoris().subscribe({
      next: (data) => console.log('✅ Favoris chargés:', data),
      error: (err) => console.error('❌ Erreur favoris:', err)
    });
    this.getPanier().subscribe({
      next: (data) => console.log('✅ Panier chargé:', data),
      error: (err) => console.error('❌ Erreur panier:', err)
    });
  }

  // Méthodes utilitaires pour les statuts
  getStatutClass(statut: string): string {
    switch (statut) {
      case 'en_attente': return 'statut-attente';
      case 'en_cours': return 'statut-cours';
      case 'paye': return 'statut-paye';
      case 'livre': return 'statut-livre';
      default: return 'statut-default';
    }
  }

  getStatutLabel(statut: string): string {
    switch (statut) {
      case 'en_attente': return 'En attente';
      case 'en_cours': return 'En cours';
      case 'paye': return 'Payée';
      case 'livre': return 'Livrée';
      default: return statut;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatPrix(prix: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(prix);
  }
}
