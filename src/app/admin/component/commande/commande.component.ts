import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { CommandeService, CommandeUpdate } from '../../../core/services/commande.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { Commande } from '../../../models/commande.model';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-commande',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './commande.component.html',
  styleUrls: ['./commande.component.css']
})
export class CommandeComponent implements OnInit, OnDestroy {
  commandes: Commande[] = [];
  commandesFiltrees: Commande[] = [];
  showModal = false;
  loading = false;
  error: string | null = null;
  searchTerm = '';
  notification: { message: string; type: 'success' | 'error' | 'info' } | null = null;
  searchFocused = false;
  activeFilter = 'all';
  updatingId: number | null = null;
  
  // Pour le polling (vérification des nouvelles commandes)
  private pollingSubscription: Subscription | null = null;
  private lastCommandeCount = 0;
  readonly POLLING_INTERVAL = 10000; // 10 secondes

  // Statuts possibles
  statutsPossibles = [
    { value: 'en_attente', label: 'En attente', color: 'orange' },
    { value: 'validee', label: 'Validée', color: 'blue' },
    { value: 'expediee', label: 'Expédiée', color: 'green' },
    { value: 'livree', label: 'Livrée', color: 'green' },
    { value: 'annulee', label: 'Annulée', color: 'red' }
  ];

  constructor(
    private commandeService: CommandeService,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit(): void {
    this.loadCommandes();
    this.startPolling();
    
    // 🔄 Marquer les commandes comme lues quand on accède à la page
    this.notificationsService.markCommandesAsRead();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // 🔄 Charger les commandes depuis l'API
  loadCommandes(): void {
    this.loading = true;
    this.error = null;
    
    this.commandeService.getCommandes().subscribe({
      next: (commandes) => {
        console.log('Commandes chargées:', commandes);
        this.commandes = commandes;
        this.commandesFiltrees = [...commandes];
        
        // 🔄 Calculer le nombre de commandes en attente pour le compteur du sidebar
        const commandesEnAttente = commandes.filter(c => c.statut === 'en_attente').length;
        this.notificationsService.updateCommandesCount(commandesEnAttente);
        
        // Vérifier si de nouvelles commandes sont apparues
        if (this.lastCommandeCount > 0 && commandes.length > this.lastCommandeCount) {
          const nouvellesCommandes = commandes.length - this.lastCommandeCount;
          this.showNotification(
            `🎉 ${nouvellesCommandes} nouvelle${nouvellesCommandes > 1 ? 's' : ''} commande${nouvellesCommandes > 1 ? 's' : ''} reçue${nouvellesCommandes > 1 ? 's' : ''} !`,
            'info'
          );
          this.playNotificationSound();
          
          // 🔄 Ajouter les nouvelles commandes au compteur du sidebar
          this.notificationsService.addNewCommande();
        }
        
        this.lastCommandeCount = commandes.length;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des commandes:', err);
        this.error = 'Impossible de charger les commandes. Veuillez réessayer.';
        this.loading = false;
        this.showNotification('Erreur lors du chargement des commandes', 'error');
      }
    });
  }

  // 🔄 Démarrer le polling pour les nouvelles commandes
  startPolling(): void {
    this.pollingSubscription = interval(this.POLLING_INTERVAL).subscribe(() => {
      this.loadCommandes();
    });
  }

  // ⏹️ Arrêter le polling
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  // 🔄 Mettre à jour le statut d'une commande
  updateStatutCommande(commande: Commande, nouveauStatut: string): void {
    this.updatingId = commande.id;
    // Arrêter temporairement le polling pour éviter les conflits
    this.stopPolling();

    const updateData: CommandeUpdate = { statut: nouveauStatut };

    this.commandeService.updateCommande(commande.id, updateData).subscribe({
      next: (updatedCommande) => {
        console.log('Statut mis à jour:', updatedCommande);

        // Mettre à jour la commande dans la liste
        const index = this.commandes.findIndex(c => c.id === commande.id);
        if (index !== -1) {
          this.commandes[index] = updatedCommande;
          this.applyFilters();
        }

        this.showNotification(`Statut de la commande ${commande.reference} mis à jour`, 'success');
        this.loading = false;
        this.updatingId = null;

        // Redémarrer le polling après la mise à jour
        this.startPolling();
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du statut:', err);
        this.showNotification('Erreur lors de la mise à jour du statut', 'error');
        this.loading = false;
        this.updatingId = null;

        // Redémarrer le polling même en cas d'erreur
        this.startPolling();
      }
    });
  }

  // 🔍 Filtrer les commandes
  applyFilters(): void {
    let filtered = [...this.commandes];

    // Apply status filter
    if (this.activeFilter !== 'all') {
      filtered = filtered.filter(c => c.statut === this.activeFilter);
    }

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(commande =>
        commande.reference?.toLowerCase().includes(term) ||
        commande.id.toString().includes(term) ||
        commande.montant_total?.toString().includes(term)
      );
    }

    this.commandesFiltrees = filtered;
  }

  // 🔍 Recherche
  searchCommandes(): void {
    this.applyFilters();
  }

  // 🏷️ Définir le filtre actif
  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  // 🏷️ Obtenir le libellé du filtre
  getFilterLabel(filter: string): string {
    const filterMap: { [key: string]: string } = {
      'all': 'Toutes',
      'en_attente': 'En attente',
      'validee': 'Validées',
      'expediee': 'Expédiées',
      'livree': 'Livrées',
      'annulee': 'Annulées'
    };
    return filterMap[filter] || filter;
  }

  // 🔢 Obtenir le nombre de commandes pour un filtre
  getFilterCount(filter: string): number {
    return this.commandes.filter(c => c.statut === filter).length;
  }

  // 👤 Obtenir les initiales du client
  getClientInitials(clientId: number | undefined): string {
    if (!clientId) return '?';
    return `C${clientId}`;
  }

  // 💰 Obtenir le montant total des commandes filtrées
  getTotalMontant(): string {
    const total = this.commandesFiltrees.reduce((sum, c) => sum + (c.montant_total || 0), 0);
    return this.formatMontant(total);
  }

  // 📢 Afficher une notification
  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.notification = { message, type };
    setTimeout(() => this.notification = null, 5000);
  }

