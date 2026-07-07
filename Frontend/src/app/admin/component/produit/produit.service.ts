import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export type ProduitState = 'en_ligne' | 'desactive' | 'attente_validation';

export interface Produit {
  ref: string;
  name: string;
  category: string;
  vendor: string;
  image: string | null;
  price: number;
  stock: number;
  sales: number;
  state: ProduitState;
  signale: boolean;
  signalReason?: string;
}

const LOW_STOCK_THRESHOLD = 5;

const MOCK_PRODUITS: Produit[] = [
  { ref: 'LUK-624324700', name: "Kit d'Embrayage Complet LUK RepSet Pro", category: 'Transmission', vendor: 'MecaPart SAS', image: null, price: 189.90, stock: 12, sales: 45, state: 'en_ligne', signale: false },
  { ref: 'BRE-09B35511', name: 'Disques de Frein Ventilés Brembo (La Paire)', category: 'Freinage', vendor: 'DistriAuto France', image: null, price: 84.50, stock: 25, sales: 88, state: 'en_ligne', signale: false },
  { ref: 'BOS-0986494663', name: 'Plaquettes de Frein Céramique Bosch Ceramic', category: 'Freinage', vendor: 'DistriAuto France', image: null, price: 42.00, stock: 0, sales: 120, state: 'en_ligne', signale: false },
  { ref: 'SAC-313472', name: 'Amortisseur Gaz Bi-Tube Sachs Super Touring', category: 'Suspension', vendor: 'Direct Pièces Discount', image: null, price: 69.90, stock: 8, sales: 29, state: 'en_ligne', signale: false },
  { ref: 'PUR-LS350', name: 'Filtre à Huile Purflux Premium', category: 'Moteur', vendor: 'MecaPart SAS', image: null, price: 9.80, stock: 150, sales: 310, state: 'en_ligne', signale: false },
  { ref: 'VAL-043274', name: 'Optique Phare Avant Gauche Halogène Valeo', category: 'Carrosserie', vendor: 'CarHacker Paris', image: null, price: 115.00, stock: 3, sales: 5, state: 'desactive', signale: false },
  { ref: 'VAR-574402075', name: 'Batterie Varta Silver Dynamic E38 12V 74Ah', category: 'Électricité', vendor: 'Direct Pièces Discount', image: null, price: 129.00, stock: 18, sales: 54, state: 'en_ligne', signale: false },
  { ref: 'MIC-352870', name: 'Pneu Michelin Primacy 4 205/55 R16 91V', category: 'Pneumatiques', vendor: 'DistriAuto France', image: null, price: 79.50, stock: 40, sales: 164, state: 'en_ligne', signale: false },
  { ref: 'BOS-0986048120', name: 'Alternateur Reconditionné Bosch 150A', category: 'Électricité', vendor: 'ElectroMeca Europe', image: null, price: 210.00, stock: 5, sales: 0, state: 'attente_validation', signale: false },
  { ref: 'GAR-753420', name: 'Turbocompresseur de Suralimentation Garrett', category: 'Moteur', vendor: 'MecaPart SAS', image: null, price: 590.00, stock: 2, sales: 0, state: 'attente_validation', signale: false },
  {
    ref: 'SKF-VKJC5212', name: "Cardan d'Arbre de Transmission Avant Droit", category: 'Transmission', vendor: 'Direct Pièces Discount', image: null, price: 95.00, stock: 4, sales: 14, state: 'en_ligne',
    signale: true, signalReason: 'Signalé par un client pour incompatibilité récurrente avec le code OEM spécifié.'
  }
];

@Injectable({ providedIn: 'root' })
export class ProduitService {
  // Même choix que pour Fournisseurs : pas d'appel HTTP tant que le backend
  // Django + l'auth ne sont pas fiabilisés. Voir fournisseur.service.ts pour
  // l'exemple de migration vers de vrais appels HttpClient.

  readonly lowStockThreshold = LOW_STOCK_THRESHOLD;
  private data: Produit[] = [...MOCK_PRODUITS];

  getAll(): Observable<Produit[]> {
    return of([...this.data]).pipe(delay(150));
  }

  private patch(ref: string, changes: Partial<Produit>): Observable<Produit> {
    this.data = this.data.map(p => (p.ref === ref ? { ...p, ...changes } : p));
    const updated = this.data.find(p => p.ref === ref)!;
    return of(updated).pipe(delay(120));
  }

  setState(ref: string, state: ProduitState): Observable<Produit> {
    return this.patch(ref, { state });
  }

  setSignal(ref: string, signale: boolean, reason?: string): Observable<Produit> {
    return this.patch(ref, { signale, signalReason: signale ? reason : undefined });
  }

  delete(ref: string): Observable<void> {
    this.data = this.data.filter(p => p.ref !== ref);
    return of(void 0).pipe(delay(120));
  }
}