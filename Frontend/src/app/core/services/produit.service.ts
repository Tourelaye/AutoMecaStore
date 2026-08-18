import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
  est_meilleure_offre?: boolean;
  nombre_vues?: number;
  nombre_favoris?: number;
  nombre_ventes?: number;
  // Avis clients
  note_moyenne?: number;
  nombre_avis?: number;
  nombre_magasins?: number;
  deleting?: boolean;
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
  matiere?: string;
  couleur?: string;
  fabricant?: string;
  // Stock
  disponibilite?: 'en_stock' | 'faible_stock' | 'rupture' | 'precommande';
  delai_livraison?: 'same_day' | '24h' | '48h' | '2_5j' | '5_7j' | '7j_plus';
  // Compatibilité avancée
  compatibilites?: ProduitCompatibilite[];
  // Compatibilité dynamique avec le véhicule actif
  compatibilite_vehicule?: { statut: 'compatible' | 'non_compatible' | 'a_verifier'; motif?: string };
  // Garantie
  garantie_disponible?: boolean;
  conditions_garantie?: string;
  // Stock avancé
  seuil_alerte?: number;
  quantite_min?: number;
  // Livraison
  livraison_disponible?: boolean;
  retrait_magasin?: boolean;
  delai_preparation?: '24h' | '48h' | '72h' | '4_5j' | '6_7j' | '7j_plus';
  // Descriptions
  description_courte?: string;
  description_detaillee?: string;
  precautions?: string;
  // Complémentaires
  mots_cles?: string[];
  conseils_installation?: string;
  conditions_retour?: string;
  // Images
  image_principale_index?: number;
  // Nouveauté
  date_ajout?: string;
  is_new?: boolean;
  // Fournisseur / magasin
  fournisseur?: number;
  fournisseur_detail?: FournisseurDetail;
  magasin_detail?: MagasinDetail;
  offres?: Offre[];
  avis?: AvisProduit[];
  distribution_etoiles?: DistributionEtoiles;
}

export interface ProduitCompatibilite {
  marque: string;
  modele: string;
  version?: string;
  motorisation?: string;
  annee_debut?: number | null;
  annee_fin?: number | null;
}

export interface FournisseurDetail {
  id: number;
  nom_entreprise: string;
  note?: number;
}

export interface MagasinDetail {
  id: number;
  nom_magasin?: string;
  logo_url?: string;
  adresse?: string;
  ville?: string;
  region?: string;
  telephone?: string;
  whatsapp?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  horaires_ouverture?: any;
  jours_ouverture?: string;
  livraison_disponible?: boolean;
  retrait_magasin?: boolean;
  rayon_livraison_km?: number;
  distance_km?: number | null;
  note?: number | null;
}

export interface Offre {
  fournisseur: FournisseurDetail;
  magasin?: MagasinDetail;
  prix: number;
  stock: number;
  livraison_disponible: boolean;
  retrait_magasin: boolean;
  delai_livraison: string;
  distance_km?: number | null;
  badge?: string | null;
  badges?: string[];
}

export interface AvisProduit {
  id: number;
  note: number;
  commentaire: string;
  date: string;
  client_nom: string;
  client_prenom?: string;
  client_photo?: string | null;
  achat_verifie: boolean;
  reponse_fournisseur?: string;
  date_reponse?: string;
  reponse_fournisseur_nom?: string;
  photos?: string[];
}

export interface DistributionEtoiles {
  [note: string]: { count: number; pct: number };
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
  // Magasin
  // ---------------------------------
  getMagasin(id: number, lat?: number | null, lng?: number | null): Observable<MagasinDetail> {
    let params = new HttpParams();
    if (lat != null) params = params.set('lat', lat.toString());
    if (lng != null) params = params.set('lng', lng.toString());
    return this.http.get<MagasinDetail>(`${this.apiUrl}/magasins/${id}/`, { params });
  }

  // ---------------------------------
  // Autocomplétion de recherche
  // ---------------------------------
  getSuggestions(q: string): Observable<string[]> {
    return this.http.get<{ suggestions: string[] }>(
      `${this.apiUrl}/produits/autocomplete/`,
      { params: new HttpParams().set('q', q) }
    ).pipe(map(res => res.suggestions || []));
  }

  // ---------------------------------
  // Récupérer un produit spécifique
  // ---------------------------------
  getProduit(id: number, lat?: number, lng?: number): Observable<Produit> {
    let params = new HttpParams();
    if (lat != null) {
      params = params.set('lat', lat.toString());
    }
    if (lng != null) {
      params = params.set('lng', lng.toString());
    }
    return this.http.get<any>(`${this.apiUrl}/produits/${id}/`, { params }).pipe(
      map((res: any) => res?.data || res)
    ) as Observable<Produit>;
  }

  // ---------------------------------
  // Récupérer tous les produits
  // ---------------------------------
  getProduits(params?: {
    search?: string;
    categorie?: number;
    type_piece?: number;
    page?: number;
    page_size?: number;
    marque?: string;
    etat?: string;
    prix_min?: number;
    prix_max?: number;
    disponibilite?: string;
    livraison?: boolean;
    retrait?: boolean;
    note_min?: number;
    sort?: string;
    magasin?: string;
    note_magasin_min?: number;
    lat?: number | null;
    lng?: number | null;
    veh_marque?: string;
    veh_modele?: string;
    veh_version?: string;
    veh_motorisation?: string;
    veh_annee?: string;
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
    if (params?.page_size) {
      httpParams = httpParams.set('page_size', params.page_size.toString());
    }
    if (params?.marque) {
      httpParams = httpParams.set('marque', params.marque);
    }
    if (params?.etat) {
      httpParams = httpParams.set('etat', params.etat);
    }
    if (params?.prix_min != null) {
      httpParams = httpParams.set('prix_min', params.prix_min.toString());
    }
    if (params?.prix_max != null) {
      httpParams = httpParams.set('prix_max', params.prix_max.toString());
    }
    if (params?.disponibilite) {
      httpParams = httpParams.set('disponibilite', params.disponibilite);
    }
    if (params?.livraison) {
      httpParams = httpParams.set('livraison', 'true');
    }
    if (params?.retrait) {
      httpParams = httpParams.set('retrait', 'true');
    }
    if (params?.note_min != null) {
      httpParams = httpParams.set('note_min', params.note_min.toString());
    }
    if (params?.magasin) {
      httpParams = httpParams.set('magasin', params.magasin);
    }
    if (params?.note_magasin_min != null) {
      httpParams = httpParams.set('note_magasin_min', params.note_magasin_min.toString());
    }
    if (params?.lat != null) {
      httpParams = httpParams.set('lat', params.lat.toString());
    }
    if (params?.lng != null) {
      httpParams = httpParams.set('lng', params.lng.toString());
    }
    if (params?.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    if (params?.veh_marque) {
      httpParams = httpParams.set('veh_marque', params.veh_marque);
    }
    if (params?.veh_modele) {
      httpParams = httpParams.set('veh_modele', params.veh_modele);
    }
    if (params?.veh_version) {
      httpParams = httpParams.set('veh_version', params.veh_version);
    }
    if (params?.veh_motorisation) {
      httpParams = httpParams.set('veh_motorisation', params.veh_motorisation);
    }
    if (params?.veh_annee) {
      httpParams = httpParams.set('veh_annee', params.veh_annee);
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

  // ---------------------------------
  // Demande de pièce (pièce introuvable)
  // ---------------------------------
  createDemandePiece(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/demandes/`, formData);
  }
}