  // 🔊 Jouer un son de notification (optionnel)
  playNotificationSound(): void {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGH0fPTgjMGHm7A7+OZURE');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignorer les erreurs de lecture audio
      });
    } catch (error) {
      // Ignorer les erreurs audio
    }
  }

  // 🎨 Obtenir la classe CSS pour le statut
  getStatutClass(statut: string): string {
    const statutMap: { [key: string]: string } = {
      'en_attente': 'status-orange',
      'validee': 'status-blue',
      'expediee': 'status-green',
      'livree': 'status-green',
      'annulee': 'status-red'
    };
    return statutMap[statut] || 'status-gray';
  }

  // 🏷️ Obtenir le libellé du statut
  getStatutLabel(statut: string): string {
    const statutTrouve = this.statutsPossibles.find(s => s.value === statut);
    return statutTrouve?.label || statut;
  }

  // 🎨 Obtenir la couleur du statut
  getStatutColor(statut: string): string {
    const statutTrouve = this.statutsPossibles.find(s => s.value === statut);
    return statutTrouve?.color || 'gray';
  }

  // 📅 Formater la date
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  // 💰 Formater le montant
  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(montant);
  }

  // 🔄 Rafraîchir manuellement
  refreshCommandes(): void {
    this.loadCommandes();
    this.showNotification('Liste des commandes actualisée', 'info');
  }

  // 📊 Obtenir les statistiques
  getStats(): { total: number; enAttente: number; validees: number; expediees: number } {
    return {
      total: this.commandes.length,
      enAttente: this.commandes.filter(c => c.statut === 'en_attente').length,
      validees: this.commandes.filter(c => c.statut === 'validee').length,
      expediees: this.commandes.filter(c => c.statut === 'expediee' || c.statut === 'livree').length
    };
  }

  // 🎨 Obtenir l'icône du statut
  getStatutIcon(statut: string): string {
    const iconMap: { [key: string]: string } = {
      'en_attente': 'bi-clock',
      'validee': 'bi-check-circle',
      'expediee': 'bi-truck',
      'livree': 'bi-check2-circle',
      'annulee': 'bi-x-circle'
    };
    return iconMap[statut] || 'bi-question-circle';
  }

  // 🏷️ TrackBy function pour optimiser le ngFor
  trackByCommandeId(index: number, commande: Commande): number {
    return commande.id;
  }
}
