import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Produit } from '../models/produit.model';

@Injectable({
  providedIn: 'root'
})
export class ProduitService {

  private apiUrl = "http://127.0.0.1:8000/account/produits/";

  constructor(private http: HttpClient) {}

  getProduits(): Observable<Produit[]> {
    return this.http.get<Produit[]>(this.apiUrl);
  }

  getProduit(id: number): Observable<Produit> {
    return this.http.get<Produit>(`${this.apiUrl}${id}/`);
  }
}