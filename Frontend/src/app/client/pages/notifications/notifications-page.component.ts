import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ClientNotificationsService, NotificationClient } from '../../../core/services/client-notifications.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.css']
})
export class NotificationsPageComponent implements OnInit {
  notifications: NotificationClient[] = [];
  unreadCount = 0;
  loading = false;
  limit = 50;

  constructor(
    private clientNotifications: ClientNotificationsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.clientNotifications.unreadCount$.subscribe(count => this.unreadCount = count);
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;
    this.clientNotifications.getNotifications(this.limit).subscribe({
      next: (res) => {
        this.notifications = res.notifications || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadMore(): void {
    this.limit += 50;
    this.loadNotifications();
  }

  onNotificationClick(notif: NotificationClient): void {
    if (!notif.lu) {
      this.clientNotifications.marquerCommeLue(notif.id).subscribe();
    }
    notif.lu = true;
    if (notif.lien) {
      this.router.navigateByUrl(notif.lien);
    }
  }

  markAllRead(): void {
    this.clientNotifications.toutMarquerCommeLu().subscribe(() => {
      this.notifications.forEach(n => n.lu = true);
    });
  }

  delete(notif: NotificationClient, event: Event): void {
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
}
