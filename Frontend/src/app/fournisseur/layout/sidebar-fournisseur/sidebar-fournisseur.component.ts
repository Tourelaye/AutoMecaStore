import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

interface MenuItem {
  icon: string;
  label: string;
  path: string;
  badge?: number | string;
  hasArrow?: boolean;
}

@Component({
  selector: 'app-sidebar-fournisseur',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar-fournisseur.component.html',
  styleUrls: ['./sidebar-fournisseur.component.css']
})
export class SidebarFournisseurComponent {
  @Input() isCollapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  fournisseur = {
    nom: 'AutoMeca Dakar Distributi...',
    email: 'contact@automeca-dakar.com',
    photo: '', // mettre l'URL de la photo ici
    id: '559021'
  };

  // Menu principal (section PRINCIPAL)
  mainMenuItems: MenuItem[] = [
    {
      icon: 'bi-grid-1x2-fill',
      label: 'Dashboard',
      path: '/fournisseur/dashboard',
    },
    {
      icon: 'bi-box-seam',
      label: 'Mes Produits',
      path: '/fournisseur/produits/list-produit',
    },
    {
      icon: 'bi-plus-circle',
      label: 'Ajouter un produit',
      path: '/fournisseur/ajouter-produit',
    },
    {
      icon: 'bi-cart3',
      label: 'Mes Commandes',
      path: '/fournisseur/commandes',
    },
    {
      icon: 'bi-currency-dollar',
      label: 'Mes Ventes',
      path: '/fournisseur/ventes',
    },
    {
      icon: 'bi-archive',
      label: 'Stock',
      path: '/fournisseur/stocks',
      badge: 3,
    },
    {
      icon: 'bi-tag',
      label: 'Promotions',
      path: '/fournisseur/promotions',
    },
    {
      icon: 'bi-star',
      label: 'Avis clients',
      path: '/fournisseur/avis',
    },
    {
      icon: 'bi-bar-chart-line',
      label: 'Statistiques',
      path: '/fournisseur/statistiques',
    },
  ];

  // Menu compte (section COMPTE)
  accountMenuItems: MenuItem[] = [
    {
      icon: 'bi-person-badge',
      label: 'Profil Fournisseur',
      path: '/fournisseur/profil',
    },
    {
      icon: 'bi-clock-history',
      label: 'Historiques d\'activités',
      path: '/fournisseur/historiques',
    },
    {
      icon: 'bi-gear',
      label: 'Paramètres',
      path: '/fournisseur/parametres',
    },
    {
      icon: 'bi-shield-lock',
      label: 'Sécurité',
      path: '/fournisseur/securite',
    },
    // {
    //   icon: 'bi-headset',
    //   label: 'Support',
    //   path: '/fournisseur/support',
    // },
  ];

  constructor(private router: Router) {}

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  onNavClick(item: MenuItem): void {
    // Fermer sidebar sur mobile après navigation
    if (window.innerWidth < 768) {
      this.isCollapsed = true;
      this.collapsedChange.emit(true);
    }
  }

  getInitials(nom: string): string {
    if (!nom) return 'AU';
    const words = nom.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return nom.substring(0, 2).toUpperCase();
  }

  onImgError(event: Event): void {
    // Si l'image échoue à charger, on cache l'img pour afficher les initiales
    (event.target as HTMLImageElement).style.display = 'none';
    this.fournisseur.photo = '';
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }
}