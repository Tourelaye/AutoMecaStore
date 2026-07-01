import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Commande } from '../interfaces/commande.interface';

@Injectable({
  providedIn: 'root'
})
export class CommandeService {
  private apiUrl = 'http://127.0.0.1:8000/api/fournisseur/commandes';

  constructor(private http: HttpClient) {}

  getCommandes(): Observable<Commande[]> {
    return this.http.get<Commande[]>(this.apiUrl);
  }

  getCommande(id: string): Observable<Commande> {
    return this.http.get<Commande>(`${this.apiUrl}/${id}`);
  }

  updateCommandeStatut(id: string, statut: string): Observable<Commande> {
    return this.http.patch<Commande>(`${this.apiUrl}/${id}`, { statut });
  }
}
