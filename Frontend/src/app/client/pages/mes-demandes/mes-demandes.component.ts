import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { DemandeService, Demande, Offre } from '../../../core/services/demande.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-mes-demandes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mes-demandes.component.html',
  styleUrls: ['./mes-demandes.component.css']
})
export class MesDemandesComponent implements OnInit {
  demandes: Demande[] = [];
  loading = true;
  selectedDemande: Demande | null = null;
  modeReception = 'livraison';
  accepting: number | null = null;

  constructor(
    private demandeService: DemandeService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.demandeService.getMesDemandes().subscribe({
      next: (data) => {
        this.demandes = data;
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Impossible de charger vos demandes', 'Erreur');
        this.loading = false;
      }
    });
  }

  select(d: Demande): void {
    this.demandeService.getMaDemande(d.id).subscribe({
      next: (detail) => {
        this.selectedDemande = detail;
      },
      error: () => {
        this.notificationService.error('Impossible de charger le détail', 'Erreur');
      }
    });
  }

  back(): void {
    this.selectedDemande = null;
    this.accepting = null;
  }

  accepterOffre(offre: Offre): void {
    if (!this.selectedDemande) { return; }
    this.accepting = offre.id;
    this.demandeService.accepterOffre(this.selectedDemande.id, offre.id, this.modeReception).subscribe({
      next: (res: any) => {
        this.notificationService.success(`Commande ${res.commande_reference} créée`, 'Offre acceptée');
        this.load();
        this.selectedDemande = null;
        this.accepting = null;
      },
      error: (err: any) => {
        this.accepting = null;
        this.notificationService.error(err?.error?.error || 'Erreur', 'Acceptation impossible');
      }
    });
  }

  libelleStatut(statut: string): string {
    const map: Record<string, string> = {
      nouvelle: 'Nouvelle',
      en_recherche: 'En recherche',
      offres_recues: 'Offres reçues',
      acceptee: 'Acceptée',
      commande_creee: 'Commande créée',
      terminee: 'Terminée',
      annulee: 'Annulée'
    };
    return map[statut] || statut;
  }
}
