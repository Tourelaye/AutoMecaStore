import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Reclamation,
  ReclamationFilters,
  ReclamationStats,
  ReclamationActionPayload,
  MessagePayload,
  MessageReclamation,
  PieceJointe,
  HistoriqueReclamation
} from '../../models/reclamation.model';

@Injectable({
  providedIn: 'root'
})
export class ReclamationService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api/admin/reclamations';

  constructor(private http: HttpClient) {}

  getReclamations(filters: ReclamationFilters = {}): Observable<Reclamation[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'tous') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Reclamation[]>(`${this.baseUrl}/`, { params });
  }

  getStats(): Observable<ReclamationStats> {
    return this.http.get<ReclamationStats>(`${this.baseUrl}/stats/`);
  }

  getReclamation(id: number): Observable<Reclamation> {
    return this.http.get<Reclamation>(`${this.baseUrl}/${id}/`);
  }

  action(id: number, payload: ReclamationActionPayload): Observable<{ message: string; reclamation: Reclamation }> {
    return this.http.patch<{ message: string; reclamation: Reclamation }>(`${this.baseUrl}/${id}/action/`, payload);
  }

  getMessages(id: number): Observable<MessageReclamation[]> {
    return this.http.get<MessageReclamation[]>(`${this.baseUrl}/${id}/messages/`);
  }

  sendMessage(id: number, payload: MessagePayload): Observable<{ message: string; message_obj: MessageReclamation }> {
    const formData = new FormData();
    formData.append('contenu', payload.contenu);
    if (payload.est_note_interne) formData.append('est_note_interne', 'true');
    if (payload.est_visible_client !== undefined) formData.append('est_visible_client', String(payload.est_visible_client));
    if (payload.est_visible_fournisseur !== undefined) formData.append('est_visible_fournisseur', String(payload.est_visible_fournisseur));
    if (payload.pieces_jointes) {
      payload.pieces_jointes.forEach(f => formData.append('pieces_jointes', f, f.name));
    }
    return this.http.post<{ message: string; message_obj: MessageReclamation }>(`${this.baseUrl}/${id}/messages/`, formData);
  }

  getHistorique(id: number): Observable<HistoriqueReclamation[]> {
    return this.http.get<HistoriqueReclamation[]>(`${this.baseUrl}/${id}/historique/`);
  }

  uploadAttachment(id: number, fichier: File, type: string = 'autre'): Observable<{ piece_jointe: PieceJointe }> {
    const formData = new FormData();
    formData.append('fichier', fichier, fichier.name);
    formData.append('type', type);
    return this.http.post<{ piece_jointe: PieceJointe }>(`${this.baseUrl}/${id}/attachments/`, formData);
  }
}
