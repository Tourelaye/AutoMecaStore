import { LigneCommande } from './ligneCommande.model';

export interface Commande {
  id: number;
  reference: string;
  date_commande: string;
  statut: string;
  montant_total: number;
  client: number;
  lignes?: LigneCommande[];
}