import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, interval, takeUntil } from 'rxjs';
import { FournisseurNotificationsService, FournisseurNotification } from '../../services/fournisseur-notifications.service';

type FilterRead = 'all' | 'read' | 'unread';

@Component({
  selector: 'app-notifications-fournisseur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications-fournisseur.component.html',
  styleUrls: ['./notifications-fournisseur.component.css']
})
export class NotificationsFournisseurComponent implements OnInit, OnDestroy {
  private notificationsService = inject(FournisseurNotificationsService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  notifications: FournisseurNotification[] = [];
  filteredNotifications: FournisseurNotification[] = [];
  loading = false;
  filterType = '';
  filterRead: FilterRead = 'all';

  readonly types = [
    { value: '', label: 'Tous les types' },
    { value: 'commande', label: 'Commandes' },
    { value: 'stock', label: 'Stocks' },
    { value: 'avis', label: 'Avis' },
    { value: 'promotion', label: 'Promotions' },
    { value: 'systeme', label: 'Système' }
  ];

  ngOnInit(): void {
    this.loadNotifications();

    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadNotifications());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications(): void {
    this.loading = true;
    this.notificationsService.getNotifications().subscribe({
      next: (data: FournisseurNotification[]) => {
        this.notifications = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredNotifications = this.notifications.filter(n => {
      const matchType = !this.filterType || n.type === this.filterType;
      const matchRead = this.filterRead === 'all'
        ? true
        : this.filterRead === 'read' ? n.lu : !n.lu;
      return matchType && matchRead;
    });
  }

  markAsRead(n: FournisseurNotification, event?: Event): void {
    event?.stopPropagation();
    if (n.lu) return;

    n.lu = true;
    this.notificationsService.markNotificationRead(n.id).subscribe({
      error: () => n.lu = false
    });
  }

  markAllRead(): void {
    this.notificationsService.markAllNotificationsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.lu = true);
        this.applyFilters();
      }
    });
  }

  deleteNotification(n: FournisseurNotification, event: Event): void {
    event.stopPropagation();
    this.notificationsService.deleteNotification(n.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(x => x.id !== n.id);
        this.applyFilters();
      }
    });
  }

  onNotificationClick(n: FournisseurNotification): void {
    this.markAsRead(n);

    if (n.lien && n.lien.startsWith('/')) {
      this.router.navigateByUrl(n.lien);
    }
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.lu).length;
  }

  getIcon(type: string): string {
    switch (type) {
      case 'commande': return 'bi-bag-check';
      case 'stock': return 'bi-box-seam';
      case 'promotion': return 'bi-tag';
      case 'avis': return 'bi-star';
      default: return 'bi-bell';
    }
  }

  getTypeLabel(type: string): string {
    const found = this.types.find(t => t.value === type);
    return found ? found.label : type;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR');
  }

  timeAgo(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'À l\'instant';
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days} j`;
  }
}
