import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, interval, takeUntil } from 'rxjs';
import { AdminNotificationsService, AdminNotification } from '../../service/admin-notifications.service';

type FilterRead = 'all' | 'read' | 'unread';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private notificationsService = inject(AdminNotificationsService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  notifications: AdminNotification[] = [];
  filteredNotifications: AdminNotification[] = [];
  loading = false;
  filterType = 'all';
  filterRead: FilterRead = 'all';
  showClearConfirm = false;

  readonly types = [
    { value: 'all', label: 'Tous les types' },
    { value: 'order', label: 'Commandes' },
    { value: 'stock', label: 'Stocks' },
    { value: 'client', label: 'Clients' },
    { value: 'fournisseur', label: 'Fournisseurs' },
    { value: 'produit', label: 'Produits' },
    { value: 'system', label: 'Système' }
  ];

  ngOnInit(): void {
    this.loadNotifications();

    // Actualisation toutes les 60 secondes
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadNotifications());

    // Sync loading state
    this.notificationsService.loading$.pipe(takeUntil(this.destroy$)).subscribe(l => this.loading = l);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications(): void {
    this.notificationsService.getNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.applyFilters();
      }
    });
  }

  applyFilters(): void {
    this.filteredNotifications = this.notifications.filter(n => {
      const matchType = this.filterType === 'all' || this.filterType === '' || n.type === this.filterType;
      const matchRead = this.filterRead === 'all'
        ? true
        : this.filterRead === 'read' ? n.read : !n.read;
      return matchType && matchRead;
    });
  }

  markAsRead(n: AdminNotification, event?: Event): void {
    event?.stopPropagation();
    if (n.read) return;
    this.notificationsService.markAsRead(n.id);
    this.notifications = this.notifications.map(x => x.id === n.id ? { ...x, read: true } : x);
    this.applyFilters();
  }

  markAllRead(): void {
    this.notificationsService.markAllRead();
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    this.applyFilters();
  }

  deleteNotification(n: AdminNotification, event: Event): void {
    event.stopPropagation();
    this.notificationsService.deleteNotification(n.id);
    this.notifications = this.notifications.filter(x => x.id !== n.id);
    this.applyFilters();
  }

  clearAll(): void {
    this.showClearConfirm = false;
    this.notificationsService.clearAll().subscribe({
      next: () => {
        this.notifications = [];
        this.applyFilters();
      },
      error: () => {
        // On efface quand même l'affichage local si le cache a échoué
        this.notifications = [];
        this.applyFilters();
      }
    });
  }

  onNotificationClick(n: AdminNotification): void {
    this.markAsRead(n);

    if (n.lien && n.lien.startsWith('/')) {
      this.router.navigateByUrl(n.lien);
      return;
    }

    // Routage par type
    if (n.type === 'order') this.router.navigate(['/admin/commandes']);
    else if (n.type === 'stock') this.router.navigate(['/admin/produits']);
    else if (n.type === 'client') this.router.navigate(['/admin/clients']);
    else if (n.type === 'fournisseur') this.router.navigate(['/admin/fournisseurs']);
    else if (n.type === 'produit') this.router.navigate(['/admin/approbation-produits']);
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  countByType(type: string): number {
    if (!type || type === 'all') return this.notifications.length;
    return this.notifications.filter(n => n.type === type).length;
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

  getTypeLabel(type: string): string {
    const found = this.types.find(t => t.value === type);
    return found ? found.label : type;
  }

  formatDate(iso: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('fr-FR');
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
}
