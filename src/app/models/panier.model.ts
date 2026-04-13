import { Produit } from './produit.model';

export interface PanierItem {
  id: number;
  panier: number;        
  produit: Produit;     
  quantite: number;
  /** Favori côté UI (persisté avec le panier) */
  favori?: boolean;
}

export interface Panier {
  id: number;
  nom_panier: string;
  client: number | null;
  invite: number | null;
  items: PanierItem[];
}