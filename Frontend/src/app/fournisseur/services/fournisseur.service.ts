import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Fournisseur } from '../interfaces/fournisseur.interface';

@Injectable({
  providedIn: 'root'
})
export class FournisseurService {
  private apiUrl = 'http://127.0.0.1:8000/api/fournisseur';

  constructor(private http: HttpClient) {}

  getProfile(): Observable<Fournisseur> {
    return this.http.get<Fournisseur>(`${this.apiUrl}/profile`);
  }

  updateProfile(data: Partial<Fournisseur>): Observable<Fournisseur> {
    return this.http.patch<Fournisseur>(`${this.apiUrl}/profile`, data);
  }

  getStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statistics`);
  }
}
