import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

export interface Commande {
  id: number;
  reference: string;
  date_commande: string;
  statut: string;
  montant_total: number;
  client: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
  };
  lignes: {
    id: number;
    produit_nom: string;
    quantite: number;
    prix_unitaire: number;
    sous_total: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class CommandeService {
  private apiUrl = 'http://127.0.0.1:8000/api/fournisseur/commandes';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getCommandes(): Observable<Commande[]> {
    return this.http.get<Commande[]>(`${this.apiUrl}/`);
  }

  getCommande(id: number): Observable<Commande> {
    return this.http.get<Commande>(`${this.apiUrl}/${id}/`);
  }

  updateCommandeStatut(id: number, statut: string): Observable<Commande> {
    return this.http.patch<Commande>(`${this.apiUrl}/${id}/statut/`, { statut });
  }
}