export interface Fournisseur {
  id: number;
  nomEntreprise: string;
  email: string;
  telephone: string;
  adresse: string;
  description: string;
  siret: string;
  dateCreation: string;
  logo?: string;
}
