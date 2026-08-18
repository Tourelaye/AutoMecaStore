export interface Marque {
  id: number;
  nom: string;
  description?: string;
  logo?: File | null;
  logo_url?: string;
  est_visible: boolean;
  ordre: number;
  datecreation: string;
  datemodification: string;
  nombre_produits?: number;
}
