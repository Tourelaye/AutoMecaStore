export interface ClientCommande {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
}

export interface MagasinCommande {
  id?: number;
  nom: string;
  fournisseur: string;
  telephone?: string;
  email?: string;
  adresse_complete?: string;
}

export interface ProduitLigne {
  id: number;
  nom: string;
  image?: string | null;
}

export interface LigneCommande {
  id: number;
  produit?: ProduitLigne;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
  magasin?: MagasinCommande;
}

export interface HistoriqueCommande {
  id: number;
  statut?: string;
  statut_label?: string;
  commentaire?: string;
  motif?: string;
  utilisateur: string;
  date: string;
}

export interface LivraisonCommande {
  id?: number;
  statut: string;
  date_livraison?: string;
  frais_livraison?: number;
  remarque?: string;
  livreur?: string;
}

export interface ReclamationCommande {
  id: number;
  objet: string;
  statut: string;
  date: string;
}

export interface AlerteCommande {
  id?: string;
  type: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  commande_id?: number;
  reference?: string;
  client?: string;
}

export interface AdminCommande {
  id: number;
  reference: string;
  date_commande: string;
  statut: string;
  montant_total: number;
  frais_livraison: number;
  mode_paiement: string;
  mode_reception: string;
  client?: ClientCommande;
  magasins: string[];
  nombre_produits: number;
  alertes: AlerteCommande[];
}

export interface AdminCommandeDetail extends AdminCommande {
  commentaire_fournisseur?: string;
  lignes: LigneCommande[];
  historique: HistoriqueCommande[];
  livraison?: LivraisonCommande;
  reclamations: ReclamationCommande[];
}

export interface StatistiquesCommande {
  total: number;
  aujourdhui: number;
  terminees: number;
  annulees: number;
  en_preparation: number;
  montant_total: number;
  panier_moyen: number;
  temps_moyen_heures: number;
  montant_jour: number;
  montant_semaine: number;
  montant_mois: number;
}

export interface ActionCommandePayload {
  action: 'note' | 'intervention' | 'contact_fournisseur' | 'contact_client' | 'exception_status';
  message?: string;
  statut?: string;
  motif?: string;
}

export interface FiltresCommande {
  q?: string;
  statut?: string;
  periode?: 'today' | 'week' | 'month' | 'livrees' | 'preparation' | 'annulees';
  mode_paiement?: string;
  mode_reception?: string;
  magasin?: string;
  client?: string;
}
