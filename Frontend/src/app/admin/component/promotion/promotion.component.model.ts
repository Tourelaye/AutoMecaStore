export type PromotionType = 'pourcentage' | 'montant';
export type PromotionStatut = 'active' | 'expiree' | 'desactivee';

export interface Promotion {
  id: number;
  nom: string;
  code: string;
  description?: string;
  reduction: number;
  type: PromotionType;
  dateDebut: string;
  dateFin: string;
  utilisations: number;
  limiteUtilisation?: number; // 0 ou undefined = illimité
  statut: PromotionStatut;
}

// Payload envoyé au backend Django (adapter les clés au serializer DRF si besoin)
export interface PromotionPayload {
  nom: string;
  code: string;
  description?: string;
  reduction: number;
  type: PromotionType;
  dateDebut: string;
  dateFin: string;
  limiteUtilisation?: number;
  statut: PromotionStatut;
}