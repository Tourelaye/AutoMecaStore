export interface Categorie{
    id: number;
    nom: string;
    description: string;
    datecreation: string;
    datemodification: string;
    etat: string;
    categorieid: number | null;
    ordre: number;
    icone?: string;
    nombre_produits?: number;
}