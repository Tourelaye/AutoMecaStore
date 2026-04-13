import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Categorie } from '../models/categorie.model';

@Injectable({
  providedIn: 'root'
})
export class CategorieService {

  private apiUrl = "http://127.0.0.1:8000/account/categories/";

  constructor(private http: HttpClient) { }

  getCategories(): Observable<Categorie[]> {
    return this.http.get<Categorie[]>(this.apiUrl);
  }

  getCategorie(id: number): Observable<Categorie> {
    return this.http.get<Categorie>(`${this.apiUrl}${id}/`);
  }
}