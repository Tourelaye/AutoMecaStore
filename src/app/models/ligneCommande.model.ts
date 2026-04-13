import { Produit } from './produit.model';

export interface LigneCommande {
  id: number;
  commande: number;
  produit: Produit;        
  produit_id?: number;     
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
}