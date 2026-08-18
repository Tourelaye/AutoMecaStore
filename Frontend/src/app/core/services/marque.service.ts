import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Marque } from '../../models/marque.model';

@Injectable({
  providedIn: 'root'
})
export class MarqueService {

  private apiUrl = 'http://127.0.0.1:8000/api/marques/';

  constructor(private http: HttpClient) { }

  getMarques(): Observable<Marque[]> {
    return this.http.get<Marque[]>(this.apiUrl);
  }

  getMarque(id: number): Observable<Marque> {
    return this.http.get<Marque>(`${this.apiUrl}${id}/`);
  }

  createMarque(marque: FormData | Partial<Marque>): Observable<Marque> {
    return this.http.post<Marque>(this.apiUrl, marque);
  }

  updateMarque(id: number, marque: FormData | Partial<Marque>): Observable<Marque> {
    return this.http.put<Marque>(`${this.apiUrl}${id}/`, marque);
  }

  deleteMarque(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }

  reorderMarques(items: { id: number; ordre: number }[]): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>('http://127.0.0.1:8000/api/admin/marques/reorder/', { items });
  }
}
