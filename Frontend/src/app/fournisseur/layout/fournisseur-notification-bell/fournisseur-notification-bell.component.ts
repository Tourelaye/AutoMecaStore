import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FournisseurNotificationsService, FournisseurNotification } from '../../services/fournisseur-notifications.service';

@Component({
  selector: 'app-fournisseur-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fournisseur-notification-bell.component.html',
  styleUrls: ['./fournisseur-notification-bell.component.css']
})
export class FournisseurNotificationBellComponent implements OnInit {
  notifications: FournisseurNotification[] = [];
  unreadCount = 0;
  open = false;
  loading = false;

  constructor(
    private fournisseurNotifications: FournisseurNotificationsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.refreshEveryMinute();
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.loadNotifications();
    }
  }

  close(): void {
    this.open = false;
  }

  loadNotifications(): void {
    this.loading = true;
    this.fournisseurNotifications.getNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.unreadCount = data.filter(n => !n.lu).length;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onNotificationClick(notif: FournisseurNotification): void {
    if (!notif.lu) {
      this.fournisseurNotifications.markNotificationRead(notif.id).subscribe();
    }
    notif.lu = true;
    this.open = false;
    this.unreadCount = this.notifications.filter(n => !n.lu).length;

    if (notif.lien && notif.lien.startsWith('/')) {
      this.router.navigateByUrl(notif.lien);
      return;
    }

    // Routage par type (redirections fournisseur)
    if (notif.type === 'commande') this.router.navigate(['/fournisseur/commandes']);
    else if (notif.type === 'stock') this.router.navigate(['/fournisseur/stocks']);
    else if (notif.type === 'avis') this.router.navigate(['/fournisseur/avis']);
    else if (notif.type === 'promotion') this.router.navigate(['/fournisseur/promotions']);
    else this.router.navigate(['/fournisseur/notifications']);
  }

  markAllRead(event: Event): void {
    event.stopPropagation();
    this.fournisseurNotifications.markAllNotificationsRead().subscribe(() => {
      this.notifications.forEach(n => n.lu = true);
      this.unreadCount = 0;
    });
  }

  delete(event: Event, notif: FournisseurNotification): void {
    event.stopPropagation();
    this.fournisseurNotifications.deleteNotification(notif.id).subscribe(() => {
      this.notifications = this.notifications.filter(n => n.id !== notif.id);
      this.unreadCount = this.notifications.filter(n => !n.lu).length;
    });
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

  voirToutes(): void {
    this.router.navigate(['/fournisseur/notifications']);
    this.close();
  }

  timeAgo(iso: string): string {
    if (!iso) return 'À l\'instant';
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

  private refreshEveryMinute(): void {
    setInterval(() => this.loadNotifications(), 60000);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.open) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.fournisseur-notification-bell')) {
      this.open = false;
    }
  }
}