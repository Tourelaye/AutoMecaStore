import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSupportService, DemandePartenariat, DemandePartenariatStats } from '../../../core/services/admin-support.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-partenariats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-partenariats.component.html',
  styleUrls: ['./admin-partenariats.component.css']
})
export class AdminPartenariatsComponent implements OnInit {
  demandes: DemandePartenariat[] = [];
  loading = true;
  search = '';
  statutFilter = 'tous';
  stats: DemandePartenariatStats | null = null;
  selectedDemande: DemandePartenariat | null = null;
  reponseAdmin = '';

  statuts = [
    { value: 'tous', label: 'Tous' },
    { value: 'nouvelle', label: 'Nouvelles' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'acceptee', label: 'Acceptées' },
    { value: 'rejetee', label: 'Rejetées' },
  ];

  constructor(
    private supportService: AdminSupportService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
  }

  load(): void {
    this.loading = true;
    this.supportService.getPartenariats({ statut: this.statutFilter, q: this.search }).subscribe({
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

  loadStats(): void {
    this.supportService.getPartenariatStats().subscribe({
      next: (data) => this.stats = data,
      error: () => {}
    });
  }

  selectDemande(d: DemandePartenariat): void {
    this.selectedDemande = d;
    this.reponseAdmin = d.reponse_admin || '';
  }

  closeDetail(): void {
    this.selectedDemande = null;
  }

  changerStatut(d: DemandePartenariat, statut: string): void {
    this.supportService.partenariatAction(d.id, 'changer_statut', { statut }).subscribe({
      next: () => {
        this.notificationService.success('Statut mis à jour', 'Partenariat');
        this.load();
        this.loadStats();
        if (this.selectedDemande?.id === d.id) {
          this.selectedDemande = null;
        }
      },
      error: () => this.notificationService.error('Erreur', 'Partenariat')
    });
  }

  envoyerReponse(): void {
    if (!this.selectedDemande || !this.reponseAdmin.trim()) return;
    this.supportService.partenariatAction(this.selectedDemande.id, 'repondre', {
      reponse_admin: this.reponseAdmin
    }).subscribe({
      next: () => {
        this.notificationService.success('Réponse envoyée', 'Partenariat');
        this.load();
        this.selectedDemande = null;
      },
      error: () => this.notificationService.error('Erreur', 'Partenariat')
    });
  }

  supprimer(d: DemandePartenariat): void {
    if (!confirm('Supprimer cette demande ?')) return;
    this.supportService.partenariatAction(d.id, 'supprimer').subscribe({
      next: () => {
        this.notificationService.success('Demande supprimée', 'Partenariat');
        this.selectedDemande = null;
        this.load();
        this.loadStats();
      },
      error: () => this.notificationService.error('Erreur', 'Partenariat')
    });
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'nouvelle': return 'statut-nouvelle';
      case 'en_cours': return 'statut-en-cours';
      case 'acceptee': return 'statut-acceptee';
      case 'rejetee': return 'statut-rejetee';
      default: return '';
    }
  }
}
