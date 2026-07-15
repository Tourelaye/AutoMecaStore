import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Commande } from '../../models/commande.model';
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

  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) { }

  // Récupérer toutes les commandes du client
  getCommandes(): Observable<Commande[]> {
    return this.http.get<Commande[]>(`${this.apiUrl}/commandes/`);
  }

  // Récupérer une commande
  getCommande(id: number): Observable<Commande> {
    return this.http.get<Commande>(`${this.apiUrl}/commandes/${id}/`);
  }

  // Créer une commande depuis le panier
  creerCommandeDepuisPanier(): Observable<Commande> {
    return this.http.post<Commande>(`${this.apiUrl}/commande/panier/`, {});
  }

  // Créer une commande avec des items personnalisés
  createCommande(data: CreateCommandeRequest): Observable<Commande> {
    return this.http.post<Commande>(`${this.apiUrl}/commandes/create/`, data);
  }

  // Mettre à jour une commande (statut)
  updateCommande(id: number, data: CommandeUpdate): Observable<Commande> {
    return this.http.put<Commande>(`${this.apiUrl}/commandes/${id}/`, data);
  }

  // Supprimer une commande
  deleteCommande(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/commandes/${id}/`);
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