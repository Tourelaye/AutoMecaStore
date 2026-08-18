export interface VehiculeClient {
  id?: number;
  marque: string;
  modele: string;
  annee: number;
  motorisation?: string;
  carburant?: string;
  version?: string;
  immatriculation?: string;
  actif: boolean;
  date_ajout?: string;
}

export interface CompatibiliteVehicule {
  statut: 'compatible' | 'non_compatible' | 'a_verifier';
  motif?: string;
}
