import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

export interface FournisseurProfile {
  user: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    role: string;
    adresse: string;
    telephone: string;
    is_active: boolean;
    date_joined: string;
  };
  nom_entreprise: string;
  description: string;
  siret: string;
  logo: string | null;
  date_inscription: string;
  statut: string;
  date_validation: string | null;
  note_moyenne: number | null;
  nombre_avis: number;
  nombre_produits: number;
  nombre_ventes: number;
  chiffre_affaires: number;
  nom_complet: string;
}

export interface FournisseurStats {
  totalProduits: number;
  produitsActifs: number;
  stockFaible: number;
  rupture: number;
  commandesMois: number;
  commandesEnAttente: number;
  chiffreAffaires: number;
  produitsVendus: number;
  tauxActifs: number;
}

export interface Vente {
  id: number;
  commande_ref: string;
  produit_nom: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
  date: string;
  statut: string;
}

export interface StockItem {
  id: number;
  nom: string;
  reference: string;
  stock: number;
  prix: number;
  statut: 'rupture' | 'faible' | 'ok';
  image: string | null;
}

export interface Promotion {
  id: number;
  nom: string;
  prix_normal: number;
  prix_promo: number | null;
  reduction: number | null;
  date_debut: string | null;
  date_fin: string | null;
  active: boolean;
}

export interface Magasin {
  id?: number;
  nom_magasin: string;
  logo?: string | null;
  logo_url?: string | null;
  photo_couverture?: string | null;
  photo_couverture_url?: string | null;
  description: string;
  telephone: string;
  whatsapp: string;
  email: string;
  adresse_complete: string;
  ville: string;
  region: string;
  latitude?: number | null;
  longitude?: number | null;
  horaires_ouverture: { [jour: string]: { ouvert: boolean; debut: string; fin: string } } | any;
  jours_ouverture: string;
  livraison_disponible: boolean;
  retrait_magasin: boolean;
  rayon_livraison_km?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class FournisseurService {
  private apiUrl = 'http://127.0.0.1:8000/api/fournisseur';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ===== PROFIL =====
  getProfile(): Observable<FournisseurProfile> {
    return this.http.get<FournisseurProfile>(`${this.apiUrl}/profil/`);
  }

  updateProfile(data: FormData | Partial<FournisseurProfile>): Observable<FournisseurProfile> {
    return this.http.patch<FournisseurProfile>(`${this.apiUrl}/profil/`, data);
  }

  // ===== MON MAGASIN =====
  getMagasin(): Observable<Magasin> {
    return this.http.get<Magasin>(`${this.apiUrl}/magasin/`);
  }

  updateMagasin(data: FormData): Observable<Magasin> {
    return this.http.patch<Magasin>(`${this.apiUrl}/magasin/`, data);
  }

  // ===== STATISTIQUES =====
  getStatistics(): Observable<FournisseurStats> {
    return this.http.get<FournisseurStats>(`${this.apiUrl}/stats/`);
  }

  // ===== VENTES =====
  getVentes(): Observable<Vente[]> {
    return this.http.get<Vente[]>(`${this.apiUrl}/ventes/`);
  }
}