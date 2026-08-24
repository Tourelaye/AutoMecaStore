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
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(res => (res || []).map((a, i) => this.mapEntry(a, i)))
    );
  }

  clear(): Observable<any> {
    return this.http.delete(this.apiUrl);
  }

  private mapEntry(a: any, index: number): LogEntry {
    const category = this.inferCategory((a.content_type || '').toLowerCase());
    const actionLabel = this.actionFlagLabel(a.action_flag);
    return {
      id: a.id ?? index,
      utilisateur: null,
      utilisateur_nom: a.user || 'Système',
      categorie: category,
      categorie_label: this.categoryLabel(category),
      action: String(a.action_flag ?? ''),
      action_label: a.content_type ? `${actionLabel} — ${a.content_type}` : actionLabel,
      description: a.object_repr || '',
      ip_address: null,
      date_creation: a.action_time || ''
    };
  }

  private actionFlagLabel(flag: number): string {
    switch (flag) {
      case 1: return 'Création';
      case 2: return 'Modification';
      case 3: return 'Suppression';
      default: return 'Activité';
    }
  }

  private inferCategory(contentType: string): LogCategory {
    if (contentType.includes('produit') || contentType.includes('stock')) return 'produits';
    if (contentType.includes('catégorie') || contentType.includes('categorie') || contentType.includes('marque')) return 'categories';
    if (contentType.includes('commande') || contentType.includes('paiement') || contentType.includes('facture')) return 'finances';
    if (contentType.includes('fournisseur') || contentType.includes('magasin')) return 'vendeurs';
    if (contentType.includes('utilisateur') || contentType.includes('user') || contentType.includes('client')) return 'securite';
    return 'systeme';
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