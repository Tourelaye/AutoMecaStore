export interface Commande {
  id: string;
  client: {
    nom: string;
    email: string;
    telephone: string;
    adresse: string;
  };
  date: string;
  montant: number;
  statut: string;
  produits: {
    nom: string;
    quantite: number;
    prix: number;
  }[];
  livraison: {
    methode: string;
    adresse: string;
    dateEstimee: string;
  };
}
