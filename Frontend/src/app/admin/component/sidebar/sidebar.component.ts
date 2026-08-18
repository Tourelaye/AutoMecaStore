import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../core/services/notifications.service';
import { AuthService } from '../../../core/services/auth.service';
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
  adminInfo: AdminInfo = { nom: '', role: '', initiales: '' };

  gestionMenuItems: NavItem[] = [
    { label: 'Dashboard',           icon: 'bi-speedometer2',   route: '/admin/dashboard' },
    { label: 'Fournisseurs',        icon: 'bi-building',       route: '/admin/fournisseurs' },
    { label: 'Produits',            icon: 'bi-box-seam',       route: '/admin/produits'  },
    { label: 'Approbation Produits',icon: 'bi-check-circle',   route: '/admin/approbation-produits' },
    { label: 'Catégories',          icon: 'bi-grid-3x3-gap',   route: '/admin/categories' },
    { label: 'Marques',             icon: 'bi-tags',           route: '/admin/marques' },
    { label: 'Commandes',           icon: 'bi-cart-check',     route: '/admin/commandes'  },
    { label: 'Utilisateurs', icon: 'bi-people-fill', route: '/admin/utilisateurs' },
    { label: 'Paiements & Factures',           icon: 'bi-credit-card',    route: '/admin/paiements'  },
    { label: 'Livraisons',          icon: 'bi-truck',          route: '/admin/livraisons' },
    { label: 'Avis & Réclamations', icon: 'bi-chat-left-text', route: '/admin/avis'       },
    { label: 'Réclamations & Litiges', icon: 'bi-shield-exclamation', route: '/admin/reclamations' },
  ];

  analyseMenuItems: NavItem[] = [
    { label: 'Centre d\'analyse',  icon: 'bi-graph-up-arrow', route: '/admin/analyse'  },
    { label: 'Journal d\'activités', icon: 'bi-journal-text', route: '/admin/journal'    },
    { label: 'Notifications',       icon: 'bi-bell',           route: '/admin/notifications' },
  ];

  compteMenuItems: NavItem[] = [
    { label: 'Sécurité',            icon: 'bi-shield-lock',   route: '/admin/securite'    },
    { label: 'Paramètres',          icon: 'bi-gear',           route: '/admin/parametres' },
  ];

  private notificationSub: Subscription | null = null;
  private resizeListener = () => this.checkMobile();

  constructor(
    private router: Router,
    private notificationsService: NotificationsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkMobile();
    window.addEventListener('resize', this.resizeListener);

    const u = this.authService.getCurrentUser();
    if (u) {
      this.adminInfo = {
        nom: `${u.prenom ?? ''} ${u.nom ?? ''}`.trim(),
        role: u.role ?? '',
        initiales: `${u.prenom?.[0] ?? ''}${u.nom?.[0] ?? ''}`.toUpperCase()
      };
    }

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
    const applyBadges = (item: NavItem): NavItem => {
      if (item.label === 'Commandes') {
        return { ...item, badge: counts.commandes > 0 ? counts.commandes : undefined };
      }
      if (item.label === 'Avis & Réclamations') {
        return { ...item, badge: counts.avis > 0 ? counts.avis : undefined };
      }
      return item;
    };
    this.gestionMenuItems = this.gestionMenuItems.map(applyBadges);
    this.analyseMenuItems = this.analyseMenuItems.map(applyBadges);
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