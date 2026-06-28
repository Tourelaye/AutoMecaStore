import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Client {
  user: number;
  date_inscription: string;
  point_fidelite?: number;
  mode_paiement_favoris?: string;
  nom_complet: string;
  nombre_commandes: number;
  statut: 'actif' | 'inactif';
}

export interface ClientDetail {
  user: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    adresse?: string;
    role: string;
    is_active: boolean;
    date_joined: string;
  };
  date_inscription: string;
  point_fidelite?: number;
  mode_paiement_favoris?: string;
  nom_complet: string;
  nombre_commandes: number;
  statut: 'actif' | 'inactif';
  note_livreur?: number;
  livreur_id?: number;
  administrateur_id?: number;
}

export interface ClientStats {
  total_clients: number;
  clients_actifs: number;
  clients_inactifs: number;
  nouveaux_clients_ce_mois: number;
  taux_activation: number;
}

export interface ClientFilters {
  search?: string;
  statut?: 'actif' | 'inactif' | 'all';
  ordering?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Token ${token}`
    });
  }

  // =========================
  // LISTE DES CLIENTS
  // =========================
  getClients(filters?: ClientFilters): Observable<Client[]> {
    const headers = this.getHeaders();
    let params = new URLSearchParams();

    if (filters) {
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.statut && filters.statut !== 'all') {
        params.append('user__is_active', filters.statut === 'actif' ? 'true' : 'false');
      }
      if (filters.ordering) {
        params.append('ordering', filters.ordering);
      }
    }

    const url = params.toString() 
      ? `${this.apiUrl}/clients/?${params.toString()}`
      : `${this.apiUrl}/clients/`;

    return this.http.get<Client[]>(url, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // =========================
  // DÉTAIL D'UN CLIENT
  // =========================
  getClientDetail(id: number): Observable<ClientDetail> {
    const headers = this.getHeaders();
    return this.http.get<ClientDetail>(`${this.apiUrl}/clients/${id}/`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // =========================
  // ACTIVER/DÉSACTIVER UN CLIENT
  // =========================
  toggleClientActive(id: number): Observable<{message: string; statut: string; user_id: number}> {
    const headers = this.getHeaders();
    return this.http.post<{message: string; statut: string; user_id: number}>(
      `${this.apiUrl}/clients/${id}/toggle-active/`, 
      {}, 
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // =========================
  // SUPPRIMER UN CLIENT
  // =========================
  deleteClient(id: number): Observable<{message: string}> {
    const headers = this.getHeaders();
    return this.http.delete<{message: string}>(`${this.apiUrl}/clients/${id}/delete/`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // =========================
  // STATISTIQUES CLIENTS
  // =========================
  getClientStats(): Observable<ClientStats> {
    const headers = this.getHeaders();
    return this.http.get<ClientStats>(`${this.apiUrl}/clients/stats/`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // =========================
  // SYNCHRONISATION AUTOMATIQUE
  // =========================
  startRealTimeUpdates(callback: (clients: Client[]) => void): void {
    // Polling toutes les 30 secondes pour les mises à jour
    setInterval(() => {
      this.getClients().subscribe({
        next: (clients) => callback(clients),
        error: (err) => console.error('Erreur lors de la synchronisation:', err)
      });
    }, 30000);
  }

  // =========================
  // GESTION DES ERREURS
  // =========================
  private handleError(error: any): Observable<never> {
    console.error('Erreur ClientService:', error);
    
    let errorMessage = 'Une erreur est survenue';
    
    if (error.status === 401) {
      errorMessage = 'Non autorisé - Veuillez vous reconnecter';
    } else if (error.status === 403) {
      errorMessage = 'Accès refusé - Permissions insuffisantes';
    } else if (error.status === 404) {
      errorMessage = 'Client non trouvé';
    } else if (error.status === 500) {
      errorMessage = 'Erreur serveur - Veuillez réessayer plus tard';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // =========================
  // NOTIFICATIONS ADMIN
  // =========================
  getAdminNotifications(): Observable<{notifications: any[], count: number}> {
    const headers = this.getHeaders();
    return this.http.get<{notifications: any[], count: number}>(`${this.apiUrl}/notifications/`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  clearAdminNotifications(): Observable<{message: string}> {
    const headers = this.getHeaders();
    return this.http.delete<{message: string}>(`${this.apiUrl}/notifications/`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // =========================
  // UTILITAIRES
  // =========================
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatStatut(statut: string): {label: string; class: string} {
    return {
      label: statut === 'actif' ? 'Actif' : 'Inactif',
      class: statut === 'actif' ? 'badge-success' : 'badge-danger'
    };
  }

  getInitials(nom: string, prenom: string): string {
    return `${nom?.charAt(0) || ''}${prenom?.charAt(0) || ''}`.toUpperCase();
  }
}
