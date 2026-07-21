import { Component, Output, EventEmitter, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, interval, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { FournisseurService, FournisseurProfile } from '../../services/fournisseur.service';
import { FournisseurNotificationsService, FournisseurNotification } from '../../services/fournisseur-notifications.service';

interface NavbarNotification {
  id: number;
  titre: string;
  message: string;
  time: string;
  icon: string;
  type: 'commande' | 'stock' | 'promotion' | 'avis' | 'systeme' | string;
  lu: boolean;
  lien: string;
}

@Component({
  selector: 'app-navbar-fournisseur',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './navbar-fournisseur.component.html',
  styleUrls: ['./navbar-fournisseur.component.css']
})
export class NavbarFournisseurComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  isDropdownOpen = false;
  showNotifications = false;
  isRefreshing = false;
  searchQuery = '';

  fournisseur = {
    nom: '',
    shortNom: '',
    email: '',
    photo: '',
    id: ''
  };

  notifications: NavbarNotification[] = [];

  get notificationCount(): number {
    return this.notifications.filter(n => !n.lu).length;
  }

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService,
    private fournisseurService: FournisseurService,
    private notificationsService: FournisseurNotificationsService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadNotifications();

    // Rafraîchissement périodique toutes les 60s
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadNotifications());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProfile(): void {
    this.fournisseurService.getProfile().subscribe({
      next: (p: FournisseurProfile) => {
        const fullName = p.nom_complet || `${p.user?.prenom || ''} ${p.user?.nom || ''}`.trim() || 'Fournisseur';
        this.fournisseur = {
          nom: p.nom_entreprise || fullName,
          shortNom: (p.nom_entreprise || fullName).slice(0, 20) + '...',
          email: p.user?.email || '',
          photo: p.logo || '',
          id: `${p.user?.id || ''}`
        };
      },
      error: (err: any) => console.error('Erreur chargement profil navbar:', err)
    });
  }

  loadNotifications(): void {
    this.notificationsService.getNotifications().subscribe({
      next: (data: FournisseurNotification[]) => {
        this.notifications = data.slice(0, 8).map(n => ({
          id: n.id,
          titre: n.titre || n.type,
          message: n.message,
          time: this.timeAgo(n.created_at),
          icon: this.getNotificationIcon(n.type),
          type: n.type,
          lu: n.lu,
          lien: n.lien || '/fournisseur/notifications'
        }));
      },
      error: (err: any) => console.error('Erreur chargement notifications:', err)
    });
  }

  private timeAgo(isoDate: string): string {
    if (!isoDate) return 'À l\'instant';
    const date = new Date(isoDate);
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

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'commande': return 'bi-bag-check';
      case 'stock': return 'bi-box-seam';
      case 'promotion': return 'bi-tag';
      case 'avis': return 'bi-star';
      default: return 'bi-bell';
    }
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) this.showNotifications = false;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.isDropdownOpen = false;
      this.loadNotifications();
    }
  }

  onNotificationClick(n: NavbarNotification): void {
    this.showNotifications = false;

    if (!n.lu) {
      n.lu = true;
      this.notificationsService.markNotificationRead(n.id).subscribe({
        error: () => n.lu = false
      });
    }

    if (n.lien && n.lien.startsWith('/')) {
      this.router.navigateByUrl(n.lien);
    } else {
      this.router.navigate(['/fournisseur/notifications']);
    }
  }

  markAllRead(event: Event): void {
    event.stopPropagation();
    this.notificationsService.markAllNotificationsRead().subscribe({
      next: () => this.notifications.forEach(n => n.lu = true),
      error: (err: any) => console.error('Erreur marquer tout comme lu:', err)
    });
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/fournisseur/produits'], {
        queryParams: { q: this.searchQuery }
      });
    }
  }

  refresh(): void {
    this.isRefreshing = true;
    this.loadNotifications();
    setTimeout(() => {
      this.isRefreshing = false;
    }, 600);
  }

  logout(): void {
    this.authService.logout();
    this.closeDropdown();
  }

  getInitials(nom: string): string {
    if (!nom) return 'AU';
    const words = nom.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return nom.substring(0, 2).toUpperCase();
  }

  /** Ferme les dropdowns si on clique en dehors */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrapper')) {
      this.isDropdownOpen = false;
    }
    if (!target.closest('.icon-wrapper')) {
      this.showNotifications = false;
    }
  }
}