import { Component, Output, EventEmitter, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
    nom: 'AutoMeca Dakar Distribution',
    shortNom: 'AutoMeca Dakar Dis...',
    email: 'contact@automeca-dakar.com',
    photo: '',
    id: '559021'
  };

  notifications: Notification[] = [
    {
      id: 1,
      message: 'Nouvelle commande reçue – CMD-2024-005',
      time: 'Il y a 5 min',
      icon: 'bi-cart-check',
      type: 'order',
      read: false
    },
    {
      id: 2,
      message: 'Stock faible : Amortisseur Monroe (6 unités)',
      time: 'Il y a 1h',
      icon: 'bi-exclamation-triangle',
      type: 'stock',
      read: false
    },
    {
      id: 3,
      message: 'Nouvel avis client 5★ sur Filtre Bosch',
      time: 'Il y a 3h',
      icon: 'bi-star-fill',
      type: 'review',
      read: false
    }
  ];

  get notificationCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  constructor(private router: Router) {}

  ngOnInit(): void {}

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
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('automeca_user');
    this.router.navigate(['/login']);
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