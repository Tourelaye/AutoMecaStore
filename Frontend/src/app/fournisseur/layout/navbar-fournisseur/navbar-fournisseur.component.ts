import { Component, Output, EventEmitter, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { FournisseurService, FournisseurProfile } from '../../services/fournisseur.service';

interface Notification {
  id: number;
  message: string;
  time: string;
  icon: string;
  type: 'order' | 'stock' | 'review' | 'info';
  read: boolean;
}

@Component({
  selector: 'app-navbar-fournisseur',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './navbar-fournisseur.component.html',
  styleUrls: ['./navbar-fournisseur.component.css']
})
export class NavbarFournisseurComponent implements OnInit {
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

  notifications: Notification[] = [];

  get notificationCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  constructor(
    private router: Router,
    private authService: AuthService,
    private fournisseurService: FournisseurService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
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
      error: (err) => console.error('Erreur chargement profil navbar:', err)
    });
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
    if (this.showNotifications) this.isDropdownOpen = false;
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
    // Simule un rechargement – à brancher sur un service réel
    setTimeout(() => {
      this.isRefreshing = false;
      window.location.reload();
    }, 600);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
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