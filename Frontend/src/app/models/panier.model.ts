import { Produit } from './produit.model';

export interface Panier {
  id?: number;
  items: PanierItem[];
}

export interface PanierItem {
  id?: number;
  produit: Produit;
  nom: string;
  prix: number;
  quantite: number;
  image?: string;
  favori?: boolean;
}