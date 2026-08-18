export interface ReclamationClient {
  id: number;
  nom: string;
  prenom: string;
  nom_complet: string;
  email: string;
  telephone?: string;
  photo?: string | null;
  adresse?: string;
}

export interface ReclamationFournisseur {
  id: number;
  nom: string;
  prenom: string;
  nom_complet: string;
  email: string;
  telephone?: string;
  photo?: string | null;
  nom_entreprise?: string;
  siret?: string;
}

export interface ReclamationProduit {
  id: number;
  nom: string;
  reference?: string;
  reference_oem?: string;
  image?: string | null;
  prix?: number;
}

export interface ReclamationCommande {
  id: number;
  reference: string;
  date_commande: string;
  statut: string;
  montant_total: number;
}

export interface ReclamationAuteur {
  type: 'client' | 'fournisseur' | 'admin' | 'systeme';
  nom: string;
  photo?: string | null;
  role: string;
}

export interface PieceJointe {
  id: number;
  fichier_url: string;
  type: 'photo' | 'pdf' | 'facture' | 'capture' | 'autre';
  nom: string;
  date: string;
}

export interface MessageReclamation {
  id: number;
  auteur_type: string;
  auteur_nom: string;
  auteur_photo?: string | null;
  auteur_role: string;
  contenu: string;
  est_note_interne: boolean;
  est_visible_client: boolean;
  est_visible_fournisseur: boolean;
  lu_par_client: boolean;
  lu_par_fournisseur: boolean;
  pieces_jointes: PieceJointe[];
  date: string;
}

export interface HistoriqueReclamation {
  id: number;
  action: string;
  statut?: string;
  priorite?: string;
  auteur_nom: string;
  auteur_type: string;
  commentaire?: string;
  date: string;
}

export interface Reclamation {
  id: number;
  numero_dossier: string;
  objet: string;
  motif: string;
  motif_label: string;
  description: string;
  statut: 'nouveau' | 'en_cours_analyse' | 'en_attente_infos' | 'resolu' | 'rejete' | 'ferme';
  statut_label: string;
  priorite: 'faible' | 'normale' | 'elevee' | 'urgente';
  priorite_label: string;
  est_litige: boolean;
  reponse_admin: string;
  note_interne: string;
  raison_rejet: string;
  photos: string[];
  documents: string[];
  date_soumission: string;
  date_ouverture?: string | null;
  date_resolution?: string | null;
  date_cloture?: string | null;
  date_derniere_maj: string;
  client?: ReclamationClient | null;
  fournisseur?: ReclamationFournisseur | null;
  produit?: ReclamationProduit | null;
  commande?: ReclamationCommande | null;
  assigne_a?: { id: number; nom_complet: string; email: string } | null;
  messages?: MessageReclamation[];
  historique?: HistoriqueReclamation[];
  pieces_jointes?: PieceJointe[];
  client_nom?: string;
  client_prenom?: string;
  client_photo?: string | null;
  fournisseur_nom?: string;
  produit_nom?: string;
  produit_image?: string | null;
  commande_reference?: string;
  messages_non_lus?: number;
}

export interface ReclamationFilters {
  statut?: string;
  priorite?: string;
  motif?: string;
  q?: string;
  fournisseur?: string;
  client?: string;
  litige?: string;
  periode?: 'tous' | 'today' | 'week' | 'month';
  ordering?: string;
}

export interface ReclamationActionPayload {
  action: 'change_statut' | 'change_priorite' | 'assigner' | 'note_interne' | 'demande_infos' | 'ouvrir' | 'marquer_litige' | 'reponse_admin';
  statut?: string;
  priorite?: string;
  assigne_a?: number;
  note_interne?: string;
  message?: string;
  raison_rejet?: string;
  reponse_admin?: string;
  est_litige?: boolean;
}

export interface MessagePayload {
  contenu: string;
  est_note_interne?: boolean;
  est_visible_client?: boolean;
  est_visible_fournisseur?: boolean;
  pieces_jointes?: File[];
}

export interface ReclamationStats {
  total: number;
  ouverts: number;
  litiges_ouverts: number;
  resolus: number;
  rejetes: number;
  temps_moyen_resolution_heures: number;
  taux_resolution: number;
  par_motif: { motif: string; count: number }[];
  par_statut: { statut: string; count: number }[];
  par_priorite: { priorite: string; count: number }[];
}

export interface StatutConfig {
  label: string;
  color: string;
  icon: string;
  description: string;
}

export interface PrioriteConfig {
  label: string;
  color: string;
  icon: string;
}
