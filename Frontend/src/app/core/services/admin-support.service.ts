import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface AdminAvis {
  id: number;
  note: number;
  commentaire: string;
  date: string;
  approuve: boolean;
  achat_verifie: boolean;
  client_nom: string;
  client_prenom: string;
  client_email: string;
  client_photo: string | null;
  produit_nom: string;
  produit_image: string | null;
  magasin_nom: string | null;
  commande_reference: string | null;
  nb_signalements: number;
  signale_en_attente: boolean;
}

export interface AdminAvisDetail extends AdminAvis {
  client: number | null;
  produit: number | null;
  magasin: number | null;
  commande: number | null;
  note_qualite_produit: number | null;
  note_delai: number | null;
  note_communication: number | null;
  note_livraison: number | null;
  reponse_fournisseur: string | null;
  date_reponse: string | null;
  reponse_fournisseur_nom: string | null;
  photos: any[];
  signale: boolean;
}

export interface AdminAvisStats {
  total: number;
  visibles: number;
  masques: number;
  signales: number;
  signalements_en_attente: number;
  note_moyenne: number;
  achats_verifies: number;
  par_note: { note: number; count: number }[];
}

export interface DemandePartenariat {
  id: number;
  nom_entreprise: string;
  marque: string;
  email_contact: string;
  telephone: string;
  message: string;
  statut: string;
  statut_label: string;
  reponse_admin: string;
  date_soumission: string;
  date_traitement: string | null;
  traitee_par: number | null;
  traitee_par_nom: string | null;
}

export interface DemandePartenariatStats {
  total: number;
  nouvelles: number;
  en_cours: number;
  acceptees: number;
  rejetees: number;
}

export interface MessageSupport {
  id: number;
  objet: string;
  contenu: string;
  date_envoi: string;
  statut: string;
  statut_label: string;
  client: number | null;
  client_nom: string | null;
  client_prenom: string | null;
  client_email: string | null;
  client_photo: string | null;
  ticket: number | null;
}

export interface MessageSupportStats {
  total: number;
  non_lus: number;
  lus: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminSupportService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ── Avis ──
  getAvis(params?: { statut?: string; note?: string; q?: string; periode?: string }): Observable<AdminAvis[]> {
    let httpParams = new HttpParams();
    if (params?.statut && params.statut !== 'tous') httpParams = httpParams.set('statut', params.statut);
    if (params?.note && params.note !== 'toutes') httpParams = httpParams.set('note', params.note);
    if (params?.q) httpParams = httpParams.set('q', params.q);
    if (params?.periode && params.periode !== 'tous') httpParams = httpParams.set('periode', params.periode);
    return this.http.get<AdminAvis[]>(`${this.apiUrl}/admin/avis/v2/`, { headers: this.getHeaders(), params: httpParams });
  }

  getAvisDetail(id: number): Observable<AdminAvisDetail> {
    return this.http.get<AdminAvisDetail>(`${this.apiUrl}/admin/avis/${id}/detail/`, { headers: this.getHeaders() });
  }

  getAvisStats(): Observable<AdminAvisStats> {
    return this.http.get<AdminAvisStats>(`${this.apiUrl}/admin/avis/stats/`, { headers: this.getHeaders() });
  }

  avisAction(id: number, action: string, extra?: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/avis/${id}/action/`, { action, ...extra }, { headers: this.getHeaders() });
  }

  // ── Partenariats ──
  getPartenariats(params?: { statut?: string; q?: string }): Observable<DemandePartenariat[]> {
    let httpParams = new HttpParams();
    if (params?.statut && params.statut !== 'tous') httpParams = httpParams.set('statut', params.statut);
    if (params?.q) httpParams = httpParams.set('search', params.q);
    return this.http.get<DemandePartenariat[]>(`${this.apiUrl}/admin/partenariats/`, { headers: this.getHeaders(), params: httpParams });
  }

  getPartenariatDetail(id: number): Observable<DemandePartenariat> {
    return this.http.get<DemandePartenariat>(`${this.apiUrl}/admin/partenariats/${id}/`, { headers: this.getHeaders() });
  }

  getPartenariatStats(): Observable<DemandePartenariatStats> {
    return this.http.get<DemandePartenariatStats>(`${this.apiUrl}/admin/partenariats/stats/`, { headers: this.getHeaders() });
  }

  partenariatAction(id: number, action: string, extra?: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/partenariats/${id}/action/`, { action, ...extra }, { headers: this.getHeaders() });
  }

  // ── Public: soumettre demande partenariat ──
  submitPartenariat(data: {
    nom_entreprise: string;
    marque?: string;
    email_contact: string;
    telephone?: string;
    message: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/partenariat/create/`, data, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ── Messages de support ──
  getMessages(params?: { statut?: string; q?: string }): Observable<MessageSupport[]> {
    let httpParams = new HttpParams();
    if (params?.statut && params.statut !== 'tous') httpParams = httpParams.set('statut', params.statut);
    if (params?.q) httpParams = httpParams.set('search', params.q);
    return this.http.get<MessageSupport[]>(`${this.apiUrl}/admin/messages/`, { headers: this.getHeaders(), params: httpParams });
  }

  getMessageDetail(id: number): Observable<MessageSupport> {
    return this.http.get<MessageSupport>(`${this.apiUrl}/admin/messages/${id}/`, { headers: this.getHeaders() });
  }

  getMessageStats(): Observable<MessageSupportStats> {
    return this.http.get<MessageSupportStats>(`${this.apiUrl}/admin/messages/stats/`, { headers: this.getHeaders() });
  }

  messageAction(id: number, action: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/messages/${id}/action/`, { action }, { headers: this.getHeaders() });
  }

  deleteMessage(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/messages/${id}/action/`, { headers: this.getHeaders() });
  }
}
