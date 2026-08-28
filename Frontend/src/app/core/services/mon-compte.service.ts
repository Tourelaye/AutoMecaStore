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
  id?: number;
  produit: { id: number; nom: string; image?: string; reference?: string };
  produit_id?: number;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
  fournisseur?: { id: number; nom: string };
  magasin?: {
    id?: number;
    nom_magasin?: string;
    telephone?: string;
    adresse_complete?: string;
    ville?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
    horaires_ouverture?: any;
  };
  mode_reception?: 'livraison' | 'retrait_magasin';
}

export interface AdresseClient {
  id?: number;
  nom?: string;
  nom_destinataire?: string;
  telephone?: string;
  ville?: string;
  quartier?: string;
  adresse?: string;
  point_de_repere?: string;
  instructions?: string;
  est_principale?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AdresseLivraison {
  id?: number;
  nom_destinataire?: string;
  telephone?: string;
  ville?: string;
  quartier?: string;
  adresse?: string;
  point_de_repere?: string;
  instructions?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Livraison {
  id?: number;
  magasin?: { id?: number; nom_magasin?: string };
  adresse?: AdresseLivraison;
  statut?: string;
  responsable_type?: string;
  responsable_nom?: string;
  mode_tarif?: string;
  frais_livraison?: number;
  delai_estime?: string;
  instructions?: string;
  date_creation?: string;
  date_attribution?: string;
  date_livraison?: string;
}

export interface Commande {
  id: number;
  reference: string;
  date_commande: string;
  montant_total: number;
  frais_livraison: number;
  statut: string;
  mode_reception?: 'livraison' | 'retrait_magasin';
  adresse_livraison?: string;
  telephone_client?: string;
  commentaire_fournisseur?: string;
  nombre_produits: number;
  lignes: LigneCommande[];
  historique?: { id?: number; statut: string; commentaire?: string; motif?: string; date: string; utilisateur?: string }[];
  livraisons?: Livraison[];
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
  produit?: any;
  produit_id: number;
  produit_nom: string;
  reference?: string;
  prix: number;
  image: string;
  quantite: number;
  stock?: number;
  sous_total: number;
  fournisseur_id?: number;
  fournisseur_nom?: string;
  magasin_id?: number;
  magasin_nom?: string;
  mode_reception?: 'livraison' | 'retrait_magasin';
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
  private readonly DELIVERY_URL = 'http://127.0.0.1:8000/api';

  // BehaviorSubjects pour la mise à jour automatique
  private clientInfoSubject = new BehaviorSubject<ClientInfo | null>(null);
  private commandesSubject = new BehaviorSubject<CommandesResponse | null>(null);
  private favorisSubject = new BehaviorSubject<FavorisResponse | null>(null);
  private panierSubject = new BehaviorSubject<PanierResponse | null>(null);
  private adressesSubject = new BehaviorSubject<AdresseClient[]>([]);

  // Observables publics
  clientInfo$ = this.clientInfoSubject.asObservable();
  commandes$ = this.commandesSubject.asObservable();
  favoris$ = this.favorisSubject.asObservable();
  panier$ = this.panierSubject.asObservable();
  adresses$ = this.adressesSubject.asObservable();

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

    return this.http.get<CommandesResponse>(`${this.API_URL}/mes-commandes/`, { headers }).pipe(
      tap(commandes => {
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
  // COMMANDES - DETAIL & ANNULATION
  // ==============================

  getMaCommande(id: number): Observable<Commande> {
    const headers = this.getAuthHeaders();
    return this.http.get<Commande>(`${this.API_URL}/mes-commandes/${id}/`, { headers });
  }

  annulerCommande(id: number, motif?: string): Observable<Commande> {
    const headers = this.getAuthHeaders();
    return this.http.post<Commande>(`${this.API_URL}/mes-commandes/${id}/annuler/`, { motif: motif || '' }, { headers });
  }

  // ==============================
  // FAVORIS
  // ==============================
  
  getFavoris(): Observable<FavorisResponse> {
    const headers = this.getAuthHeaders();

    return this.http.get<FavorisResponse>(`${this.API_URL}/favoris/`, { headers }).pipe(
      tap(favoris => {
        this.favorisSubject.next(favoris);
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

    return this.http.post(`${this.API_URL}/favoris/`, { produit_id: produitId }, { headers }).pipe(
      tap(response => {
        // Rafraîchir la liste des favoris après ajout
        this.getFavoris().subscribe({
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

    return this.http.delete(`${this.API_URL}/favoris/`, {
      headers,
      body: { produit_id: produitId }
    }).pipe(
      tap(response => {
        // Rafraîchir la liste des favoris après suppression
        this.getFavoris().subscribe({
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

    return this.http.get<PanierResponse>(`${this.API_URL}/panier/`, { headers }).pipe(
      tap(panier => {
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

    return this.http.delete(`${this.API_URL}/panier/${itemId}/`, { headers }).pipe(
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

    return this.http.patch(`${this.API_URL}/panier/${itemId}/`, { quantite }, { headers }).pipe(
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
  // ADRESSES
  // ==============================

  getAdresses(): Observable<AdresseClient[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<AdresseClient[]>(`${this.DELIVERY_URL}/adresses/`, { headers }).pipe(
      tap(adresses => this.adressesSubject.next(adresses)),
      catchError(error => {
        console.error('Erreur lors de la récupération des adresses:', error);
        this.adressesSubject.next([]);
        return of([]);
      })
    );
  }

  ajouterAdresse(adresse: AdresseClient): Observable<AdresseClient> {
    const headers = this.getAuthHeaders();
    return this.http.post<AdresseClient>(`${this.DELIVERY_URL}/adresses/`, adresse, { headers }).pipe(
      tap(() => this.getAdresses().subscribe())
    );
  }

  modifierAdresse(id: number, adresse: AdresseClient): Observable<AdresseClient> {
    const headers = this.getAuthHeaders();
    return this.http.put<AdresseClient>(`${this.DELIVERY_URL}/adresses/${id}/`, adresse, { headers }).pipe(
      tap(() => this.getAdresses().subscribe())
    );
  }

  supprimerAdresse(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.DELIVERY_URL}/adresses/${id}/`, { headers }).pipe(
      tap(() => this.getAdresses().subscribe())
    );
  }

  definirAdressePrincipale(id: number): Observable<AdresseClient> {
    const headers = this.getAuthHeaders();
    return this.http.patch<AdresseClient>(`${this.DELIVERY_URL}/adresses/${id}/`, { est_principale: true }, { headers }).pipe(
      tap(() => this.getAdresses().subscribe())
    );
  }

  // ==============================
  // UTILITAIRES
  // ==============================

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return headers;
  }

  // ==============================
  // MISE À JOUR AUTOMATIQUE
  // ==============================
  
  refreshAllData(): void {
    this.getClientInfo().subscribe({
      error: (err) => console.error('❌ Erreur client info:', err)
    });
    this.getMesCommandes().subscribe({
      error: (err) => console.error('❌ Erreur commandes:', err)
    });
    this.getFavoris().subscribe({
      error: (err) => console.error('❌ Erreur favoris:', err)
    });
    this.getPanier().subscribe({
      error: (err) => console.error('❌ Erreur panier:', err)
    });
    this.getAdresses().subscribe({
      error: (err) => console.error('❌ Erreur adresses:', err)
    });
  }

  // Méthodes utilitaires pour les statuts
  getStatutClass(statut: string): string {
    switch (statut) {
      case 'nouvelle_commande': return 'statut-nouvelle';
      case 'en_attente_confirmation': return 'statut-attente';
      case 'acceptee': return 'statut-acceptee';
      case 'en_preparation': return 'statut-cours';
      case 'prete_a_retirer': return 'statut-prete';
      case 'en_cours_livraison': return 'statut-cours';
      case 'livree': return 'statut-livree';
      case 'terminee': return 'statut-terminee';
      case 'refusee': return 'statut-refusee';
      case 'annulee': return 'statut-annulee';
      default: return 'statut-default';
    }
  }

  getStatutLabel(statut: string): string {
    switch (statut) {
      case 'nouvelle_commande': return 'Nouvelle commande';
      case 'en_attente_confirmation': return 'En attente';
      case 'acceptee': return 'Acceptée';
      case 'en_preparation': return 'En préparation';
      case 'prete_a_retirer': return 'Prête à retirer';
      case 'en_cours_livraison': return 'En livraison';
      case 'livree': return 'Livrée';
      case 'terminee': return 'Terminée';
      case 'refusee': return 'Refusée';
      case 'annulee': return 'Annulée';
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
