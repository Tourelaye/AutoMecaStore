import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderService, Notification } from './header.service';
import { AuthService } from '../../../core/services/auth.service';
import { interval, Subscription } from 'rxjs';

interface AdminInfo {
  nom: string;
  role: string;
  initiales: string;
  email: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {

  searchQuery = '';
  showNotifications = false;
  showUserMenu = false;
  currentTime = new Date();
  private timer: any;
  private notificationSubscription: Subscription | null = null;

  adminInfo: AdminInfo = {
    nom: '',
    role: '',
    initiales: '',
    email: ''
  };

  notifications: Notification[] = [];

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  constructor(
    private router: Router,
    private headerService: HeaderService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const u = this.authService.getCurrentUser();
    if (u) {
      this.adminInfo = {
        nom: `${u.prenom ?? ''} ${u.nom ?? ''}`.trim(),
        role: u.role ?? '',
        initiales: `${u.prenom?.[0] ?? ''}${u.nom?.[0] ?? ''}`.toUpperCase(),
        email: u.email ?? ''
      };
    }

    this.timer = setInterval(() => this.currentTime = new Date(), 1000);

    this.loadNotifications();
    
    // Polling pour les notifications en temps réel (toutes les 30 secondes)
    this.notificationSubscription = interval(30000).subscribe(() => {
      this.loadNotifications();
    });
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.notificationSubscription) this.notificationSubscription.unsubscribe();
  }

  loadNotifications(): void {
    this.headerService.getNotifications().subscribe({
      next: (response) => {
        this.notifications = response.notifications;
      },
      error: () => {
        this.notifications = [];
      }
    });
  }

  // Ferme les dropdowns en cliquant dehors
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.notif-wrapper'))    this.showNotifications = false;
    if (!t.closest('.user-menu-wrapper')) this.showUserMenu = false;
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  markAllRead(): void {
    this.notifications.forEach(n => n.read = true);
    // Optionnel: appeler l'API pour marquer comme lu
  }

  getNotifIcon(type: string): string {
    const map: Record<string, string> = {
      order:  'bi-cart-check-fill',
      stock:  'bi-exclamation-triangle-fill',
      client:  'bi-person-plus-fill',
      system:  'bi-gear-fill'
    };
    return map[type] ?? 'bi-bell-fill';
  }

  getNotifColor(type: string): string {
    const map: Record<string, string> = {
      order:  '#3b82f6',
      stock:  '#ef4444',
      client:  '#16a34a',
      system:  '#f97316'
    };
    return map[type] ?? '#6b7280';
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      console.log('Recherche:', this.searchQuery);
      // TODO: brancher sur l'API de recherche
    }
  }
}
