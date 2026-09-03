import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

export interface Produit {
  id: number;
  nom: string;
  description: string;
  description_courte?: string;
  description_detaillee?: string;
  precautions?: string;
  prix: number;
  stock: number;
  categorie: number | null;
  categorie_nom?: string;
  type_piece: number | null;
  type_piece_nom?: string;
  image?: string;
  image_url?: string;
  image_2?: string;
  image_2_url?: string;
  image_3?: string;
  image_3_url?: string;
  image_4?: string;
  image_4_url?: string;
  reference?: string;
  marque?: string;
  fabricant?: string;
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
  compatibilites?: ProduitCompatibilite[];
  // Technique
  etat?: 'neuf' | 'occasion' | 'reconditionne';
  garantie_mois?: number;
  garantie_disponible?: boolean;
  conditions_garantie?: string;
  pays_origine?: string;
  reference_oem?: string;
  poids?: number;
  longueur?: number;
  largeur?: number;
  hauteur?: number;
  matiere?: string;
  couleur?: string;
  // Stock
  disponibilite?: 'en_stock' | 'faible_stock' | 'rupture' | 'precommande';
  delai_livraison?: 'same_day' | '24h' | '48h' | '2_5j' | '5_7j' | '7j_plus';
  seuil_alerte?: number;
  quantite_min?: number;
  // Livraison
  livraison_disponible?: boolean;
  retrait_magasin?: boolean;
  delai_preparation?: '24h' | '48h' | '72h' | '4_5j' | '6_7j' | '7j_plus';
  // Complémentaires
  mots_cles?: string[];
  conseils_installation?: string;
  conditions_retour?: string;
  // Avis clients
  note_moyenne?: number;
  nombre_avis?: number;
  // Statistiques
  nombre_vues?: number;
  nombre_favoris?: number;
  nombre_ventes?: number;
  // Images
  image_principale_index?: number;
  // Stock avancé
  date_ajout?: string;
  date_derniere_maj_stock?: string;
  statut_stock?: 'en_stock' | 'faible' | 'rupture';
  // Sections (visibles côté admin, lecture seule côté fournisseur)
  est_vedette?: boolean;
  est_recommande?: boolean;
  est_tendance?: boolean;
  est_bestseller?: boolean;
  est_meilleure_offre?: boolean;
  vente_eclair?: boolean;
}

export interface ProduitCompatibilite {
  marque: string;
  modele: string;
  version?: string;
  motorisation?: string;
  annee_debut?: number | null;
  annee_fin?: number | null;
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