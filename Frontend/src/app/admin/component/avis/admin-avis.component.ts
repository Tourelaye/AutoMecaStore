import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSupportService, AdminAvis, AdminAvisStats } from '../../../core/services/admin-support.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-avis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-avis.component.html',
  styleUrls: ['./admin-avis.component.css']
})
export class AdminAvisComponent implements OnInit {
  avis: AdminAvis[] = [];
  loading = true;
  search = '';
  statutFilter = 'tous';
  noteFilter = 'toutes';
  stats: AdminAvisStats | null = null;
  selectedAvis: AdminAvis | null = null;

  statuts = [
    { value: 'tous', label: 'Tous' },
    { value: 'visible', label: 'Visibles' },
    { value: 'masque', label: 'Masqués' },
    { value: 'moderation_requise', label: 'Modération requise' },
  ];

  notes = [
    { value: 'toutes', label: 'Toutes notes' },
    { value: '5', label: '5 étoiles' },
    { value: '4', label: '4 étoiles' },
    { value: '3', label: '3 étoiles' },
    { value: '2', label: '2 étoiles' },
    { value: '1', label: '1 étoile' },
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
      q: this.search
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

  selectAvis(a: AdminAvis): void {
    this.selectedAvis = a;
  }

  closeDetail(): void {
    this.selectedAvis = null;
  }

  approuver(a: AdminAvis): void {
    this.supportService.avisAction(a.id, 'approuver').subscribe({
      next: () => {
        a.approuve = true;
        this.notificationService.success('Avis rendu visible', 'Modération');
        this.loadStats();
      },
      error: () => this.notificationService.error('Erreur', 'Modération')
    });
  }

  masquer(a: AdminAvis): void {
    this.supportService.avisAction(a.id, 'masquer').subscribe({
      next: () => {
        a.approuve = false;
        this.notificationService.success('Avis masqué', 'Modération');
        this.loadStats();
      },
      error: () => this.notificationService.error('Erreur', 'Modération')
    });
  }

  supprimer(a: AdminAvis): void {
    if (!confirm('Supprimer définitivement cet avis ?')) return;
    this.supportService.avisAction(a.id, 'supprimer').subscribe({
      next: () => {
        this.notificationService.success('Avis supprimé', 'Modération');
        this.selectedAvis = null;
        this.load();
        this.loadStats();
      },
      error: () => this.notificationService.error('Erreur', 'Modération')
    });
  }

  repondre(a: AdminAvis, reponse: string): void {
    if (!reponse.trim()) return;
    this.supportService.avisAction(a.id, 'repondre', { reponse_admin: reponse }).subscribe({
      next: () => {
        this.notificationService.success('Réponse publiée', 'Modération');
        this.load();
      },
      error: () => this.notificationService.error('Erreur', 'Modération')
    });
  }

  getStars(note: number): string[] {
    return Array(5).fill('').map((_, i) => i < note ? '★' : '☆');
  }

  onSearch(): void {
    this.load();
  }
}
