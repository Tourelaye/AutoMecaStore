import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Produit {
  id: number;
  nom: string;
  description: string;
  prix: number;
  stock: number;
  image?: string;
  categorie?: number;
  categorie_nom?: string;
  fournisseur?: number;
  fournisseur_nom?: string;
  reference?: string;
  marque?: string;
  statut_approbation: 'en_attente' | 'approuve' | 'rejete';
  motif_rejet?: string;
  created_at?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ApprobationProduitService {
  private apiUrl = 'http://127.0.0.1:8000/api/admin/produits';

  constructor(private http: HttpClient) {}

  // Liste des produits en attente d'approbation
  getProduitsEnAttente(): Observable<Produit[]> {
    return this.getProduits('en_attente');
  }

  // Liste des produits filtrée par statut d'approbation ('tous' pour tout)
  getProduits(statut_approbation: 'tous' | 'en_attente' | 'approuve' | 'rejete' = 'tous'): Observable<Produit[]> {
    const url = statut_approbation === 'tous'
      ? `${this.apiUrl}/en-attente/?statut_approbation=tous`
      : `${this.apiUrl}/en-attente/?statut_approbation=${statut_approbation}`;
    return this.http.get<Produit[]>(url);
  }

  // Approuver un produit
  approuverProduit(id: number): Observable<Produit> {
    return this.http.patch<Produit>(`${this.apiUrl}/${id}/approbation/`, {
      statut: 'approuve'
    });
  }

  // Rejeter un produit
  rejeterProduit(id: number, motif: string): Observable<Produit> {
    return this.http.patch<Produit>(`${this.apiUrl}/${id}/approbation/`, {
      statut: 'rejete',
      motif_rejet: motif
    });
  }

  // Supprimer (soft delete) un produit
  supprimerProduit(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`);
  }

  // Détails d'un produit
  getProduitDetail(id: number): Observable<Produit> {
    return this.http.get<Produit>(`${this.apiUrl}/${id}/`);
  }
}
