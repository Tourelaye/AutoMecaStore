export interface UtilisateurMetadonnees {
  point_fidelite?: number;
  nombre_commandes?: number;
  nom_entreprise?: string;
  nombre_produits?: number;
  nombre_ventes?: number;
  chiffre_affaires?: number;
  note_moyenne?: number;
}

export interface UtilisateurProfil {
  point_fidelite?: number;
  mode_paiement_favoris?: string;
  note_livreur?: number;
  nom_entreprise?: string;
  siret?: string;
  description?: string;
  statut_fournisseur?: string;
  date_validation?: string;
  raison_refus?: string;
  note_moyenne?: number;
  nombre_avis?: number;
  nombre_produits?: number;
  nombre_ventes?: number;
  chiffre_affaires?: number;
  magasin?: {
    nom_magasin?: string;
    ville?: string;
    adresse_complete?: string;
  };
  date_embauche?: string;
}

export interface AdminUtilisateur {
  id: number;
  nom: string;
  prenom: string;
  nom_complet: string;
  email: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  role: 'client' | 'fournisseur' | 'admin';
  role_label: string;
  role_icon: string;
  role_color: string;
  photo?: string | null;
  date_inscription: string;
  derniere_connexion?: string | null;
  statut: 'actif' | 'attente' | 'suspendu' | 'desactive';
  statut_label: string;
  statut_color: string;
  metadonnees: UtilisateurMetadonnees;
}

export interface UtilisateurStats {
  total: number;
  clients: number;
  fournisseurs: number;
  administrateurs: number;
  nouveaux_mois: number;
  actifs_aujourdhui: number;
}

export interface UtilisateurStatistiques {
  nombre_commandes?: number;
  montant_total_achats?: number;
  panier_moyen?: number;
  nombre_produits?: number;
  nombre_ventes?: number;
  chiffre_affaires?: number;
  note_moyenne?: number;
}

export interface UtilisateurDetail extends AdminUtilisateur {
  profil?: UtilisateurProfil;
  historique_connexions?: SecurityActivity[];
  historique_commandes?: CommandeMini[];
  produits?: ProduitMini[];
  statistiques?: UtilisateurStatistiques;
  historique_actions?: ActionLog[];
  securite?: SecuriteUtilisateur;
}

export interface CommandeMini {
  id: number;
  reference: string;
  date_commande: string;
  statut: string;
  montant_total: number;
}

export interface ProduitMini {
  id: number;
  nom: string;
  reference_oem?: string;
  prix?: number;
  stock?: number;
  image?: string | null;
  etat?: string;
}

export interface SecurityActivity {
  id: number;
  action: string;
  ip_address?: string;
  status: 'success' | 'failure' | 'info' | 'warning';
  metadata: any;
  timestamp: string;
}

export interface ActionLog {
  id: number;
  type: string;
  action: string;
  detail?: string;
  utilisateur?: string;
  date: string;
}

export interface SecuriteUtilisateur {
  derniere_connexion?: string | null;
  echecs_connexion: number;
  compte_verrouille: boolean;
  two_factor_enabled: boolean;
  sessions_actives?: number | null;
}

export interface UtilisateurFilters {
  role?: 'tous' | 'client' | 'fournisseur' | 'admin';
  statut?: 'tous' | 'actif' | 'attente' | 'suspendu' | 'desactive';
  q?: string;
  periode?: 'tous' | 'today' | 'week' | 'month';
  ordering?: string;
}

export interface ActionPayload {
  action: string;
  sujet?: string;
  message?: string;
  motif?: string;
  new_password?: string;
}

export interface NotificationGroupePayload {
  cible: 'tous' | 'clients' | 'fournisseurs' | 'administrateurs';
  sujet: string;
  message: string;
}
