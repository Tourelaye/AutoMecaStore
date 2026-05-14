import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Commande } from '../../models/commande.model';
import { AuthService } from './auth.service';
import { PanierItem } from '../../models/panier.model';

export interface CommandeUpdate {
  statut: string;
}

export interface CommandeItem {
  produit: number;
  quantite: number;
  prix_unitaire: number;
}

export interface CreateCommandeRequest {
  items: CommandeItem[];
  client?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CommandeService {

  private apiUrl = 'http://localhost:8000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Récupérer toutes les commandes du client
  getCommandes(): Observable<Commande[]> {
    return this.http.get<Commande[]>(
      `${this.apiUrl}/commandes/`,
      { headers: this.getHeaders() }
    );
  }

  // Récupérer une commande
  getCommande(id: number): Observable<Commande> {
    return this.http.get<Commande>(
      `${this.apiUrl}/commandes/${id}/`,
      { headers: this.getHeaders() }
    );
  }

  // Créer une commande depuis le panier
  creerCommandeDepuisPanier(): Observable<Commande> {
    return this.http.post<Commande>(
      `${this.apiUrl}/commande/panier/`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // Créer une commande avec des items personnalisés
  createCommande(data: CreateCommandeRequest): Observable<Commande> {
    return this.http.post<Commande>(
      `${this.apiUrl}/commandes/create/`,
      data,
      { headers: this.getHeaders() }
    );
  }

  // Mettre à jour une commande (statut)
  updateCommande(id: number, data: CommandeUpdate): Observable<Commande> {
    return this.http.put<Commande>(
      `${this.apiUrl}/commandes/${id}/`,
      data,
      { headers: this.getHeaders() }
    );
  }

  // Supprimer une commande
  deleteCommande(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/commandes/${id}/`,
      { headers: this.getHeaders() }
    );
  }

  // Convertir les items du panier en format commande
  convertirPanierEnCommandeItems(panierItems: PanierItem[]): CommandeItem[] {
    return panierItems.map(item => ({
      produit: item.produit.id,
      quantite: item.quantite,
      prix_unitaire: item.prix
    }));
  }

}