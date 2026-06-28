import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { ClientService, Client, ClientStats, ClientFilters } from '../../../core/services/client.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './client.component.html',
  styleUrls: ['./client.component.css']
})
export class ClientComponent implements OnInit, OnDestroy {

  clients: Client[]          = [];
  filteredClients: Client[]  = [];
  stats: ClientStats | null  = null;

  // État
  isLoading = false;
  error: string | null = null;

  // Filtres
  searchQuery      = '';
  selectedStatut: 'all' | 'actif' | 'inactif' = 'all';
  selectedOrdering = '-date_inscription';

  // Modal
  showModal      = false;
  selectedClient: Client | null = null;
  actionType: 'details' | 'toggle' | 'delete' | null = null;

  // Sync temps réel
  private syncSubscription: Subscription | null = null;

  // Pagination
  currentPage  = 1;
  itemsPerPage = 10;
  totalItems   = 0;

  constructor(
    private clientService: ClientService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.startRealTimeSync();
  }

  ngOnDestroy(): void {
    this.syncSubscription?.unsubscribe();
  }

  // ─────────────────────────────────────────
  // CHARGEMENT
  // ─────────────────────────────────────────

  loadInitialData(): void {
    this.isLoading = true;
    this.error = null;
    this.loadClients();
    this.loadStats();
  }

  loadClients(): void {
    const filters: ClientFilters = {
      search:   this.searchQuery || undefined,
      statut:   this.selectedStatut === 'all' ? undefined : this.selectedStatut,
      ordering: this.selectedOrdering
    };

    this.clientService.getClients(filters).subscribe({
      next: (clients) => {
        this.clients         = clients;
        this.filteredClients = clients;
        this.totalItems      = clients.length;
        this.isLoading       = false;
      },
      error: (err) => {
        this.error     = err.message;
        this.isLoading = false;
        this.notificationService.error('Impossible de charger les clients', 'Erreur');
      }
    });
  }

  private loadStats(): void {
    this.clientService.getClientStats().subscribe({
      next:  (stats) => { this.stats = stats; },
      error: (err)   => { console.error('Stats:', err); }
    });
  }

  // ─────────────────────────────────────────
  // SYNC TEMPS RÉEL (toutes les 30s)
  // ─────────────────────────────────────────

  private startRealTimeSync(): void {
    this.syncSubscription = interval(30000).subscribe(() => {
      this.loadClients();
      this.loadStats();
      this.checkNotifications();
    });
    this.checkNotifications();
  }

  private checkNotifications(): void {
    this.clientService.getAdminNotifications().subscribe({
      next: (data) => {
        if (!data.notifications?.length) return;
        const newClients = data.notifications.filter((n: any) => n.type === 'new_client');
        if (newClients.length) {
          this.notificationService.info(newClients[0].message, 'Nouveau client inscrit');
          this.loadClients();
          this.loadStats();
        }
      },
      error: (err) => console.error('Notifications:', err)
    });
  }

  // ─────────────────────────────────────────
  // FILTRES & RECHERCHE
  // ─────────────────────────────────────────

  onSearch(): void       { this.currentPage = 1; this.loadClients(); }
  onStatutFilter(): void { this.currentPage = 1; this.loadClients(); }
  onOrderingChange(): void { this.currentPage = 1; this.loadClients(); }

  resetFilters(): void {
    this.searchQuery      = '';
    this.selectedStatut   = 'all';
    this.selectedOrdering = '-date_inscription';
    this.currentPage      = 1;
    this.loadClients();
  }

  // ─────────────────────────────────────────
  // ACTIONS CLIENT
  // ─────────────────────────────────────────

  viewClientDetails(client: Client): void {
    this.selectedClient = client;
    this.actionType     = 'details';
    this.showModal      = true;
  }

  toggleClientStatus(client: Client): void {
    this.selectedClient = client;
    this.actionType     = 'toggle';
    this.showModal      = true;
  }

  confirmToggleClient(): void {
    if (!this.selectedClient) return;
    this.clientService.toggleClientActive(this.selectedClient.user).subscribe({
      next: (res) => {
        this.notificationService.success(res.message, 'Succès');
        this.closeModal();
        this.loadClients();
      },
      error: (err) => this.notificationService.error(err.message, 'Erreur')
    });
  }

  deleteClient(client: Client): void {
    this.selectedClient = client;
    this.actionType     = 'delete';
    this.showModal      = true;
  }

  confirmDeleteClient(): void {
    if (!this.selectedClient) return;
    this.clientService.deleteClient(this.selectedClient.user).subscribe({
      next: (res) => {
        this.notificationService.success(res.message, 'Succès');
        this.closeModal();
        this.loadClients();
        this.loadStats();
      },
      error: (err) => this.notificationService.error(err.message, 'Erreur')
    });
  }

  closeModal(): void {
    this.showModal      = false;
    this.selectedClient = null;
    this.actionType     = null;
  }

  // ─────────────────────────────────────────
  // PAGINATION
  // ─────────────────────────────────────────

  get paginatedClients(): Client[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredClients.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────

  formatDate(dateString: string): string {
    return this.clientService.formatDate(dateString);
  }

  formatStatut(statut: string): { label: string; class: string } {
    return this.clientService.formatStatut(statut);
  }

  getInitials(nomComplet: string): string {
    const parts  = nomComplet.trim().split(' ');
    const nom    = parts[0] || '';
    const prenom = parts[1] || '';
    return this.clientService.getInitials(nom, prenom);
  }

  getInStockCount(): number {
    return this.stats?.clients_actifs ?? this.clients.filter(c => c.statut === 'actif').length;
  }

  getInactiveCount(): number {
    return this.stats?.clients_inactifs ?? this.clients.filter(c => c.statut === 'inactif').length;
  }

  refreshData(): void {
    this.loadInitialData();
    this.notificationService.info('Données actualisées', 'Synchronisation');
  }

  trackByClientId(_: number, client: Client): number {
    return client.user;
  }

  getToggleActionText(): string {
    return this.selectedClient?.statut === 'actif' ? 'désactiver' : 'activer';
  }
}