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
  styleUrls: ['../shared/support-page.css', './admin-partenariats.component.css']
})
export class AdminPartenariatsComponent implements OnInit {
  demandes: DemandePartenariat[] = [];
  loading = true;
  search = '';
  statutFilter = 'tous';
  stats: DemandePartenariatStats | null = null;
  selectedDemande: DemandePartenariat | null = null;
  reponseAdmin = '';
  actionEnCours: number | null = null;

  statuts = [
    { value: 'tous', label: 'Tous les statuts' },
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
        if (this.selectedDemande) {
          const fresh = data.find(d => d.id === this.selectedDemande!.id);
          if (fresh) this.selectedDemande = fresh;
        }
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

  refresh(): void {
    this.load();
    this.loadStats();
  }

  resetFilters(): void {
    this.search = '';
    this.statutFilter = 'tous';
    this.load();
  }

  get hasFilters(): boolean {
    return !!this.search || this.statutFilter !== 'tous';
  }

  get tauxAcceptation(): number {
    if (!this.stats) return 0;
    const traitees = this.stats.acceptees + this.stats.rejetees;
    return traitees ? Math.round((this.stats.acceptees / traitees) * 100) : 0;
  }

  get aTraiter(): number {
    return this.stats ? this.stats.nouvelles + this.stats.en_cours : 0;
  }

  selectDemande(d: DemandePartenariat): void {
    this.selectedDemande = d;
    this.reponseAdmin = d.reponse_admin || '';
  }

  closeDetail(): void {
    this.selectedDemande = null;
    this.reponseAdmin = '';
  }

  changerStatut(d: DemandePartenariat, statut: string): void {
    if (d.statut === statut) return;
    this.actionEnCours = d.id;
    this.supportService.partenariatAction(d.id, 'changer_statut', { statut }).subscribe({
      next: () => {
        this.notificationService.success('Statut mis à jour', 'Partenariat');
        this.actionEnCours = null;
        this.load();
        this.loadStats();
      },
      error: () => {
        this.actionEnCours = null;
        this.notificationService.error('Impossible de changer le statut', 'Partenariat');
      }
    });
  }

  envoyerReponse(): void {
    if (!this.selectedDemande || !this.reponseAdmin.trim()) return;
    const d = this.selectedDemande;
    this.actionEnCours = d.id;
    this.supportService.partenariatAction(d.id, 'repondre', { reponse_admin: this.reponseAdmin.trim() }).subscribe({
      next: () => {
        this.notificationService.success('Réponse enregistrée', 'Partenariat');
        this.actionEnCours = null;
        this.load();
      },
      error: () => {
        this.actionEnCours = null;
        this.notificationService.error('Impossible d\'enregistrer la réponse', 'Partenariat');
      }
    });
  }

  supprimer(d: DemandePartenariat): void {
    if (!confirm(`Supprimer la demande de « ${d.nom_entreprise} » ?`)) return;
    this.actionEnCours = d.id;
    this.supportService.partenariatAction(d.id, 'supprimer').subscribe({
      next: () => {
        this.notificationService.success('Demande supprimée', 'Partenariat');
        this.actionEnCours = null;
        this.closeDetail();
        this.load();
        this.loadStats();
      },
      error: () => {
        this.actionEnCours = null;
        this.notificationService.error('Impossible de supprimer la demande', 'Partenariat');
      }
    });
  }

  getStatutBadge(statut: string): string {
    switch (statut) {
      case 'nouvelle': return 'badge--blue';
      case 'en_cours': return 'badge--amber';
      case 'acceptee': return 'badge--green';
      case 'rejetee': return 'badge--red';
      default: return '';
    }
  }

  getInitials(nom: string): string {
    return (nom || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase() || '?';
  }

  joursDepuis(date: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
  }
}
