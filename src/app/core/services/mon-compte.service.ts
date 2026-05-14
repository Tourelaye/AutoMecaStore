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
  produit_nom: string;
  prix: number;
  image: string;
  date_ajout: string;
}

export interface FavorisResponse {
  favoris: Favori[];
  total: number;
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
  
  // Observables publics
  clientInfo$ = this.clientInfoSubject.asObservable();
  commandes$ = this.commandesSubject.asObservable();
  favoris$ = this.favorisSubject.asObservable();

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
        console.error('Erreur lors de la récupération des commandes:', error);
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
    
    return this.http.get<FavorisResponse>(`${this.API_URL}/favoris/`, { headers }).pipe(
      tap(favoris => {
        this.favorisSubject.next(favoris);
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des favoris:', error);
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
      tap(() => {
        // Rafraîchir la liste des favoris après ajout
        this.getFavoris().subscribe();
      }),
      catchError(error => {
        console.error('Erreur lors de l\'ajout aux favoris:', error);
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
      tap(() => {
        // Rafraîchir la liste des favoris après suppression
        this.getFavoris().subscribe();
      }),
      catchError(error => {
        console.error('Erreur lors du retrait des favoris:', error);
        throw error;
      })
    );
  }

  // ==============================
  // UTILITAIRES
  // ==============================
  
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ==============================
  // MISE À JOUR AUTOMATIQUE
  // ==============================
  
  refreshAllData(): void {
    this.getClientInfo().subscribe();
    this.getMesCommandes().subscribe();
    this.getFavoris().subscribe();
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
