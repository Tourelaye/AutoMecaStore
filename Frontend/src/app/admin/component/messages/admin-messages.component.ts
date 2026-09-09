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
  styleUrls: ['./admin-messages.component.css']
})
export class AdminMessagesComponent implements OnInit {
  messages: MessageSupport[] = [];
  loading = true;
  search = '';
  statutFilter = 'tous';
  stats: MessageSupportStats | null = null;
  selectedMessage: MessageSupport | null = null;

  statuts = [
    { value: 'tous', label: 'Tous' },
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
    this.supportService.messageAction(m.id, 'marquer_non_lu').subscribe({
      next: () => {
        m.statut = 'ENVOYE';
        m.statut_label = 'Envoyé';
        this.notificationService.success('Message marqué comme non lu', 'Support');
        this.loadStats();
      },
      error: () => this.notificationService.error('Erreur', 'Support')
    });
  }

  supprimer(m: MessageSupport): void {
    if (!confirm('Supprimer ce message ?')) return;
    this.supportService.deleteMessage(m.id).subscribe({
      next: () => {
        this.notificationService.success('Message supprimé', 'Support');
        this.selectedMessage = null;
        this.load();
        this.loadStats();
      },
      error: () => this.notificationService.error('Erreur', 'Support')
    });
  }
}
