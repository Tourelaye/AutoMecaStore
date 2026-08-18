import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ClientNotificationsService, NotificationClient } from '../../../core/services/client-notifications.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.css']
})
export class NotificationBellComponent implements OnInit {
  notifications: NotificationClient[] = [];
  unreadCount = 0;
  open = false;
  loading = false;

  constructor(
    private clientNotifications: ClientNotificationsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.clientNotifications.unreadCount$.subscribe(count => this.unreadCount = count);
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
    this.clientNotifications.getNotifications(10).subscribe({
      next: (res) => {
        this.notifications = res.notifications || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onNotificationClick(notif: NotificationClient): void {
    if (!notif.lu) {
      this.clientNotifications.marquerCommeLue(notif.id).subscribe();
    }
    notif.lu = true;
    this.open = false;
    if (notif.lien) {
      this.router.navigateByUrl(notif.lien);
    }
  }

  markAllRead(event: Event): void {
    event.stopPropagation();
    this.clientNotifications.toutMarquerCommeLu().subscribe(() => {
      this.notifications.forEach(n => n.lu = true);
    });
  }

  delete(event: Event, notif: NotificationClient): void {
    event.stopPropagation();
    this.clientNotifications.supprimerNotification(notif.id).subscribe(() => {
      this.notifications = this.notifications.filter(n => n.id !== notif.id);
    });
  }

  getIconClass(importance: string): string {
    switch (importance) {
      case 'success': return 'bi-check-circle-fill text-success';
      case 'warning': return 'bi-exclamation-triangle-fill text-warning';
      case 'danger': return 'bi-x-octagon-fill text-danger';
      default: return 'bi-bell-fill text-info';
    }
  }

  private refreshEveryMinute(): void {
    setInterval(() => this.clientNotifications.getCount().subscribe(), 60000);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.open) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-bell')) {
      this.open = false;
    }
  }
}
