import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Offre {
  id: number;
  demande: number;
  fournisseur: number;
  fournisseur_detail?: {
    id: number;
    nom_entreprise: string;
    note_moyenne?: number | null;
  };
  prix: number;
  etat: string;
  etat_libelle: string;
  garantie: string;
  disponibilite: string;
  disponibilite_libelle: string;
  delai: string;
  mode_reception: string;
  mode_reception_libelle: string;
  description: string;
  statut: string;
  statut_libelle: string;
  commande: number | null;
  date_creation: string;
  date_mise_a_jour: string;
}

export interface Demande {
  id: number;
  reference: string;
  client?: number;
  client_detail?: any;
  nom_contact: string;
  email_contact: string;
  telephone_contact: string;
  piece_recherchee: string;
  reference_oem: string;
  quantite: number;
  description: string;
  vehicule: number | null;
  vehicule_detail?: any;
  marque_vehicule: string;
  modele_vehicule: string;
  annee_vehicule: number | null;
  motorisation: string;
  version: string;
  ville: string;
  quartier: string;
  latitude: number | null;
  longitude: number | null;
  photo_piece: string | null;
  photo_vehicule: string | null;
  statut: string;
  statut_libelle: string;
  offres: Offre[];
  offres_count?: number;
  commande: number | null;
  commande_reference?: string;
  date_creation: string;
  date_mise_a_jour: string;
}

@Injectable({
  providedIn: 'root'
})
export class DemandeService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(json = true): HttpHeaders {
    const token = this.authService.getToken();
    const h: any = { 'Authorization': `Bearer ${token}` };
    if (json) {
      h['Content-Type'] = 'application/json';
    }
    return new HttpHeaders(h);
  }

  // Création d'une demande (FormData)
  createDemande(formData: FormData): Observable<Demande> {
    return this.http.post<Demande>(`${this.apiUrl}/demandes/`, formData, {
      headers: this.getHeaders(false)
    });
  }

  // Client - mes demandes
  getMesDemandes(): Observable<Demande[]> {
    return this.http.get<Demande[]>(`${this.apiUrl}/client/demandes/`, { headers: this.getHeaders() });
  }

  getMaDemande(id: number): Observable<Demande> {
    return this.http.get<Demande>(`${this.apiUrl}/client/demandes/${id}/`, { headers: this.getHeaders() });
  }

  getOffresClient(demandeId: number): Observable<Offre[]> {
    return this.http.get<Offre[]>(
      `${this.apiUrl}/client/demandes/${demandeId}/offres/`,
      { headers: this.getHeaders() }
    );
  }

  accepterOffre(demandeId: number, offreId: number, modeReception?: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/client/demandes/${demandeId}/accepter/`,
      { offre_id: offreId, mode_reception: modeReception },
      { headers: this.getHeaders() }
    );
  }

  // Fournisseur - demandes ouvertes
  getDemandesFournisseur(params?: any): Observable<Demande[]> {
    let httpParams = new HttpParams();
    if (params?.ville) {
      httpParams = httpParams.set('ville', params.ville);
    }
    if (params?.marque) {
      httpParams = httpParams.set('marque', params.marque);
    }
    return this.http.get<Demande[]>(
      `${this.apiUrl}/fournisseur/demandes/`,
      { headers: this.getHeaders(), params: httpParams }
    );
  }

  getDemandeFournisseur(id: number): Observable<Demande> {
    return this.http.get<Demande>(`${this.apiUrl}/fournisseur/demandes/${id}/`, { headers: this.getHeaders() });
  }

  creerOffre(demandeId: number, offre: Partial<Offre>): Observable<Offre> {
    return this.http.post<Offre>(
      `${this.apiUrl}/fournisseur/demandes/${demandeId}/offrir/`,
      offre,
      { headers: this.getHeaders() }
    );
  }

  getMesOffresFournisseur(): Observable<Offre[]> {
    return this.http.get<Offre[]>(`${this.apiUrl}/fournisseur/offres/`, { headers: this.getHeaders() });
  }

  // Admin
  getDemandesAdmin(params?: any): Observable<Demande[]> {
    let httpParams = new HttpParams();
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    return this.http.get<Demande[]>(
      `${this.apiUrl}/admin/demandes/`,
      { headers: this.getHeaders(), params: httpParams }
    );
  }

  getDemandeAdmin(id: number): Observable<Demande> {
    return this.http.get<Demande>(`${this.apiUrl}/admin/demandes/${id}/`, { headers: this.getHeaders() });
  }

  actionAdmin(id: number, statut: string): Observable<Demande> {
    return this.http.post<Demande>(
      `${this.apiUrl}/admin/demandes/${id}/action/`,
      { statut },
      { headers: this.getHeaders() }
    );
  }
}
