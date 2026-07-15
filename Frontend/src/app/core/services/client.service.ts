import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  // =========================
  // LISTE DES CLIENTS
  // =========================
  getClients(filters?: ClientFilters): Observable<Client[]> {
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

    return this.http.get<Client[]>(url);
  }

  // =========================
  // DÉTAIL D'UN CLIENT
  // =========================
  getClientDetail(id: number): Observable<ClientDetail> {
    return this.http.get<ClientDetail>(`${this.apiUrl}/clients/${id}/`);
  }

  // =========================
  // ACTIVER/DÉSACTIVER UN CLIENT
  // =========================
  toggleClientActive(id: number): Observable<{message: string; statut: string; user_id: number}> {
    return this.http.post<{message: string; statut: string; user_id: number}>(
      `${this.apiUrl}/clients/${id}/toggle-active/`,
      {}
    );
  }

  // =========================
  // SUPPRIMER UN CLIENT
  // =========================
  deleteClient(id: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/clients/${id}/delete/`);
  }

  // =========================
  // STATISTIQUES CLIENTS
  // =========================
  getClientStats(): Observable<ClientStats> {
    return this.http.get<ClientStats>(`${this.apiUrl}/clients/stats/`);
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
  // NOTIFICATIONS ADMIN
  // =========================
  getAdminNotifications(): Observable<{notifications: any[], count: number}> {
    return this.http.get<{notifications: any[], count: number}>(`${this.apiUrl}/notifications/`);
  }

  clearAdminNotifications(): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/notifications/`);
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
