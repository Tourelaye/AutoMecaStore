import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Categorie {
  id: number;
  nom: string;
  description: string;
  etat: boolean;
}

export interface SousCategorie {
  id: number;
  nom: string;
  description?: string;
  categorie: number;
  categorie_nom?: string;
  etat: boolean;
}

export interface Produit {
  id: number;
  nom: string;
  description: string;
  prix: number;
  stock: number;
  categorie: Categorie | null;
  categorie_detail?: Categorie | null;  // Objet catégorie complet (lecture seule)
  categorie_nom?: string;  // Nom de la catégorie (lecture seule)
  sous_categorie?: SousCategorie | null;
  sous_categorie_detail?: SousCategorie | null;  // Objet sous-catégorie complet (lecture seule)
  sous_categorie_nom?: string;  // Nom de la sous-catégorie (lecture seule)
  type_piece?: any;  // Type de pièce (foreign key)
  type_piece_nom?: string;  // Nom du type de pièce (lecture seule)
  image?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  image_url?: string;  // URL complète de l'image principale (lecture seule)
  image_2_url?: string;  // URL complète de l'image 2 (lecture seule)
  image_3_url?: string;  // URL complète de l'image 3 (lecture seule)
  image_4_url?: string;  // URL complète de l'image 4 (lecture seule)
  reference?: string;
  marque?: string;
  est_en_promo?: boolean;
  prix_promo?: number;
  pourcentage_reduction?: number;
  date_debut_promo?: string;
  date_fin_promo?: string;
  vente_eclair?: boolean;
  heure_debut_eclair?: string;
  heure_fin_eclair?: string;
  est_vedette?: boolean;
  est_tendance?: boolean;
  est_recommande?: boolean;
  est_bestseller?: boolean;
  nombre_vues?: number;
  nombre_favoris?: number;
  nombre_ventes?: number;
  deleting?: boolean;
}

export interface ProduitListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Produit[];
}

@Injectable({
  providedIn: 'root'
})
export class ProduitService {

  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  // ---------------------------------
  // Récupérer un produit spécifique
  // ---------------------------------
  getProduit(id: number): Observable<Produit> {
    return this.http.get<Produit>(`${this.apiUrl}/produits/${id}/`);
  }

  // ---------------------------------
  // Récupérer tous les produits
  // ---------------------------------
  getProduits(params?: {
    search?: string;
    categorie?: number;
    type_piece?: number;
    page?: number;
  }): Observable<ProduitListResponse | Produit[]> {

    let httpParams = new HttpParams();

    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params?.categorie) {
      httpParams = httpParams.set('categorie', params.categorie.toString());
    }
    if (params?.type_piece) {
      httpParams = httpParams.set('type_piece', params.type_piece.toString());
    }
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }

    return this.http.get<ProduitListResponse | Produit[]>(
      `${this.apiUrl}/produits/`,
      { params: httpParams }
    );
  }

  // ---------------------------------
  // Récupérer les produits par catégorie ID
  // ---------------------------------
  getProduitsByCategorieId(categorieId: number): Observable<Produit[]> {
    return this.http.get<Produit[]>(`${this.apiUrl}/produits/`, {
      params: new HttpParams().set('categorie', categorieId.toString())
    });
  }

  // ---------------------------------
  // Recherche rapide (pour la searchbar du header)
  // ---------------------------------
  rechercherProduits(query: string): Observable<Produit[]> {
    return this.http.get<Produit[]>(`${this.apiUrl}/produits/`, {
      params: new HttpParams().set('search', query)
    });
  }

  // ---------------------------------
  // Récupérer les catégories
  // ---------------------------------
  getCategories(): Observable<Categorie[]> {
    return this.http.get<Categorie[]>(`${this.apiUrl}/categories/`);
  }

  // ---------------------------------
  // Récupérer les types de pièces
  // ---------------------------------
  getTypesPieces(categorieId?: number): Observable<SousCategorie[]> {
    let params = new HttpParams();
    if (categorieId) {
      params = params.set('categorie', categorieId.toString());
    }
    return this.http.get<SousCategorie[]>(`${this.apiUrl}/types-pieces/`, { params });
  }

  // ---------------------------------
  // Produits par catégorie nom (auto, moto, etc.)
  // ---------------------------------
  getProduitsByCategorieName(nom: string): Observable<Produit[]> {
    return this.http.get<Produit[]>(`${this.apiUrl}/produits/`, {
      params: new HttpParams().set('categorie__nom__icontains', nom)
    });
  }

  // ---------------------------------
  // Créer un nouveau produit
  // ---------------------------------
  createProduit(produit: Omit<Produit, 'id'>): Observable<Produit> {
    return this.http.post<Produit>(`${this.apiUrl}/produits/`, produit);
  }

  // ---------------------------------
  // Créer un produit avec image (FormData)
  // ---------------------------------
  createProduitWithImage(formData: FormData): Observable<Produit> {
    return this.http.post<Produit>(`${this.apiUrl}/produits/`, formData);
  }

  // ---------------------------------
  // Mettre à jour un produit
  // ---------------------------------
  updateProduit(id: number, produit: Partial<Produit>): Observable<Produit> {
    return this.http.put<Produit>(`${this.apiUrl}/produits/${id}/`, produit);
  }

  // ---------------------------------
  // Mettre à jour un produit avec image (FormData) - PATCH
  // ---------------------------------
  patchProduitWithImage(id: number, formData: FormData): Observable<any> {
    return this.http.patch(`${this.apiUrl}/produits/${id}/`, formData);
  }

  // ---------------------------------
  // Supprimer un produit
  // ---------------------------------
  deleteProduit(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/produits/${id}/`);
  }
}