import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandeService, Demande } from '../../../core/services/demande.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-demandes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-demandes.component.html',
  styleUrls: ['./admin-demandes.component.css']
})
export class AdminDemandesComponent implements OnInit {
  demandes: Demande[] = [];
  loading = true;
  selectedDemande: Demande | null = null;
  search = '';
  statuts = [
    { value: 'nouvelle', label: 'Nouvelle' },
    { value: 'en_recherche', label: 'En recherche' },
    { value: 'offres_recues', label: 'Offres reçues' },
    { value: 'acceptee', label: 'Acceptée' },
    { value: 'commande_creee', label: 'Commande créée' },
    { value: 'terminee', label: 'Terminée' },
    { value: 'annulee', label: 'Annulée' }
  ];

  constructor(
    private demandeService: DemandeService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.demandeService.getDemandesAdmin({ search: this.search }).subscribe({
      next: (data) => {
        this.demandes = data;
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Impossible de charger les demandes', 'Erreur');
        this.loading = false;
      }
    });
  }

  openDetail(d: Demande): void {
    this.demandeService.getDemandeAdmin(d.id).subscribe({
      next: (detail) => this.selectedDemande = detail,
      error: () => this.notificationService.error('Impossible de charger le détail', 'Erreur')
    });
  }

  closeDetail(): void {
    this.selectedDemande = null;
  }

  changerStatut(statut: string): void {
    if (!this.selectedDemande) { return; }
    this.demandeService.actionAdmin(this.selectedDemande.id, statut).subscribe({
      next: (d) => {
        this.notificationService.success('Statut mis à jour', 'Mise à jour');
        this.selectedDemande = d;
        this.load();
      },
      error: (err: any) => {
        this.notificationService.error(err?.error?.error || 'Erreur', 'Mise à jour impossible');
      }
    });
  }

  libelleStatut(statut: string): string {
    const found = this.statuts.find(s => s.value === statut);
    return found ? found.label : statut;
  }
}
