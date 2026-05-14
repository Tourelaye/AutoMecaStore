import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { PanierItem } from '../../models/panier.model';

export interface CommandeClient {
  id?: number;
  reference?: string;
  date_commande?: string;
  statut: string;
  montant_total: number;
  client?: number;
  lignes?: LigneCommandeClient[];
}

export interface LigneCommandeClient {
  produit: number;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
}

export interface CommandeCreateRequest {
  lignes: LigneCommandeClient[];
  montant_total: number;
}

@Injectable({
  providedIn: 'root'
})
export class CommandeClientService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Créer une commande depuis le panier
  creerCommandeDepuisPanier(items: PanierItem[]): Observable<CommandeClient> {
    const lignes: LigneCommandeClient[] = items.map(item => ({
      produit: item.produit.id,
      quantite: item.quantite,
      prix_unitaire: item.prix,
      sous_total: item.prix * item.quantite
    }));

    const montant_total = items.reduce((total, item) => total + (item.prix * item.quantite), 0);

    const commandeRequest: CommandeCreateRequest = {
      lignes,
      montant_total
    };

    return this.http.post<CommandeClient>(
      `${this.apiUrl}/commande/panier/`,
      commandeRequest,
      { headers: this.getHeaders() }
    );
  }

  // Créer une commande manuellement
  creerCommande(commande: CommandeCreateRequest): Observable<CommandeClient> {
    return this.http.post<CommandeClient>(
      `${this.apiUrl}/commandes/create/`,
      commande,
      { headers: this.getHeaders() }
    );
  }

  // Obtenir les commandes du client
  getMesCommandes(): Observable<CommandeClient[]> {
    return this.http.get<CommandeClient[]>(
      `${this.apiUrl}/mes-commandes/`,
      { headers: this.getHeaders() }
    );
  }

  // Obtenir les détails d'une commande
  getCommande(id: number): Observable<CommandeClient> {
    return this.http.get<CommandeClient>(
      `${this.apiUrl}/commandes/${id}/`,
      { headers: this.getHeaders() }
    );
  }

  // Mettre à jour le statut d'une commande (si besoin)
  updateStatutCommande(id: number, statut: string): Observable<CommandeClient> {
    return this.http.put<CommandeClient>(
      `${this.apiUrl}/commandes/${id}/`,
      { statut },
      { headers: this.getHeaders() }
    );
  }
}
