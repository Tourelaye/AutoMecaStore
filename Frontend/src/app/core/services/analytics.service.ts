import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnalyticsData, AnalyticsFilters, FilterOptions } from '../../models/analytics.model';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api/admin/analytics';

  constructor(private http: HttpClient) {}

  getFilterOptions(): Observable<FilterOptions> {
    return this.http.get<FilterOptions>(`${this.baseUrl}/filters/`);
  }

  getAnalytics(filters: AnalyticsFilters): Observable<AnalyticsData> {
    let params = new HttpParams();
    if (filters.period) params = params.set('period', filters.period);
    if (filters.start) params = params.set('start', filters.start);
    if (filters.end) params = params.set('end', filters.end);
    if (filters.magasin_id) params = params.set('magasin_id', String(filters.magasin_id));
    if (filters.categorie_id) params = params.set('categorie_id', String(filters.categorie_id));
    if (filters.ville) params = params.set('ville', filters.ville);

    return this.http.get<AnalyticsData>(this.baseUrl, { params });
  }

  export(format: 'csv' | 'excel' | 'pdf', filters: AnalyticsFilters): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (filters.period) params = params.set('period', filters.period);
    if (filters.start) params = params.set('start', filters.start);
    if (filters.end) params = params.set('end', filters.end);
    if (filters.magasin_id) params = params.set('magasin_id', String(filters.magasin_id));
    if (filters.categorie_id) params = params.set('categorie_id', String(filters.categorie_id));
    if (filters.ville) params = params.set('ville', filters.ville);

    return this.http.get(`${this.baseUrl}/export/`, {
      params,
      responseType: 'blob'
    });
  }
}
