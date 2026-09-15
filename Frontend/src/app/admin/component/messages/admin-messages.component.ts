import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSupportService, MessageSupport, MessageSupportStats } from '../../../core/services/admin-support.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-messages.component.html',
  styleUrls: ['../shared/support-page.css', './admin-messages.component.css']
})
export class AdminMessagesComponent implements OnInit {
  messages: MessageSupport[] = [];
  loading = true;
  search = '';
  statutFilter = 'tous';
  stats: MessageSupportStats | null = null;
  selectedMessage: MessageSupport | null = null;
  actionEnCours: number | null = null;

  statuts = [
    { value: 'tous', label: 'Tous les messages' },
    { value: 'ENVOYE', label: 'Non lus' },
    { value: 'LU', label: 'Lus' },
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
    this.supportService.getMessages({ statut: this.statutFilter, q: this.search }).subscribe({
      next: (data) => {
        this.messages = data;
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Impossible de charger les messages', 'Erreur');
        this.loading = false;
      }
    });
  }

  loadStats(): void {
    this.supportService.getMessageStats().subscribe({
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

  get tauxLus(): number {
    if (!this.stats || !this.stats.total) return 0;
    return Math.round((this.stats.lus / this.stats.total) * 100);
  }

  selectMessage(m: MessageSupport): void {
    this.selectedMessage = m;
    if (m.statut === 'ENVOYE') {
      this.supportService.messageAction(m.id, 'marquer_lu').subscribe({
        next: () => {
          m.statut = 'LU';
          m.statut_label = 'Lu';
          this.loadStats();
        },
        error: () => {}
      });
    }
  }

  closeDetail(): void {
    this.selectedMessage = null;
  }

  marquerNonLu(m: MessageSupport): void {
    this.actionEnCours = m.id;
    this.supportService.messageAction(m.id, 'marquer_non_lu').subscribe({
      next: () => {
        m.statut = 'ENVOYE';
        m.statut_label = 'Envoyé';
        this.actionEnCours = null;
        this.notificationService.success('Message marqué comme non lu', 'Support');
        this.loadStats();
      },
      error: () => {
        this.actionEnCours = null;
        this.notificationService.error('Impossible de mettre à jour le message', 'Support');
      }
    });
  }

  marquerLu(m: MessageSupport): void {
    this.actionEnCours = m.id;
    this.supportService.messageAction(m.id, 'marquer_lu').subscribe({
      next: () => {
        m.statut = 'LU';
        m.statut_label = 'Lu';
        this.actionEnCours = null;
        this.loadStats();
      },
      error: () => {
        this.actionEnCours = null;
        this.notificationService.error('Impossible de mettre à jour le message', 'Support');
      }
    });
  }

  supprimer(m: MessageSupport): void {
    if (!confirm(`Supprimer le message « ${m.objet} » ?`)) return;
    this.actionEnCours = m.id;
    this.supportService.deleteMessage(m.id).subscribe({
      next: () => {
        this.notificationService.success('Message supprimé', 'Support');
        this.actionEnCours = null;
        this.selectedMessage = null;
        this.load();
        this.loadStats();
      },
      error: () => {
        this.actionEnCours = null;
        this.notificationService.error('Impossible de supprimer le message', 'Support');
      }
    });
  }

  getInitials(prenom?: string | null, nom?: string | null): string {
    return `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?';
  }

  clientNom(m: MessageSupport): string {
    const nom = `${m.client_prenom || ''} ${m.client_nom || ''}`.trim();
    return nom || m.client_email || 'Client inconnu';
  }

  mailtoLink(m: MessageSupport): string {
    if (!m.client_email) return '';
    const sujet = encodeURIComponent(`Re: ${m.objet}`);
    return `mailto:${m.client_email}?subject=${sujet}`;
  }
}
