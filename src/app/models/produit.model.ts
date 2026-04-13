export interface Produit {
  id: number;
  nom: string;
  description: string;
  prix: number;
  stock: number;
  image: string | null;
  categorie:number | any;
  gestionnaire_stock: number | any;
  /** Référence catalogue / EAN (optionnel) */
  reference?: string | null;
  quantite?: number; 
}

export interface ProduitFavoris{
  id: number;
  client: number;
  produit: number;
  date_ajout: string;
}