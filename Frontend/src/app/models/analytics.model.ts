export interface Kpis {
  chiffre_affaires_jour: number;
  chiffre_affaires_mois: number;
  chiffre_affaires_annee: number;
  chiffre_affaires_total: number;
  chiffre_affaires_precedent: number;
  total_commandes: number;
  commandes_terminees: number;
  commandes_annulees: number;
  total_clients: number;
  total_fournisseurs: number;
  total_produits: number;
  taux_satisfaction: number;
  panier_moyen: number;
  taux_annulation: number;
}

export interface EvolutionPoint {
  label: string;
  ca: number;
  ventes: number;
  commandes: number;
  clients_nouveaux: number;
  magasins_nouveaux: number;
  produits_nouveaux: number;
}

export interface ProduitTop {
  id: number;
  nom: string;
  quantite?: number;
  ca?: number;
  prix: number;
  nombre_vues?: number;
  stock?: number;
}

export interface MagasinTop {
  id: number;
  nom: string;
  ca: number;
  commandes: number;
  ventes: number;
  jours_vente: number;
  note_moyenne: number;
  principal?: number;
  motif?: string;
}

export interface ClientTop {
  id: number;
  nom: string;
  ca: number;
  commandes: number;
  panier_moyen: number;
  user__nom?: string;
  user__prenom?: string;
  user__email?: string;
  date_inscription?: string;
}

export interface GeoVille {
  ville: string;
  commandes?: number;
  ca?: number;
  total?: number;
  clients?: number;
}

export interface AlerteAnalytics {
  type: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

export interface AnalyticsData {
  periode: string;
  periode_label: string;
  debut: string;
  fin: string;
  kpis: Kpis;
  evolutions: EvolutionPoint[];
  produits: {
    top_10_vendus: ProduitTop[];
    top_10_vus: ProduitTop[];
    produits_moins_vendus: ProduitTop[];
    produits_rupture: ProduitTop[];
    top_10_revenus: ProduitTop[];
  };
  magasins: {
    top_ca: MagasinTop[];
    top_commandes: MagasinTop[];
    top_satisfaction: MagasinTop[];
    plus_actifs: MagasinTop[];
    attention: MagasinTop[];
  };
  clients: {
    nouveaux: ClientTop[];
    fideles: ClientTop[];
    inactifs: ClientTop[];
    frequence_achat_jours: number;
    panier_moyen_par_client: number;
  };
  geographie: {
    commandes_par_ville: GeoVille[];
    magasins_par_ville: GeoVille[];
    clients_par_ville: GeoVille[];
  };
  alertes: AlerteAnalytics[];
}

export interface FilterOptions {
  magasins: { id: number; nom: string }[];
  categories: { id: number; nom: string }[];
  villes: string[];
}

export interface AnalyticsFilters {
  period?: 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
  start?: string;
  end?: string;
  magasin_id?: number | null;
  categorie_id?: number | null;
  ville?: string | null;
}
