import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

export interface StockItem {
  id: number;
  nom: string;
  reference: string;
  stock: number;
  prix: number;
  statut: 'rupture' | 'faible' | 'ok';
  image: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private apiUrl = 'http://127.0.0.1:8000/api/fournisseur/stock';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getStocks(): Observable<StockItem[]> {
    return this.http.get<StockItem[]>(`${this.apiUrl}/`);
  }

  updateStock(id: number, stock: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/`, { stock });
  }
}