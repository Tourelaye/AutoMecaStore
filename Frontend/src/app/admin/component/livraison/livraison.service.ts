import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

export interface AdresseLivraisonUi {
  nom_destinataire?: string;
  telephone?: string;
  ville?: string;
  quartier?: string;
  adresse?: string;
  point_de_repere?: string;
  instructions?: string;
}

export interface Livraison {
  id: number;
  commande?: { id?: number; reference?: string };
  client?: { id?: number; nom?: string; prenom?: string; email?: string };
  magasin?: { id?: number; nom_magasin?: string };
  fournisseur?: { id?: number; nom_entreprise?: string };
  partenaire?: { id?: number; nom?: string };
  adresse?: AdresseLivraisonUi;
  statut: string;
  responsable_type?: string;
  responsable_nom?: string | null;
  mode_tarif?: string;
  frais_livraison?: number;
  delai_estime?: string;
  date_creation?: string;
  date_attribution?: string;
  date_livraison?: string;
  instructions?: string;
}

@Injectable({ providedIn: 'root' })
export class LivraisonService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api';

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

  // --- Admin ---
  getAdminLivraisons(): Observable<Livraison[]> {
    return this.http.get<Livraison[]>(`${this.baseUrl}/admin/livraisons/`, { headers: this.getHeaders() });
  }

  updateAdminStatut(id: number, statut: string): Observable<Livraison> {
    return this.http.patch<Livraison>(`${this.baseUrl}/admin/livraisons/${id}/statut/`, { statut }, { headers: this.getHeaders() });
  }

  // --- Fournisseur ---
  getFournisseurLivraisons(): Observable<Livraison[]> {
    return this.http.get<Livraison[]>(`${this.baseUrl}/fournisseur/livraisons/`, { headers: this.getHeaders() });
  }

  prendreEnCharge(id: number): Observable<Livraison> {
    return this.http.patch<Livraison>(`${this.baseUrl}/fournisseur/livraisons/${id}/prendre-en-charge/`, {}, { headers: this.getHeaders() });
  }

  updateFournisseurStatut(id: number, statut: string): Observable<Livraison> {
    return this.http.patch<Livraison>(`${this.baseUrl}/fournisseur/livraisons/${id}/statut/`, { statut }, { headers: this.getHeaders() });
  }

  getStatutLabel(statut: string | undefined): string {
    const labels: Record<string, string> = {
      'en_attente_attribution': 'En attente d\'attribution',
      'livraison_attribuee': 'Livraison attribuée',
      'en_preparation': 'En préparation',
      'prise_en_charge': 'Prise en charge',
      'en_cours_livraison': 'En cours de livraison',
      'livree': 'Livrée',
      'echec_livraison': 'Échec de livraison',
      'annulee': 'Annulée'
    };
    return labels[statut || ''] || statut || '—';
  }
}