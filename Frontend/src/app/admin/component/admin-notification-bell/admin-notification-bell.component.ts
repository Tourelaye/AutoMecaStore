import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminNotificationsService, AdminNotification } from '../../service/admin-notifications.service';

@Component({
  selector: 'app-admin-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-notification-bell.component.html',
  styleUrls: ['./admin-notification-bell.component.css']
})
export class AdminNotificationBellComponent implements OnInit {
  notifications: AdminNotification[] = [];
  unreadCount = 0;
  open = false;
  loading = false;

  constructor(
    private adminNotifications: AdminNotificationsService,
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
    this.adminNotifications.getNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.unreadCount = this.adminNotifications.getUnreadCount();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onNotificationClick(notif: AdminNotification): void {
    if (!notif.read) {
      this.adminNotifications.markAsRead(notif.id);
    }
    notif.read = true;
    this.open = false;
    this.unreadCount = this.adminNotifications.getUnreadCount();

    if (notif.lien && notif.lien.startsWith('/')) {
      this.router.navigateByUrl(notif.lien);
      return;
    }

    // Routage par type (redirections admin)
    if (notif.type === 'order') this.router.navigate(['/admin/commandes']);
    else if (notif.type === 'stock') this.router.navigate(['/admin/produits']);
    else if (notif.type === 'client') this.router.navigate(['/admin/clients']);
    else if (notif.type === 'fournisseur') this.router.navigate(['/admin/fournisseurs']);
    else if (notif.type === 'produit') this.router.navigate(['/admin/approbation-produits']);
  }

  markAllRead(event: Event): void {
    event.stopPropagation();
    this.adminNotifications.markAllRead();
    this.notifications.forEach(n => n.read = true);
    this.unreadCount = 0;
  }

  delete(event: Event, notif: AdminNotification): void {
    event.stopPropagation();
    this.adminNotifications.deleteNotification(notif.id);
    this.notifications = this.notifications.filter(n => n.id !== notif.id);
    this.unreadCount = this.adminNotifications.getUnreadCount();
  }

  getIcon(type: string): string {
    switch (type) {
      case 'order': return 'bi-cart-check';
      case 'stock': return 'bi-box-seam';
      case 'client': return 'bi-person-plus';
      case 'fournisseur': return 'bi-shop';
      case 'produit': return 'bi-box-seam';
      case 'system': return 'bi-gear';
      default: return 'bi-bell';
    }
  }

  private refreshEveryMinute(): void {
    setInterval(() => this.loadNotifications(), 60000);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.open) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.admin-notification-bell')) {
      this.open = false;
    }
  }
}