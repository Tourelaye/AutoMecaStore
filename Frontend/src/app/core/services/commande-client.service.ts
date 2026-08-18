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

export interface CheckoutItem {
  panier_item_id: number;
  mode_reception: 'livraison' | 'retrait_magasin';
}

export interface AdresseLivraison {
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

export interface CommandeCreateRequest {
  lignes?: LigneCommandeClient[];
  montant_total?: number;
  mode_reception?: 'livraison' | 'retrait_magasin';
  frais_livraison?: number;
  adresse_livraison?: string;
  telephone_client?: string;
  adresse?: AdresseLivraison;
  items?: CheckoutItem[];
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

  // Créer une commande depuis le panier (le backend recalcule tout)
  creerCommandeDepuisPanier(
    items: PanierItem[],
    options?: { adresse?: AdresseLivraison; adresse_livraison?: string; telephone_client?: string }
  ): Observable<CommandeClient> {
    const checkoutItems: CheckoutItem[] = items
      .filter(item => item.id !== undefined)
      .map(item => ({
        panier_item_id: item.id as number,
        mode_reception: item.mode_reception === 'retrait_magasin' ? 'retrait_magasin' : 'livraison'
      }));

    const commandeRequest: CommandeCreateRequest = {
      items: checkoutItems,
      adresse: options?.adresse,
      adresse_livraison: options?.adresse_livraison,
      telephone_client: options?.telephone_client
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
      `${this.apiUrl}/mes-commandes/${id}/`,
      { headers: this.getHeaders() }
    );
  }
}
