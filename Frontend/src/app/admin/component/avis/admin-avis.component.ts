import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminSupportService, AdminAvis, AdminAvisDetail, AdminAvisStats
} from '../../../core/services/admin-support.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-avis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-avis.component.html',
  styleUrls: ['../shared/support-page.css', './admin-avis.component.css']
})
export class AdminAvisComponent implements OnInit {
  avis: AdminAvis[] = [];
  loading = true;
  search = '';
  statutFilter = 'tous';
  noteFilter = 'toutes';
  periodeFilter = 'tous';
  stats: AdminAvisStats | null = null;
  selectedAvis: AdminAvis | null = null;
  detail: AdminAvisDetail | null = null;
  detailLoading = false;
  reponseAdmin = '';
  actionEnCours: number | null = null;

  statuts = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'visible', label: 'Visibles' },
    { value: 'masque', label: 'Masqués' },
    { value: 'moderation_requise', label: 'Signalés (à modérer)' },
  ];

  notes = [
    { value: 'toutes', label: 'Toutes les notes' },
    { value: '5', label: '5 étoiles' },
    { value: '4', label: '4 étoiles' },
    { value: '3', label: '3 étoiles' },
    { value: '2', label: '2 étoiles' },
    { value: '1', label: '1 étoile' },
  ];

  periodes = [
    { value: 'tous', label: 'Toute période' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
  ];

  sousNotes: { key: keyof Pick<AdminAvisDetail, 'note_qualite_produit' | 'note_delai' | 'note_communication' | 'note_livraison'>; label: string }[] = [
    { key: 'note_qualite_produit', label: 'Qualité produit' },
    { key: 'note_delai', label: 'Délai' },
    { key: 'note_communication', label: 'Communication' },
    { key: 'note_livraison', label: 'Livraison' },
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
    this.supportService.getAvis({
      statut: this.statutFilter,
      note: this.noteFilter,
      q: this.search,
      periode: this.periodeFilter
    }).subscribe({
      next: (data) => {
        this.avis = data;
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Impossible de charger les avis', 'Erreur');
        this.loading = false;
      }
    });
  }

  loadStats(): void {
    this.supportService.getAvisStats().subscribe({
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
    this.noteFilter = 'toutes';
    this.periodeFilter = 'tous';
    this.load();
  }

  get hasFilters(): boolean {
    return !!this.search || this.statutFilter !== 'tous' || this.noteFilter !== 'toutes' || this.periodeFilter !== 'tous';
  }

  get tauxVisibles(): number {
    if (!this.stats || !this.stats.total) return 0;
    return Math.round((this.stats.visibles / this.stats.total) * 100);
  }

  notePct(count: number): number {
    if (!this.stats || !this.stats.total) return 0;
    return Math.round((count / this.stats.total) * 100);
  }

  get parNoteDesc(): { note: number; count: number }[] {
    return [...(this.stats?.par_note || [])].sort((a, b) => b.note - a.note);
  }

  selectAvis(a: AdminAvis): void {
    this.selectedAvis = a;
    this.detail = null;
    this.detailLoading = true;
    this.reponseAdmin = a.reponse_fournisseur || '';
    this.supportService.getAvisDetail(a.id).subscribe({
      next: (d) => {
        this.detail = d;
        this.reponseAdmin = d.reponse_fournisseur || '';
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
        this.notificationService.error('Impossible de charger le détail de l\'avis', 'Erreur');
      }
    });
  }

  closeDetail(): void {
    this.selectedAvis = null;
    this.detail = null;
    this.reponseAdmin = '';
  }

  private runAction(a: AdminAvis, action: string, extra: Record<string, unknown> | undefined, okMsg: string, reload = true): void {
    this.actionEnCours = a.id;
    this.supportService.avisAction(a.id, action, extra).subscribe({
      next: () => {
        this.notificationService.success(okMsg, 'Avis');
        this.actionEnCours = null;
        this.load();
        this.loadStats();
        if (reload && this.selectedAvis?.id === a.id) {
          this.selectAvis(a);
        }
      },
      error: () => {
        this.actionEnCours = null;
        this.notificationService.error('Erreur lors de l\'action', 'Avis');
      }
    });
  }

  approuver(a: AdminAvis): void {
    this.runAction(a, 'approuver', undefined, 'Avis rendu visible');
  }

  masquer(a: AdminAvis): void {
    this.runAction(a, 'masquer', undefined, 'Avis masqué');
  }

  supprimer(a: AdminAvis): void {
    if (!confirm('Supprimer définitivement cet avis ?')) return;
    this.actionEnCours = a.id;
    this.supportService.avisAction(a.id, 'supprimer').subscribe({
      next: () => {
        this.notificationService.success('Avis supprimé', 'Avis');
        this.actionEnCours = null;
        this.closeDetail();
        this.load();
        this.loadStats();
      },
      error: () => {
        this.actionEnCours = null;
        this.notificationService.error('Erreur lors de la suppression', 'Avis');
      }
    });
  }

  repondre(): void {
    if (!this.selectedAvis || !this.reponseAdmin.trim()) return;
    this.runAction(this.selectedAvis, 'repondre', { reponse_admin: this.reponseAdmin.trim() }, 'Réponse publiée');
  }

  getStars(note: number | null | undefined): boolean[] {
    const n = Math.max(0, Math.min(5, Math.round(note || 0)));
    return Array.from({ length: 5 }, (_, i) => i < n);
  }

  getInitials(prenom?: string | null, nom?: string | null): string {
    return `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?';
  }

  getNoteClass(note: number): string {
    if (note >= 4) return 'text-green';
    if (note === 3) return 'text-amber';
    return 'text-red';
  }

  formatMontant(value?: number | null): string {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' FCFA';
  }
}
