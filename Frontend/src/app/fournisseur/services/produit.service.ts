import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

export interface Produit {
  id: number;
  nom: string;
  description: string;
  prix: number;
  stock: number;
  categorie: number | null;
  categorie_nom?: string;
  type_piece: number | null;
  type_piece_nom?: string;
  image?: string;
  image_url?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  reference?: string;
  marque?: string;
  est_en_promo?: boolean;
  prix_promo?: number;
  pourcentage_reduction?: number;
  date_debut_promo?: string;
  date_fin_promo?: string;
  is_active?: boolean;
  // Compatibilité
  modeles_compatibles?: string[];
  annee_debut?: number;
  annee_fin?: number;
  // Technique
  etat?: 'neuf' | 'occasion' | 'reconditionne';
  garantie_mois?: number;
  pays_origine?: string;
  reference_oem?: string;
  poids?: number;
  longueur?: number;
  largeur?: number;
  hauteur?: number;
  // Stock
  disponibilite?: 'en_stock' | 'faible_stock' | 'rupture' | 'precommande';
  delai_livraison?: 'same_day' | '24h' | '48h' | '2_5j' | '5_7j' | '7j_plus';
  // Complémentaires
  mots_cles?: string[];
  conseils_installation?: string;
  conditions_retour?: string;
  // Avis clients
  note_moyenne?: number;
  nombre_avis?: number;
  // Images
  image_principale_index?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProduitService {
  private apiUrl = 'http://127.0.0.1:8000/api/fournisseur/produits';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getProduits(): Observable<Produit[]> {
    return this.http.get<Produit[]>(`${this.apiUrl}/`);
  }

  getProduit(id: number): Observable<Produit> {
    return this.http.get<Produit>(`${this.apiUrl}/${id}/`);
  }

  createProduit(formData: FormData): Observable<Produit> {
    return this.http.post<Produit>(`${this.apiUrl}/`, formData);
  }

  updateProduit(id: number, formData: FormData): Observable<Produit> {
    return this.http.patch<Produit>(`${this.apiUrl}/${id}/`, formData);
  }

  deleteProduit(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/`);
  }
}