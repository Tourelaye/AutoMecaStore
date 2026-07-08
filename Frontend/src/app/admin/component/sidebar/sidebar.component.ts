import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../core/services/notifications.service';
import { MockAuthService } from '../../../core/services/mock-auth.service';
import { Subscription } from 'rxjs';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

interface AdminInfo {
  nom: string;
  role: string;
  initiales: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {

  isCollapsed = false;
  isMobile    = false;
  adminInfo: AdminInfo = { nom: 'Administrateur', role: 'Admin', initiales: 'A' };

  navItems: NavItem[] = [
    { label: 'Dashboard',           icon: 'bi-speedometer2',   route: '/admin/dashboard' },
    { label: 'Fournisseurs',        icon: 'bi-building',       route: '/admin/fournisseurs' },
    { label: 'Produits',            icon: 'bi-box-seam',       route: '/admin/produits'  },
    { label: 'Catégories',          icon: 'bi-grid-3x3-gap',   route: '/admin/categories' },
    { label: 'Commandes',           icon: 'bi-cart-check',     route: '/admin/commandes'  },
    { label: 'Clients',             icon: 'bi-people',         route: '/admin/clients'    },
    { label: 'Paiements & Factures',           icon: 'bi-credit-card',    route: '/admin/paiements'  },
    { label: 'Livraisons',          icon: 'bi-truck',          route: '/admin/livraisons' },
    { label: 'Avis & Réclamations', icon: 'bi-chat-left-text', route: '/admin/avis'       },
    { label: 'Journal d\'activités',             icon: 'bi-journal-text',   route: '/admin/journal'    },
    { label: 'Paramètres',          icon: 'bi-gear',           route: '/admin/parametres' },
  ];

  private notificationSub: Subscription | null = null;
  private resizeListener = () => this.checkMobile();

  constructor(
    private router: Router,
    private notificationsService: NotificationsService,
    private authService: MockAuthService
  ) {}

  ngOnInit(): void {
    this.checkMobile();
    window.addEventListener('resize', this.resizeListener);

    // Charge le profil admin depuis localStorage
    const raw = localStorage.getItem('admin_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        this.adminInfo = {
          nom:      `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() || 'Administrateur',
          role:     u.role ?? 'Admin',
          initiales: u.avatar ?? (`${u.prenom?.[0] ?? ''}${u.nom?.[0] ?? ''}`.toUpperCase() || 'A')
        };
      } catch { /* valeurs par défaut */ }
    }

    // Badges dynamiques via NotificationsService
    this.notificationSub = this.notificationsService.notificationCount$.subscribe(counts => {
      this.updateNavItemsBadges(counts);
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
    this.notificationSub?.unsubscribe();
  }

  // ── Met à jour les badges Commandes & Avis ──────────────────────────────
  private updateNavItemsBadges(counts: { commandes: number; avis: number; total: number }): void {
    this.navItems = this.navItems.map(item => {
      if (item.label === 'Commandes') {
        return { ...item, badge: counts.commandes > 0 ? counts.commandes : undefined };
      }
      if (item.label === 'Avis & Réclamations') {
        return { ...item, badge: counts.avis > 0 ? counts.avis : undefined };
      }
      return item;
    });
  }

  checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) this.isCollapsed = true;
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}