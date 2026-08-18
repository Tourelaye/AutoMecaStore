import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { Produit } from './produit.service';

export type StatutCommande =
  | 'nouvelle_commande'
  | 'en_attente_confirmation'
  | 'acceptee'
  | 'en_preparation'
  | 'prete_a_retirer'
  | 'en_cours_livraison'
  | 'livree'
  | 'terminee'
  | 'refusee'
  | 'annulee';

export interface ClientInfo {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
}

export interface LigneCommande {
  id: number;
  produit: Produit;
  produit_nom: string;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
}

export interface HistoriqueCommande {
  id: number;
  statut: StatutCommande;
  commentaire: string;
  motif: string;
  utilisateur: string;
  date: string;
}

export interface Commande {
  id: number;
  reference: string;
  numero: string;
  date_commande: string;
  statut: StatutCommande;
  montant_total: number;
  frais_livraison: number;
  mode_paiement: string;
  mode_reception: 'livraison' | 'retrait_magasin';
  commentaire_fournisseur: string;
  client: ClientInfo | null;
  lignes: LigneCommande[];
  historique: HistoriqueCommande[];
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

  updateCommandeStatut(id: number, statut: string, motif?: string, commentaire?: string, commentaireFournisseur?: string): Observable<Commande> {
    const payload: any = { statut };
    if (motif !== undefined) payload.motif = motif;
    if (commentaire !== undefined) payload.commentaire = commentaire;
    if (commentaireFournisseur !== undefined) payload.commentaire_fournisseur = commentaireFournisseur;
    return this.http.patch<Commande>(`${this.apiUrl}/${id}/statut/`, payload);
  }

  updateCommentaireFournisseur(id: number, commentaire: string): Observable<Commande> {
    return this.http.patch<Commande>(`${this.apiUrl}/${id}/commentaire/`, { commentaire_fournisseur: commentaire });
  }
}