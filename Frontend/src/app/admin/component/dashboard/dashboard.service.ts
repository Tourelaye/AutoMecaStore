import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Kpi {
  key: string;
  value: number;
  variation: number;
  label: string;
  icon: string;
  currency?: boolean;
  alert?: boolean;
}

export interface EvolutionVente {
  mois: string;
  ca: number;
  ventes: number;
}

export interface EvolutionCommande {
  mois: string;
  commandes: number;
}

export interface EvolutionInscription {
  mois: string;
  inscriptions: number;
}

export interface CategorieStat {
  nom: string;
  ventes: number;
  ca: number;
  pct: number;
}

export interface RegionStat {
  region: string;
  ca: number;
  ventes: number;
  pct: number;
}

export interface ActiviteRecente {
  date: string;
  type: string;
  icon: string;
  texte: string;
  lien: string;
  id: number;
}

export interface Alerte {
  type: string;
  severity: 'warning' | 'error' | 'info' | 'success';
  message: string;
  lien: string;
  id: number;
}

export interface MagasinItem {
  id: number;
  nom: string;
  fournisseur: string;
  ville: string;
  region: string;
  logo: string | null;
  date: string;
  statut: string;
}

export interface ProduitItem {
  id: number;
  nom: string;
  categorie: string;
  prix: number;
  statut: string;
  image: string | null;
  date: string;
  fournisseur: string;
}

export interface CommandeItem {
  id: number;
  reference: string;
  client: string;
  statut: string;
  montant: number;
  date: string;
}

export interface UtilisateurItem {
  id: number;
  nom: string;
  email: string;
  role: string;
  date: string;
}

export interface AdminDashboardData {
  kpis: Kpi[];
  evolution_ventes: EvolutionVente[];
  evolution_commandes: EvolutionCommande[];
  evolution_inscriptions: EvolutionInscription[];
  repartition_categories: CategorieStat[];
  ventes_par_region: RegionStat[];
  top_categories: CategorieStat[];
  activites_recentes: ActiviteRecente[];
  alertes: Alerte[];
  derniers_magasins: MagasinItem[];
  derniers_produits: ProduitItem[];
  dernieres_commandes: CommandeItem[];
  derniers_utilisateurs: UtilisateurItem[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/admin/dashboard-stats/';

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<AdminDashboardData> {
    return this.http.get<AdminDashboardData>(this.apiUrl);
  }
}
