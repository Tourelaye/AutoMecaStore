export interface Produit {
  id: number;
  nom: string;
  description: string;
  categorie: string;
  prix: number;
  stock: number;
  reference: string;
  marque: string;
  statut: string;
  dateAjout: string;
  image?: string;
}
