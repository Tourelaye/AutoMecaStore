import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Categorie {
  id: number;
  nom: string;
  description: string;
  etat: boolean;
}

export interface Produit {
  id: number;
  nom: string;
  description: string;
  prix: number;
  stock: number;
  categorie: Categorie | null;
  image?: string;
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

  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // ---------------------------------
  // Récupérer tous les produits
  // ---------------------------------
  getProduits(params?: {
    search?: string;
    categorie?: number;
    page?: number;
  }): Observable<ProduitListResponse | Produit[]> {

    let httpParams = new HttpParams();

    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params?.categorie) {
      httpParams = httpParams.set('categorie', params.categorie.toString());
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
  // Récupérer un produit par ID
  // ---------------------------------
  getProduitById(id: number): Observable<Produit> {
    return this.http.get<Produit>(`${this.apiUrl}/produits/${id}/`);
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
  // Produits par catégorie nom (auto, moto, etc.)
  // ---------------------------------
  getProduitsByCategorieName(nom: string): Observable<Produit[]> {
    return this.http.get<Produit[]>(`${this.apiUrl}/produits/`, {
      params: new HttpParams().set('categorie__nom__icontains', nom)
    });
  }
}