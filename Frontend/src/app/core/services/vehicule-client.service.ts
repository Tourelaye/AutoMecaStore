import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VehiculeClient } from '../../models/vehicule-client.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class VehiculeClientService {
  private apiUrl = 'http://127.0.0.1:8000/api/account/vehicules';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getVehicules(): Observable<VehiculeClient[]> {
    return this.http.get<VehiculeClient[]>(`${this.apiUrl}/`, { headers: this.getHeaders() });
  }

  createVehicule(v: VehiculeClient): Observable<VehiculeClient> {
    return this.http.post<VehiculeClient>(`${this.apiUrl}/`, v, { headers: this.getHeaders() });
  }

  updateVehicule(id: number, v: Partial<VehiculeClient>): Observable<VehiculeClient> {
    return this.http.patch<VehiculeClient>(`${this.apiUrl}/${id}/`, v, { headers: this.getHeaders() });
  }

  deleteVehicule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`, { headers: this.getHeaders() });
  }

  setActif(id: number): Observable<VehiculeClient> {
    return this.updateVehicule(id, { actif: true });
  }

  getVehiculeActif(vehicules: VehiculeClient[]): VehiculeClient | undefined {
    return vehicules.find(v => v.actif) || vehicules[0];
  }
}
