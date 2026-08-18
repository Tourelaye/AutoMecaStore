import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type FournisseurStatus = 'attente' | 'actif' | 'suspendu' | 'desactive';

export interface MagasinData {
  nom_magasin: string;
  logo: string | null;
  photo_couverture?: string | null;
  telephone: string;
  whatsapp?: string;
  email: string;
  ville: string;
  region: string;
  adresse_complete: string;
  horaires_ouverture?: any;
  jours_ouverture?: string;
  livraison_disponible?: boolean;
  retrait_magasin?: boolean;
  rayon_livraison_km?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

export interface Fournisseur {
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
  magasin?: MagasinData;
  nom_entreprise: string;
  description: string;
  siret: string;
  logo: string | null;
  date_inscription: string;
  statut: FournisseurStatus;
  statut_label: string;
  note_moyenne: number | null;
  nombre_avis: number;
  nombre_produits: number;
  nombre_ventes: number;
  nombre_commandes: number;
  chiffre_affaires: number;
  nom_complet: string;
  raison_refus?: string;
  date_validation?: string | null;
}

export interface FournisseurPayload {
  name: string;
  rep: string;
  siret: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
}

@Injectable({ providedIn: 'root' })
export class FournisseurService {
  private apiUrl = 'http://127.0.0.1:8000/api/admin/fournisseurs';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Fournisseur[]> {
    return this.http.get<Fournisseur[]>(`${this.apiUrl}/`);
  }

  getDetail(userId: number): Observable<Fournisseur> {
    return this.http.get<Fournisseur>(`${this.apiUrl}/${userId}/`);
  }

  updateMagasin(userId: number, data: FormData | Partial<MagasinData>): Observable<MagasinData> {
    return this.http.put<MagasinData>(`${this.apiUrl}/${userId}/magasin/`, data);
  }

  valider(
    userId: number,
    action: 'valider' | 'refuser' | 'suspendre' | 'reactiver',
    motif?: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/${userId}/validation/`, {
      action,
      motif: motif || '',
    });
  }

  delete(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${userId}/delete/`);
  }

  getCommandes(fournisseurId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${fournisseurId}/commandes/`);
  }

  getProduits(fournisseurId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${fournisseurId}/produits/`);
  }

  getStats(fournisseurId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${fournisseurId}/stats/`);
  }
}