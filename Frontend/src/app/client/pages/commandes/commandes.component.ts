import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommandeClientService, CommandeClient } from '../../../core/services/commande-client.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-commandes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './commandes.component.html',
  styleUrls: ['./commandes.component.css']
})
export class CommandesComponent implements OnInit {

  commandes: CommandeClient[] = [];
  isLoading = false;
  erreur = false;

  constructor(
    private commandeService: CommandeClientService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadCommandes();
  }

  private loadCommandes(): void {
    this.isLoading = true;
    this.erreur = false;
    
    this.commandeService.getCommandes().subscribe({
      next: (data) => {
        this.commandes = Array.isArray(data) ? data : (data as any).results || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des commandes:', err);
        this.erreur = true;
        this.isLoading = false;
        this.notificationService.error('Impossible de charger vos commandes', 'Erreur');
      }
    });
  }

  getStatutClass(statut: string): string {
    if (statut === 'nouvelle_commande' || statut === 'en_attente_paiement' || statut === 'en_attente_confirmation') return 'statut-attente';
    if (statut === 'acceptee' || statut === 'en_preparation') return 'statut-cours';
    if (statut === 'prete_a_retirer' || statut === 'en_cours_livraison') return 'statut-cours';
    if (statut === 'livree' || statut === 'terminee') return 'statut-livre';
    if (statut === 'refusee' || statut === 'annulee') return 'statut-attente';
    return 'statut-default';
  }

  getStatutLabel(statut: string): string {
    const labels: Record<string, string> = {
      nouvelle_commande: 'Nouvelle commande',
      en_attente_paiement: 'En attente de paiement',
      en_attente_confirmation: 'En attente de confirmation',
      acceptee: 'Acceptée',
      en_preparation: 'En préparation',
      prete_a_retirer: 'Prête à retirer',
      en_cours_livraison: 'En cours de livraison',
      livree: 'Livrée',
      terminee: 'Terminée',
      refusee: 'Refusée',
      annulee: 'Annulée'
    };
    return labels[statut] || statut;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}