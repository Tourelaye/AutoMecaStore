import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:8000/api';

export interface Categorie {
  id: number;
  nom: string;
  description: string;
  nombre_produits: number;
}

export interface Produit {
  id: number;
  nom: string;
  description: string;
  prix: number;
  stock: number;
  image?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  image_url?: string;
  image_2_url?: string;
  image_3_url?: string;
  image_4_url?: string;
  categorie?: number;
  categorie_nom?: string;
  categorie_detail?: { id: number; nom: string };
  type_piece?: number;
  type_piece_nom?: string;
  type_piece_detail?: { id: number; nom: string };
  est_en_promo: boolean;
  prix_promo?: number;
  pourcentage_reduction?: number;
  date_debut_promo?: string;
  date_fin_promo?: string;
  vente_eclair: boolean;
  heure_debut_eclair?: string;
  heure_fin_eclair?: string;
  est_vedette: boolean;
  est_tendance: boolean;
  est_recommande: boolean;
  est_bestseller: boolean;
  nombre_vues: number;
  nombre_favoris: number;
  nombre_ventes: number;
  // Avis clients
  note_moyenne?: number;
  nombre_avis?: number;
  reference?: string;
  marque?: string;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  constructor(private http: HttpClient) {}

  // Catégories avec nombre de produits
  getCategories(): Observable<{ success: boolean; data: Categorie[] }> {
    return this.http.get<{ success: boolean; data: Categorie[] }>(`${API_URL}/home/categories/`);
  }

  // Ventes Flash (produits en promotion)
  getFlashSales(): Observable<{ success: boolean; data: Produit[] }> {
    return this.http.get<{ success: boolean; data: Produit[] }>(`${API_URL}/home/flash-sales/`);
  }

  // Bestsellers (produits les plus vendus)
  getBestSellers(limit: number = 10): Observable<{ success: boolean; data: Produit[] }> {
    return this.http.get<{ success: boolean; data: Produit[] }>(`${API_URL}/home/bestsellers/?limit=${limit}`);
  }

  // Produits tendance
  getTrending(limit: number = 10): Observable<{ success: boolean; data: Produit[] }> {
    return this.http.get<{ success: boolean; data: Produit[] }>(`${API_URL}/home/trending/?limit=${limit}`);
  }

  // Ventes éclair (limitées dans le temps par heure)
  getFlashDeals(): Observable<{ success: boolean; data: Produit[]; current_time: string }> {
    return this.http.get<{ success: boolean; data: Produit[]; current_time: string }>(`${API_URL}/home/flash-deals/`);
  }

  // Produits vedettes
  getFeatured(limit: number = 10): Observable<{ success: boolean; data: Produit[] }> {
    return this.http.get<{ success: boolean; data: Produit[] }>(`${API_URL}/home/featured/?limit=${limit}`);
  }

  // Produits recommandés
  getRecommended(limit: number = 10): Observable<{ success: boolean; data: Produit[] }> {
    return this.http.get<{ success: boolean; data: Produit[] }>(`${API_URL}/home/recommended/?limit=${limit}`);
  }

  // Incrémenter les vues d'un produit
  incrementProductViews(productId: number): Observable<{ success: boolean; data: { nombre_vues: number } }> {
    return this.http.post<{ success: boolean; data: { nombre_vues: number } }>(
      `${API_URL}/produits/${productId}/increment-views/`,
      {}
    );
  }

  // Recherches populaires (basées sur les produits les plus vus)
  getPopularSearches(): Observable<{ success: boolean; data: { searches: any[]; trends: any[] } }> {
    return this.http.get<{ success: boolean; data: { searches: any[]; trends: any[] } }>(`${API_URL}/home/popular-searches/`);
  }
}
