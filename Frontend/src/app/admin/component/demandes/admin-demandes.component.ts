import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandeService, Demande, Offre } from '../../../core/services/demande.service';
import { NotificationService } from '../../../core/services/notification.service';

interface DemandeStats {
  total: number;
  nouvelles: number;
  en_cours: number;
  avec_offres: number;
  converties: number;
  annulees: number;
}

@Component({
  selector: 'app-admin-demandes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-demandes.component.html',
  styleUrls: ['../shared/support-page.css', './admin-demandes.component.css']
})
export class AdminDemandesComponent implements OnInit {
  demandes: Demande[] = [];
  loading = true;
  detailLoading = false;
  actionEnCours = false;
  selectedDemande: Demande | null = null;
  search = '';
  statutFilter = 'tous';
  nouveauStatut = '';

  statuts = [
    { value: 'nouvelle', label: 'Nouvelle', badge: 'badge--blue' },
    { value: 'en_recherche', label: 'En recherche', badge: 'badge--amber' },
    { value: 'offres_recues', label: 'Offres reçues', badge: 'badge--violet' },
    { value: 'acceptee', label: 'Acceptée', badge: 'badge--green' },
    { value: 'commande_creee', label: 'Commande créée', badge: 'badge--green' },
    { value: 'terminee', label: 'Terminée', badge: 'badge--green' },
    { value: 'annulee', label: 'Annulée', badge: 'badge--red' }
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

  resetFilters(): void {
    this.search = '';
    this.statutFilter = 'tous';
    this.load();
  }

  get hasFilters(): boolean {
    return !!this.search || this.statutFilter !== 'tous';
  }

  get demandesFiltrees(): Demande[] {
    if (this.statutFilter === 'tous') return this.demandes;
    return this.demandes.filter(d => d.statut === this.statutFilter);
  }

  get stats(): DemandeStats {
    const s: DemandeStats = { total: this.demandes.length, nouvelles: 0, en_cours: 0, avec_offres: 0, converties: 0, annulees: 0 };
    for (const d of this.demandes) {
      if (d.statut === 'nouvelle') s.nouvelles++;
      else if (d.statut === 'en_recherche' || d.statut === 'offres_recues') s.en_cours++;
      else if (d.statut === 'acceptee' || d.statut === 'commande_creee' || d.statut === 'terminee') s.converties++;
      else if (d.statut === 'annulee') s.annulees++;
      if ((d.offres_count || 0) > 0) s.avec_offres++;
    }
    return s;
  }

  openDetail(d: Demande): void {
    this.selectedDemande = d;
    this.nouveauStatut = d.statut;
    this.detailLoading = true;
    this.demandeService.getDemandeAdmin(d.id).subscribe({
      next: (detail) => {
        this.selectedDemande = detail;
        this.nouveauStatut = detail.statut;
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
        this.notificationService.error('Impossible de charger le détail', 'Erreur');
      }
    });
  }

  closeDetail(): void {
    this.selectedDemande = null;
    this.nouveauStatut = '';
  }

  get statutModifie(): boolean {
    return !!this.selectedDemande && !!this.nouveauStatut && this.nouveauStatut !== this.selectedDemande.statut;
  }

  appliquerStatut(): void {
    if (!this.selectedDemande || !this.statutModifie) return;
    this.actionEnCours = true;
    this.demandeService.actionAdmin(this.selectedDemande.id, this.nouveauStatut).subscribe({
      next: (d) => {
        this.notificationService.success('Statut mis à jour', 'Demande');
        this.selectedDemande = d;
        this.nouveauStatut = d.statut;
        this.actionEnCours = false;
        this.load();
      },
      error: (err: { error?: { error?: string } }) => {
        this.actionEnCours = false;
        this.notificationService.error(err?.error?.error || 'Erreur', 'Mise à jour impossible');
      }
    });
  }

  libelleStatut(statut: string): string {
    const found = this.statuts.find(s => s.value === statut);
    return found ? found.label : statut;
  }

  badgeStatut(statut: string): string {
    const found = this.statuts.find(s => s.value === statut);
    return found ? found.badge : '';
  }

  clientNom(d: Demande): string {
    return d.client_detail?.nom || d.nom_contact || '—';
  }

  clientEmail(d: Demande): string {
    return d.client_detail?.email || d.email_contact || '';
  }

  clientTelephone(d: Demande): string {
    return d.telephone_contact || d.client_detail?.telephone || '';
  }

  vehiculeLabel(d: Demande): string {
    const parts = [d.marque_vehicule, d.modele_vehicule, d.annee_vehicule ? String(d.annee_vehicule) : '']
      .map(p => (p || '').toString().trim())
      .filter(Boolean);
    return parts.join(' ');
  }

  localisation(d: Demande): string {
    return [d.quartier, d.ville].filter(Boolean).join(', ');
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

  formatMontant(value?: number | string | null): string {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA';
  }

  offreBadge(o: Offre): string {
    switch (o.statut) {
      case 'acceptee':
      case 'convertie': return 'badge--green';
      case 'rejetee': return 'badge--red';
      default: return 'badge--amber';
    }
  }

  joursDepuis(date: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
  }
}
