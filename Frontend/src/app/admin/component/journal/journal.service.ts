import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type LogCategory = 'securite' | 'finances' | 'vendeurs' | 'produits' | 'categories' | 'systeme';

export interface LogEntry {
  id: number;
  utilisateur: number | null;
  utilisateur_nom: string;
  categorie: LogCategory;
  categorie_label: string;
  action: string;
  action_label: string;
  description: string;
  ip_address: string | null;
  date_creation: string;
}

@Injectable({ providedIn: 'root' })
export class JournalService {
  private apiUrl = 'http://127.0.0.1:8000/api/admin/journal/';

  constructor(private http: HttpClient) {}

  getAll(): Observable<LogEntry[]> {
    return this.http.get<{ activities: any[]; total: number }>(this.apiUrl).pipe(
      map(res => res.activities.map((a, i) => this.mapActivityToLogEntry(a, i)))
    );
  }

  clear(): Observable<any> {
    return this.http.delete(this.apiUrl);
  }

  private mapActivityToLogEntry(a: any, index: number): LogEntry {
    const category = this.inferCategory(a.type);
    return {
      id: a.id ? this.hashString(a.id.toString()) : index,
      utilisateur: null,
      utilisateur_nom: a.user || 'Système',
      categorie: category,
      categorie_label: this.categoryLabel(category),
      action: a.type || 'info',
      action_label: a.titre || 'Activité',
      description: a.detail || '',
      ip_address: null,
      date_creation: a.date ? new Date(a.date).toLocaleString('fr-FR') : ''
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private inferCategory(type: string): LogCategory {
    switch (type) {
      case 'nouveau_client': return 'securite';
      case 'nouveau_produit': return 'produits';
      case 'nouvelle_commande': return 'finances';
      case 'nouveau_fournisseur': return 'vendeurs';
      case 'categorie_creee': return 'categories';
      default: return 'systeme';
    }
  }

  private categoryLabel(category: LogCategory): string {
    const labels: Record<LogCategory, string> = {
      securite: 'Sécurité',
      finances: 'Finances',
      vendeurs: 'Vendeurs',
      produits: 'Produits',
      categories: 'Catégories',
      systeme: 'Système'
    };
    return labels[category];
  }
}