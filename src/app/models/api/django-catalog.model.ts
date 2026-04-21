export interface DjangoCategorieDto {
  id: number;
  nom: string;
  description?: string;
  etat?: boolean | string;
}

export interface DjangoProduitDto {
  id: number;
  nom: string;
  description: string;
  prix: number | string;
  stock: number;
  image?: string | null;
  categorie?: number | DjangoCategorieDto | null;
  gestionnaire_stock?: number | null;
  est_en_promo?: boolean;
  prix_promo?: number | string | null;
  date_fin_promo?: string | null;
  reference?: string | null;
  marque?: string | null;
}

