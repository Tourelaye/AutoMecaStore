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
  clients: Client[] = [];
  filteredClients: Client[] = [];
  stats: ClientStats | null = null;
  
  // État du composant
  isLoading = false;
  error: string | null = null;
  
  // Filtres et recherche
  searchQuery = '';
  selectedStatut: 'all' | 'actif' | 'inactif' = 'all';
  selectedOrdering = '-date_inscription';
  
  // Modal et actions
  showModal = false;
  selectedClient: Client | null = null;
  actionType: 'details' | 'toggle' | 'delete' | null = null;
  
  // Synchronisation temps réel
  private syncSubscription: Subscription | null = null;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  constructor(
    private clientService: ClientService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.startRealTimeSync();
  }

  ngOnDestroy(): void {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
  }

  // =========================
  // CHARGEMENT DES DONNÉES
  // =========================
  private loadInitialData(): void {
    this.isLoading = true;
    this.error = null;
    
    // Charger les clients et les stats en parallèle
    this.loadClients();
    this.loadStats();
  }

  private loadClients(): void {
    const filters: ClientFilters = {
      search: this.searchQuery || undefined,
      statut: this.selectedStatut === 'all' ? undefined : this.selectedStatut,
      ordering: this.selectedOrdering
    };

    this.clientService.getClients(filters).subscribe({
      next: (clients) => {
        this.clients = clients;
        this.filteredClients = clients;
        this.totalItems = clients.length;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.isLoading = false;
        this.notificationService.error('Impossible de charger les clients', 'Erreur');
      }
    });
  }

  private loadStats(): void {
    this.clientService.getClientStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des stats:', err);
      }
    });
  }

  // =========================
  // SYNCHRONISATION TEMPS RÉEL
  // =========================
  private startRealTimeSync(): void {
    // Synchronisation toutes les 30 secondes
    this.syncSubscription = interval(30000).subscribe(() => {
      this.loadClients();
      this.loadStats();
      this.checkNotifications(); // Vérifier les nouvelles notifications
    });
    
    // Vérifier les notifications au démarrage
    this.checkNotifications();
  }

  private checkNotifications(): void {
    this.clientService.getAdminNotifications().subscribe({
      next: (data) => {
        if (data.notifications && data.notifications.length > 0) {
          // Traiter les notifications de nouveaux clients
          const newClientNotifications = data.notifications.filter(
            (notif: any) => notif.type === 'new_client'
          );
          
          if (newClientNotifications.length > 0) {
            // Notifier l'admin des nouveaux clients
            const latestNotification = newClientNotifications[0];
            this.notificationService.info(
              latestNotification.message,
              'Nouveau client inscrit'
            );
            
            // Recharger la liste des clients
            this.loadClients();
            this.loadStats();
          }
        }
      },
      error: (err) => {
        console.error('Erreur lors de la vérification des notifications:', err);
      }
    });
  }

  // =========================
  // FILTRES ET RECHERCHE
  // =========================
  onSearch(): void {
    this.currentPage = 1;
    this.loadClients();
  }

  onStatutFilter(): void {
    this.currentPage = 1;
    this.loadClients();
  }

  onOrderingChange(): void {
    this.currentPage = 1;
    this.loadClients();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatut = 'all';
    this.selectedOrdering = '-date_inscription';
    this.currentPage = 1;
    this.loadClients();
  }

  // =========================
  // ACTIONS SUR LES CLIENTS
  // =========================
  viewClientDetails(client: Client): void {
    this.selectedClient = client;
    this.actionType = 'details';
    this.showModal = true;
  }

  toggleClientStatus(client: Client): void {
    this.selectedClient = client;
    this.actionType = 'toggle';
    this.showModal = true;
  }

  confirmToggleClient(): void {
    if (!this.selectedClient) return;

    this.clientService.toggleClientActive(this.selectedClient.user).subscribe({
      next: (response) => {
        this.notificationService.success(response.message, 'Succès');
        this.showModal = false;
        this.selectedClient = null;
        this.loadClients(); // Recharger pour voir les changements
      },
      error: (err) => {
        this.notificationService.error(err.message, 'Erreur');
      }
    });
  }

  deleteClient(client: Client): void {
    this.selectedClient = client;
    this.actionType = 'delete';
    this.showModal = true;
  }

  confirmDeleteClient(): void {
    if (!this.selectedClient) return;

    this.clientService.deleteClient(this.selectedClient.user).subscribe({
      next: (response) => {
        this.notificationService.success(response.message, 'Succès');
        this.showModal = false;
        this.selectedClient = null;
        this.loadClients(); // Recharger pour voir les changements
        this.loadStats(); // Recharger les stats
      },
      error: (err) => {
        this.notificationService.error(err.message, 'Erreur');
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedClient = null;
    this.actionType = null;
  }

  // =========================
  // UTILITAIRES
  // =========================
  formatDate(dateString: string): string {
    return this.clientService.formatDate(dateString);
  }

  formatStatut(statut: string): {label: string; class: string} {
    return this.clientService.formatStatut(statut);
  }

  getInitials(nomComplet: string): string {
    const parts = nomComplet.split(' ');
    const nom = parts[0] || '';
    const prenom = parts[1] || '';
    return this.clientService.getInitials(nom, prenom);
  }

  // Pagination
  get paginatedClients(): Client[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredClients.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Refresh manuel
  refreshData(): void {
    this.loadInitialData();
    this.notificationService.info('Données actualisées', 'Synchronisation');
  }

  // Optimisation du rendu
  trackByClientId(index: number, client: Client): number {
    return client.user;
  }
}
