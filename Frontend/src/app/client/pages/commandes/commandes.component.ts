import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommandeService } from '../../../core/services/commande.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Commande } from '../../../models/commande.model';

@Component({
  selector: 'app-commandes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './commandes.component.html',
  styleUrls: ['./commandes.component.css']
})
export class CommandesComponent implements OnInit {

  commandes: Commande[] = [];
  isLoading = false;
  erreur = false;

  constructor(
    private commandeService: CommandeService,
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
    switch (statut) {
      case 'en_attente': return 'statut-attente';
      case 'en_cours': return 'statut-cours';
      case 'paye': return 'statut-paye';
      case 'livre': return 'statut-livre';
      default: return 'statut-default';
    }
  }

  getStatutLabel(statut: string): string {
    switch (statut) {
      case 'en_attente': return 'En attente';
      case 'en_cours': return 'En cours';
      case 'paye': return 'Payée';
      case 'livre': return 'Livrée';
      default: return statut;
    }
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