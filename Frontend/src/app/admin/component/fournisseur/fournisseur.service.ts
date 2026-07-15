import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type FournisseurStatus = 'actif' | 'suspendu' | 'en_attente';

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
  chiffre_affaires: number;
  nom_complet: string;
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

  valider(userId: number, action: 'valider' | 'suspendre' | 'reactiver', commentaire?: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${userId}/validation/`,
      { action, commentaire: commentaire || '' }
    );
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