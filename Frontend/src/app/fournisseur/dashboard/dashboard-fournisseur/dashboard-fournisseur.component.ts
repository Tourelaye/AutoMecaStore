import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Stats {
  totalProduits: number;
  produitsActifs: number;
  tauxActifs: number;
  ruptures: number;
  commandesMois: number;
  commandesEnAttente: number;
  produitsVendus: number;
  chiffreAffaires: number;
}

interface Commande {
  numero: string;
  client: string;
  produit: string;
  statut: 'Confirmée' | 'Expédiée' | 'Livrée' | 'En attente' | 'Annulée';
  prix: number;
}

interface VenteMois {
  mois: string;
  montant: number;
}

interface VenteJour {
  jour: string;
  montant: number;
  pct: number;
  actif: boolean;
}

interface TopProduit {
  nom: string;
  categorie: string;
  ventes: number;
  ca: number;
}

interface AlerteStock {
  nom: string;
  restants: number;
}

interface Activite {
  icon: string;
  iconClass: string;
  texte: string;
  temps: string;
}

interface SatisfactionRow {
  etoiles: number;
  pct: number;
}

@Component({
  selector: 'app-dashboard-fournisseur',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-fournisseur.component.html',
  styleUrls: ['./dashboard-fournisseur.component.css'],
})
export class DashboardFournisseurComponent implements OnInit {

  // ---- KPI Stats ----
  stats: Stats = {
    totalProduits: 8,
    produitsActifs: 7,
    tauxActifs: 88,
    ruptures: 1,
    commandesMois: 78,
    commandesEnAttente: 4,
    produitsVendus: 142,
    chiffreAffaires: 2280750,
  };

  // ---- Dernières commandes ----
  totalCommandes = 6;
  dernieresCommandes: Commande[] = [
    { numero: 'CMD-2026-0891', client: 'Moussa Diop (Garage Teranga)', produit: 'Jeu de 4 Plaquettes de frein avant', statut: 'Confirmée', prix: 90000 },
    { numero: 'CMD-2026-0890', client: 'Saliou Fall', produit: 'Pneu Michelin Primacy 4 205/55 R16', statut: 'Confirmée', prix: 272000 },
    { numero: 'CMD-2026-0888', client: 'Transport Logistique Ndiaye & Fils', produit: 'Vanne de Freinage Premium ATE', statut: 'Expédiée', prix: 185000 },
    { numero: 'CMD-2026-0885', client: 'Ousmane Sow (Club Cycliste Dakar)', produit: 'Dérailleur Arrière Shimano XT', statut: 'Livrée', prix: 58000 },
    { numero: 'CMD-2026-0882', client: 'Garage Auto Plus Thiès', produit: 'Filtre à huile Bosch F026407006', statut: 'En attente', prix: 45000 },
    { numero: 'CMD-2026-0879', client: 'Fatou Mbaye Auto-École', produit: 'Kit distribution complet Gates', statut: 'Livrée', prix: 135000 },
  ];

  // ---- Graphique ventes mensuelles ----
  periods = ['6M', '3M', '1M'];
  activePeriod = '6M';
  ventesParMois: VenteMois[] = [
    { mois: 'Jan', montant: 1420000 },
    { mois: 'Fév', montant: 1680000 },
    { mois: 'Mar', montant: 1380000 },
    { mois: 'Avr', montant: 1950000 },
    { mois: 'Mai', montant: 1760000 },
    { mois: 'Jun', montant: 2280750 },
  ];

  // ---- Graphique ventes hebdo ----
  jourPic = 'Jeudi';
  ventesHebdo: VenteJour[] = [
    { jour: 'LUN', montant: 185000, pct: 35, actif: false },
    { jour: 'MAR', montant: 230000, pct: 45, actif: false },
    { jour: 'MER', montant: 195000, pct: 38, actif: false },
    { jour: 'JEU', montant: 510000, pct: 100, actif: true  },
    { jour: 'VEN', montant: 275000, pct: 54, actif: false },
    { jour: 'SAM', montant: 140000, pct: 27, actif: false },
    { jour: 'DIM', montant: 95000,  pct: 18, actif: false },
  ];

  // ---- Top produits ----
  topProduits: TopProduit[] = [
    { nom: 'Pneu Michelin Primacy 4',     categorie: 'Pneumatiques',  ventes: 38, ca: 1033600 },
    { nom: 'Plaquettes frein Bosch',      categorie: 'Freinage',      ventes: 24, ca: 216000  },
    { nom: 'Huile Castrol 5W40 5L',       categorie: 'Lubrifiants',   ventes: 19, ca: 285000  },
    { nom: 'Filtre à air Mecafilter',     categorie: 'Filtration',    ventes: 15, ca: 67500   },
    { nom: 'Kit distribution Gates',       categorie: 'Distribution',  ventes: 12, ca: 348000  },
  ];

  // ---- Alertes stock ----
  alertesStock: AlerteStock[] = [
    { nom: 'Bougies NGK Iridium',   restants: 2 },
    { nom: 'Filtre à air Mecafilter', restants: 4 },
  ];

  // ---- Activité récente ----
  activiteRecente: Activite[] = [
    { icon: 'bi-cart-check-fill', iconClass: 'act-green',  texte: 'Nouvelle commande CMD-2026-0892 reçue', temps: 'Il y a 8 min' },
    { icon: 'bi-truck',           iconClass: 'act-blue',   texte: 'CMD-2026-0888 marquée expédiée', temps: 'Il y a 45 min' },
    { icon: 'bi-star-fill',       iconClass: 'act-yellow', texte: 'Nouvel avis 5★ sur Pneu Michelin', temps: 'Il y a 1h30' },
    { icon: 'bi-exclamation-circle-fill', iconClass: 'act-orange', texte: 'Alerte : Bougies NGK en stock critique', temps: 'Il y a 3h' },
    { icon: 'bi-plus-circle-fill',iconClass: 'act-green',  texte: 'Produit "Vanne EGR Bosch" publié', temps: 'Hier, 14h22' },
  ];

  // ---- Satisfaction ----
  totalAvis = 87;
  satisfaction: SatisfactionRow[] = [
    { etoiles: 5, pct: 72 },
    { etoiles: 4, pct: 18 },
    { etoiles: 3, pct: 6  },
    { etoiles: 2, pct: 3  },
    { etoiles: 1, pct: 1  },
  ];

  ngOnInit(): void {
    // Ici, brancher les vrais appels API Django
    // this.fournisseurService.getStats().subscribe(...)
  }

  // ---- Helpers ----
  formatCFA(montant: number): string {
    return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA';
  }

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      'Confirmée': 'statut-confirmee',
      'Expédiée':  'statut-expediee',
      'Livrée':    'statut-livree',
      'En attente':'statut-attente',
      'Annulée':   'statut-annulee',
    };
    return map[statut] || '';
  }

  getBarHeight(montant: number): number {
    const max = Math.max(...this.ventesParMois.map(v => v.montant));
    return Math.round((montant / max) * 100);
  }

  isPeak(montant: number): boolean {
    return montant === Math.max(...this.ventesParMois.map(v => v.montant));
  }
}