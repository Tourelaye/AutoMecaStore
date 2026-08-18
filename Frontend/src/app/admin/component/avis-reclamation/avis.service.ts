import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Signalement {
  id: number;
  avis: number;
  client_nom: string | null;
  fournisseur_nom: string | null;
  motif: string;
  motif_label: string;
  commentaire: string;
  date: string;
  statut: string;
  statut_label: string;
}

export interface AvisList {
  id: number;
  note: number;
  commentaire: string;
  date: string;
  approuve: boolean;
  achat_verifie: boolean;
  client_nom: string | null;
  client_prenom: string | null;
  client_email: string | null;
  client_photo: string | null;
  produit_nom: string | null;
  produit_image: string | null;
  magasin_nom: string | null;
  commande_reference: string | null;
  fournisseur_nom: string | null;
  nb_signalements: number;
  signale_en_attente: boolean;
  note_qualite_produit: number | null;
  note_delai: number | null;
  note_communication: number | null;
  note_livraison: number | null;
  reponse_fournisseur: string | null;
  date_reponse: string | null;
}

export interface AvisDetail {
  id: number;
  note: number;
  commentaire: string;
  date: string;
  approuve: boolean;
  achat_verifie: boolean;
  client: {
    id: number;
    nom: string;
    prenom: string;
    nom_complet: string;
    email: string;
    telephone: string | null;
    photo: string | null;
  } | null;
  produit: {
    id: number;
    nom: string;
    reference: string;
    image: string | null;
    prix: number | null;
  } | null;
  magasin: {
    id: number;
    nom_magasin: string;
  } | null;
  commande: {
    id: number;
    reference: string;
    date_commande: string;
    statut: string;
    montant_total: number;
  } | null;
  note_qualite_produit: number | null;
  note_delai: number | null;
  note_communication: number | null;
  note_livraison: number | null;
  reponse_fournisseur: string | null;
  date_reponse: string | null;
  reponse_fournisseur_nom: string | null;
  photos: any;
  signalements: Signalement[];
}

export interface AvisStats {
  total: number;
  visibles: number;
  masques: number;
  signales: number;
  signalements_en_attente: number;
  note_moyenne: number;
  achats_verifies: number;
  par_note: { note: number; count: number }[];
}

export interface AvisFilters {
  note?: string;
  statut?: string;
  achat_verifie?: string;
  signale?: string;
  periode?: string;
  q?: string;
}

export interface AvisActionPayload {
  action: 'approuver' | 'masquer' | 'repondre' | 'supprimer' | 'signaler';
  reponse_admin?: string;
  motif?: string;
  commentaire?: string;
}

@Injectable({ providedIn: 'root' })
export class AvisService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api/admin/avis';

  constructor(private http: HttpClient) {}

  getAvis(filters: AvisFilters): Observable<AvisList[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value);
      }
    });
    return this.http.get<AvisList[]>(`${this.baseUrl}/v2/`, { params });
  }

  getAvisDetail(id: number): Observable<AvisDetail> {
    return this.http.get<AvisDetail>(`${this.baseUrl}/${id}/detail/`);
  }

  getStats(): Observable<AvisStats> {
    return this.http.get<AvisStats>(`${this.baseUrl}/stats/`);
  }

  action(id: number, payload: AvisActionPayload): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/action/`, payload);
  }

  getSignalements(id: number): Observable<Signalement[]> {
    return this.http.get<Signalement[]>(`${this.baseUrl}/${id}/signalements/`);
  }

  updateSignalement(avisId: number, signalementId: number, statut: string): Observable<Signalement> {
    return this.http.patch<Signalement>(`${this.baseUrl}/${avisId}/signalements/`, {
      signalement_id: signalementId,
      statut,
    });
  }
}