import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FournisseurService, FournisseurStats, Vente } from '../../services/fournisseur.service';
import { CommandeService, Commande } from '../../services/commande.service';

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

interface CommandeItem {
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

  loading = true;
  error: string | null = null;

  // ---- KPI Stats ----
  stats: Stats = {
    totalProduits: 0,
    produitsActifs: 0,
    tauxActifs: 0,
    ruptures: 0,
    commandesMois: 0,
    commandesEnAttente: 0,
    produitsVendus: 0,
    chiffreAffaires: 0,
  };

  // ---- Dernières commandes ----
  totalCommandes = 0;
  dernieresCommandes: CommandeItem[] = [];

  // ---- Graphique ventes mensuelles ----
  periods = ['6M', '3M', '1M'];
  activePeriod = '6M';
  ventesParMois: VenteMois[] = [];

  // ---- Graphique ventes hebdo ----
  jourPic = 'Jeudi';
  ventesHebdo: VenteJour[] = [];

  // ---- Top produits ----
  topProduits: TopProduit[] = [];

  // ---- Alertes stock ----
  alertesStock: AlerteStock[] = [];

  // ---- Activité récente ----
  activiteRecente: Activite[] = [];

  // ---- Satisfaction ----
  totalAvis = 0;
  satisfaction: SatisfactionRow[] = [];

  constructor(
    private fournisseurService: FournisseurService,
    private commandeService: CommandeService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    // Charger les stats
    this.fournisseurService.getStatistics().subscribe({
      next: (s) => {
        this.stats = {
          totalProduits: s.totalProduits,
          produitsActifs: s.produitsActifs,
          tauxActifs: s.tauxActifs,
          ruptures: s.rupture,
          commandesMois: s.commandesMois,
          commandesEnAttente: s.commandesEnAttente,
          produitsVendus: s.produitsVendus,
          chiffreAffaires: s.chiffreAffaires,
        };
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement stats:', err);
        this.error = 'Impossible de charger les statistiques';
        this.loading = false;
      }
    });

    // Charger les commandes récentes
    this.commandeService.getCommandes().subscribe({
      next: (commandes) => {
        this.totalCommandes = commandes.length;
        this.dernieresCommandes = commandes.slice(0, 6).map(c => ({
          numero: c.reference,
          client: c.client ? `${c.client.prenom} ${c.client.nom}` : 'Client',
          produit: c.lignes?.[0]?.produit_nom || 'Produit',
          statut: this.mapStatut(c.statut),
          prix: c.montant_total
        }));
      },
      error: (err) => console.error('Erreur chargement commandes:', err)
    });

    // Charger les ventes
    this.fournisseurService.getVentes().subscribe({
      next: (ventes) => {
        // Grouper par mois pour le graphique
        const ventesParMois = this.groupVentesByMonth(ventes);
        this.ventesParMois = ventesParMois;
        
        // Top produits
        this.calculerTopProduits(ventes);
      },
      error: (err) => console.error('Erreur chargement ventes:', err)
    });
  }

  private mapStatut(statut: string): CommandeItem['statut'] {
    const map: Record<string, CommandeItem['statut']> = {
      'en_attente': 'En attente',
      'validee': 'Confirmée',
      'expediee': 'Expédiée',
      'livree': 'Livrée',
      'annulee': 'Annulée'
    };
    return map[statut] || 'En attente';
  }

  private groupVentesByMonth(ventes: Vente[]): VenteMois[] {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const grouped: Record<string, number> = {};
    
    ventes.forEach(v => {
      const date = new Date(v.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      grouped[key] = (grouped[key] || 0) + v.total;
    });

    return Object.entries(grouped).slice(-6).map(([key, montant]) => {
      const [year, month] = key.split('-');
      return { mois: months[parseInt(month)], montant };
    });
  }

  private calculerTopProduits(ventes: Vente[]): void {
    const grouped: Record<string, { ventes: number; ca: number }> = {};
    ventes.forEach(v => {
      if (!grouped[v.produit_nom]) {
        grouped[v.produit_nom] = { ventes: 0, ca: 0 };
      }
      grouped[v.produit_nom].ventes += v.quantite;
      grouped[v.produit_nom].ca += v.total;
    });

    this.topProduits = Object.entries(grouped)
      .map(([nom, data]) => ({
        nom,
        categorie: '',
        ventes: data.ventes,
        ca: data.ca
      }))
      .sort((a, b) => b.ventes - a.ventes)
      .slice(0, 5);
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