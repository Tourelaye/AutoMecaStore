import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';

interface AdminInfo {
  nom: string;
  role: string;
  initiales: string;
  email: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NotificationBellComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {

  searchQuery = '';
  showUserMenu = false;
  currentTime = new Date();
  private timer: any;

  adminInfo: AdminInfo = {
    nom: '',
    role: '',
    initiales: '',
    email: ''
  };

  constructor(
    private router: Router,
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
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // Ferme les dropdowns en cliquant dehors
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.user-menu-wrapper')) this.showUserMenu = false;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
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
