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
  stock?: number;
  sous_total?: number;
  image?: string;
  favori?: boolean;
  fournisseur_id?: number;
  fournisseur_nom?: string;
  magasin_id?: number;
  magasin_nom?: string;
  magasin?: any;
  mode_reception?: 'livraison' | 'retrait_magasin';
  adresse_livraison?: string;
  telephone_client?: string;
}