import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface CategorySales {
  name: string;
  qty: number;
  pct: number;
  color: 'violet' | 'blue' | 'green' | 'amber' | 'muted';
}

export interface MonthPoint {
  label: string;
  value: number;
}

export interface TopFournisseur {
  rank: number;
  name: string;
  vendor: string;
  orders: number;
  revenue: number;
  rating: number;
  reviews: number;
}

export interface TopProduit {
  rank: number;
  name: string;
  ref: string;
  category: string;
  sales: number;
  price: number;
}

export interface DashboardStats {
  caCumule: number;
  commissions: number;
  fournisseursTotal: number;
  fournisseursActifs: number;
  fournisseursAttente: number;
  clientsTotal: number;
  produitsTotal: number;
  produitsActifs: number;
  attenteValidation: number;
  commandesJour: number;
  commandesMois: number;
  reclamationsActives: number;
  rupturesStock: number;
  produitsSignales: number;
  fournisseursSuspendus: number;
  commissionRate: string;
  evolutionPct: number;
  categories: CategorySales[];
  chart: MonthPoint[];
  topFournisseurs: TopFournisseur[];
  topProduits: TopProduit[];
}

// Données de démonstration reprenant tes valeurs actuelles.
// A remplacer dès que l'endpoint Django est prêt (voir getStats()).
const MOCK_STATS: DashboardStats = {
  caCumule: 846.80,
  commissions: 84.68,
  fournisseursTotal: 5,
  fournisseursActifs: 3,
  fournisseursAttente: 1,
  clientsTotal: 34,
  produitsTotal: 11,
  produitsActifs: 8,
  attenteValidation: 2,
  commandesJour: 3,
  commandesMois: 7,
  reclamationsActives: 1,
  rupturesStock: 1,
  produitsSignales: 1,
  fournisseursSuspendus: 1,
  commissionRate: '10% standard',
  evolutionPct: 15.4,
  categories: [
    { name: 'Freinage', qty: 980, pct: 35, color: 'violet' },
    { name: 'Moteur', qty: 1420, pct: 28, color: 'blue' },
    { name: 'Suspension', qty: 650, pct: 18, color: 'green' },
    { name: 'Transmission', qty: 540, pct: 11, color: 'amber' },
    { name: 'Autre', qty: 1120, pct: 8, color: 'muted' }
  ],
  chart: [
    { label: 'Jan', value: 52000 },
    { label: 'Fév', value: 61000 },
    { label: 'Mar', value: 78000 },
    { label: 'Avr', value: 68000 },
    { label: 'Mai', value: 92000 },
    { label: 'Juin', value: 88000 },
    { label: 'Juil', value: 8468 }
  ],
  topFournisseurs: [
    { rank: 1, name: 'MecaPart SAS', vendor: 'Jean-Pierre Meca', orders: 842, revenue: 145890, rating: 4.8, reviews: 345 },
    { rank: 2, name: 'DistriAuto France', vendor: 'Sylvie Marchand', orders: 512, revenue: 92450, rating: 4.6, reviews: 218 },
    { rank: 3, name: 'Direct Pièces Discount', vendor: 'Alain Robert', orders: 290, revenue: 41200, rating: 4.2, reviews: 154 },
    { rank: 4, name: 'CarHacker Paris', vendor: 'Marc Lefevre', orders: 98, revenue: 18450, rating: 3.5, reviews: 64 },
    { rank: 5, name: 'ElectroMeca Europe', vendor: 'Dimitri Dupuis', orders: 0, revenue: 0, rating: 0, reviews: 0 }
  ],
  topProduits: [
    { rank: 1, name: 'Filtre à Huile Purflux Premium', ref: 'PUR-LS350', category: 'Moteur', sales: 310, price: 9.80 },
    { rank: 2, name: 'Pneu Michelin Primacy 4 205/55 R16 91V', ref: 'MIC-352870', category: 'Pneumatiques', sales: 164, price: 79.50 },
    { rank: 3, name: 'Plaquettes de Frein Céramique Bosch Ceramic', ref: 'BOS-0986494663', category: 'Freinage', sales: 120, price: 42.00 },
    { rank: 4, name: 'Disques de Frein Ventilés Brembo (La Paire)', ref: 'BRE-09B35511', category: 'Freinage', sales: 88, price: 84.50 },
    { rank: 5, name: 'Batterie Varta Silver Dynamic E38 12V 74Ah', ref: 'VAR-574402075', category: 'Électricité', sales: 54, price: 129.00 }
  ]
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = '/api/admin/dashboard-stats/'; // adapte à ta route DRF réelle

  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.apiUrl).pipe(
      catchError(() => of(MOCK_STATS)) // fallback tant que l'endpoint n'est pas branché
    );
  }
}