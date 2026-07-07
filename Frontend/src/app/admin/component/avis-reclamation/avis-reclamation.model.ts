export type AvisType = 'avis' | 'reclamation';
export type AvisStatut = 'nouveau' | 'en_cours' | 'traite';

export interface Avis {
  id: number;
  client: string;
  email?: string;
  produit: string;
  note: number;
  commentaire: string;
  date: string;
  type: AvisType;
  statut: AvisStatut;
  reponse?: string;
  dateReponse?: string;
}

// Payload envoyé au backend Django (adapter les clés au serializer DRF si besoin,
// ex: client_nom, date_creation, etc.)
export interface AvisPayload {
  client: string;
  email?: string;
  produit?: string;
  note: number;
  commentaire: string;
  type: AvisType;
  statut: AvisStatut;
}