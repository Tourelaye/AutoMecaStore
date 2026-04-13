import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Commande } from '../models/commande.model';

@Injectable({
  providedIn: 'root'
})
export class CommandeService {

  private apiUrl = 'http://127.0.0.1:8000/account/commandes/';

  constructor(private http: HttpClient) { }

  // 📌 Récupérer toutes les commandes
  getCommandes(): Observable<Commande[]> {
    return this.http.get<Commande[]>(this.apiUrl);
  }

  // 📌 Récupérer une commande
  getCommande(id: number): Observable<Commande> {
    return this.http.get<Commande>(`${this.apiUrl}${id}/`);
  }

  // 📌 Créer une commande
  createCommande(data: any): Observable<Commande> {
    return this.http.post<Commande>(this.apiUrl, data);
  }

}