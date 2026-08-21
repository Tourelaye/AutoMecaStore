import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { AdminCommandeService } from '../../../core/services/admin-commande.service';
import {
  AdminCommande,
  AdminCommandeDetail,
  StatistiquesCommande,
  AlerteCommande,
  FiltresCommande
} from '../../../models/admin-commande.model';
import { Subscription } from 'rxjs';

interface StatusConfig {
  value: string;
  label: string;
  color: string;
  icon: string;
}

interface TimelineItem {
  statut?: string;
  label: string;
  icon: string;
  date?: string;
  utilisateur?: string;
  commentaire?: string;
  completed: boolean;
  active: boolean;
  isNote?: boolean;
}

@Component({
  selector: 'app-commande-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  templateUrl: './commande-admin.component.html',
  styleUrls: ['./commande-admin.component.css']
})
export class CommandeAdminComponent implements OnInit, OnDestroy {
  commandes: AdminCommande[] = [];
  commandesFiltrees: AdminCommande[] = [];
  loading = false;
  error: string | null = null;
  searchTerm = '';
  searchFocused = false;

  stats: StatistiquesCommande | null = null;
  alertes: AlerteCommande[] = [];

  selectedCommande: AdminCommandeDetail | null = null;
  showDetail = false;
  detailLoading = false;
  detailTab = 0;

  tabs = [
    { key: 'infos', label: 'Informations', icon: 'bi-info-circle' },
    { key: 'articles', label: 'Articles', icon: 'bi-box-seam' },
    { key: 'livraison', label: 'Livraison', icon: 'bi-truck' },
    { key: 'historique', label: 'Historique', icon: 'bi-clock-history' },
    { key: 'reclamations', label: 'Réclamations', icon: 'bi-shield-exclamation' }
  ];

  activeModal: 'contact_fournisseur' | 'contact_client' | 'note' | 'intervention' | 'exception_status' | null = null;
  modalTitle = '';
  modalMessage = '';
  modalMotif = '';
  modalStatut = '';
  modalCommande: AdminCommande | null = null;

  notification: { message: string; type: 'success' | 'error' | 'info' } | null = null;

  private pollingSubscription: Subscription | null = null;
  private readonly POLLING_INTERVAL = 30000;

  filtres: FiltresCommande = {};

  statutsPossibles: StatusConfig[] = [
    { value: 'nouvelle_commande', label: 'Nouvelle', color: 'orange', icon: 'bi-cart-plus' },
    { value: 'en_attente_confirmation', label: 'En attente', color: 'amber', icon: 'bi-clock' },
    { value: 'acceptee', label: 'Acceptée', color: 'blue', icon: 'bi-check-circle' },
    { value: 'en_preparation', label: 'Préparation', color: 'indigo', icon: 'bi-gear' },
    { value: 'prete_a_retirer', label: 'Prête', color: 'purple', icon: 'bi-bag-check' },
    { value: 'en_cours_livraison', label: 'En livraison', color: 'cyan', icon: 'bi-truck' },
    { value: 'livree', label: 'Livrée', color: 'teal', icon: 'bi-box-seam' },
    { value: 'terminee', label: 'Terminée', color: 'green', icon: 'bi-check2-circle' },
    { value: 'refusee', label: 'Refusée', color: 'red', icon: 'bi-x-octagon' },
    { value: 'annulee', label: 'Annulée', color: 'red', icon: 'bi-x-circle' }
  ];

  periodes = [
    { value: '', label: 'Toutes' },
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'livrees', label: 'Livrées' },
    { value: 'preparation', label: 'En préparation' },
    { value: 'annulees', label: 'Annulées' }
  ];

  modesPaiement = [
    { value: '', label: 'Tous' },
    { value: 'especes', label: 'Espèces' },
    { value: 'carte', label: 'Carte bancaire' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'virement', label: 'Virement' },
    { value: 'a_la_livraison', label: 'À la livraison' }
  ];

  modesReception = [
    { value: '', label: 'Tous' },
    { value: 'livraison', label: 'Livraison' },
    { value: 'retrait_magasin', label: 'Retrait magasin' }
  ];

  constructor(private adminCommandeService: AdminCommandeService) { }

  ngOnInit(): void {
    this.loadAll();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadAll(): void {
    this.loadStats();
    this.loadAlertes();
    this.loadCommandes();
  }

  loadCommandes(): void {
    this.loading = true;
    this.error = null;
    this.adminCommandeService.getCommandes(this.filtres).subscribe({
      next: (commandes) => {
        this.commandes = commandes;
        this.applyClientSearch();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Impossible de charger les commandes.';
        this.loading = false;
        this.showNotification('Erreur lors du chargement des commandes', 'error');
      }
    });
  }

  loadStats(): void {
    this.adminCommandeService.getStats().subscribe({
      next: (stats) => this.stats = stats,
      error: () => { }
    });
  }

  loadAlertes(): void {
    this.adminCommandeService.getAlertes().subscribe({
      next: (alertes) => this.alertes = alertes,
      error: () => { }
    });
  }

  startPolling(): void {
    this.pollingSubscription = new Subscription();
    const timer = setInterval(() => this.loadAll(), this.POLLING_INTERVAL);
    this.pollingSubscription.add(() => clearInterval(timer));
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  applyClientSearch(): void {
    let filtered = [...this.commandes];
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.reference?.toLowerCase().includes(term) ||
        c.client?.prenom?.toLowerCase().includes(term) ||
        c.client?.nom?.toLowerCase().includes(term) ||
        c.client?.telephone?.toLowerCase().includes(term) ||
        c.magasins?.some(m => m.toLowerCase().includes(term))
      );
    }
    this.commandesFiltrees = filtered;
  }

  searchCommandes(): void {
    this.applyClientSearch();
  }

  onFiltreChange(): void {
    this.loadCommandes();
  }

  resetFilters(): void {
    this.filtres = {};
    this.searchTerm = '';
    this.loadCommandes();
  }

  setPeriode(value: string): void {
    this.filtres.periode = (value || undefined) as any;
    this.loadCommandes();
  }

  getStatutConfig(statut: string): StatusConfig | undefined {
    return this.statutsPossibles.find(s => s.value === statut);
  }

  getStatutClass(statut: string): string {
    return 'status-' + (this.getStatutConfig(statut)?.color || 'gray');
  }

  getStatutLabel(statut: string): string {
    return this.getStatutConfig(statut)?.label || statut;
  }

  getStatutIcon(statut: string): string {
    return this.getStatutConfig(statut)?.icon || 'bi-question-circle';
  }

  getPaiementLabel(mode: string): string {
    const map: { [k: string]: string } = {
      especes: 'Espèces',
      carte: 'Carte bancaire',
      mobile_money: 'Mobile Money',
      virement: 'Virement',
      a_la_livraison: 'À la livraison'
    };
    return map[mode] || mode;
  }

  getReceptionLabel(mode: string): string {
    const map: { [k: string]: string } = { livraison: 'Livraison', retrait_magasin: 'Retrait magasin' };
    return map[mode] || mode;
  }

  getClientFullName(client?: { nom?: string; prenom?: string }): string {
    if (!client) return 'Client inconnu';
    return `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Client inconnu';
  }

  getClientInitials(client?: { nom?: string; prenom?: string }): string {
    if (!client) return '?';
    const p = (client.prenom || '').slice(0, 1).toUpperCase();
    const n = (client.nom || '').slice(0, 1).toUpperCase();
    return p + n || '?';
  }

  formatDate(dateString?: string, withTime = true): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = withTime
        ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' };
      return date.toLocaleDateString('fr-FR', options);
    } catch {
      return dateString;
    }
  }

  formatMontant(montant?: number): string {
    if (montant === undefined || montant === null) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);
  }

  getProduitImageUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://127.0.0.1:8000${url.startsWith('/') ? '' : '/'}${url}`;
  }

  getTotalMontant(): number {
    return this.commandesFiltrees.reduce((sum, c) => sum + (c.montant_total || 0), 0);
  }

  openDetailById(id: number): void {
    const commande = this.commandes.find(c => c.id === id);
    if (commande) {
      this.openDetail(commande);
    }
  }

  openDetail(commande: AdminCommande): void {
    this.detailLoading = true;
    this.showDetail = true;
    this.detailTab = 0;
    this.selectedCommande = null;
    this.adminCommandeService.getCommande(commande.id).subscribe({
      next: (detail) => {
        this.selectedCommande = detail;
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
        this.showNotification('Erreur lors du chargement du détail', 'error');
      }
    });
  }

  closeDetail(): void {
    this.showDetail = false;
    this.selectedCommande = null;
  }

  getTimeline(): TimelineItem[] {
    const steps = [
      { statut: 'nouvelle_commande', label: 'Commande créée', icon: 'bi-cart-plus' },
      { statut: 'en_attente_confirmation', label: 'En attente confirmation', icon: 'bi-clock' },
      { statut: 'acceptee', label: 'Acceptée', icon: 'bi-check-circle' },
      { statut: 'en_preparation', label: 'Préparation', icon: 'bi-gear' },
      { statut: 'prete_a_retirer', label: 'Prête à retirer', icon: 'bi-bag-check' },
      { statut: 'en_cours_livraison', label: 'En livraison', icon: 'bi-truck' },
      { statut: 'livree', label: 'Livrée', icon: 'bi-box-seam' },
      { statut: 'terminee', label: 'Terminée', icon: 'bi-check2-circle' }
    ];

    const current = this.selectedCommande?.statut;
    const items: TimelineItem[] = [];

    for (const step of steps) {
      const hist = this.selectedCommande?.historique.find(h => h.statut === step.statut);
      const completed = !!hist || (!!current && this.isStatusAfter(step.statut as string, current as string));
      const active = current === step.statut;
      items.push({
        statut: step.statut,
        label: step.label,
        icon: step.icon,
        date: hist ? this.formatDate(hist.date) : undefined,
        utilisateur: hist ? hist.utilisateur : undefined,
        completed,
        active
      });
    }

    if (current === 'annulee' || current === 'refusee') {
      const hist = this.selectedCommande?.historique.find(h => h.statut === current);
      items.push({
        statut: current,
        label: current === 'annulee' ? 'Annulée' : 'Refusée',
        icon: 'bi-x-circle',
        date: hist ? this.formatDate(hist.date) : undefined,
        utilisateur: hist ? hist.utilisateur : undefined,
        completed: true,
        active: true
      });
    }

    if (this.selectedCommande?.historique) {
      for (const h of this.selectedCommande.historique) {
        if (!h.statut && h.commentaire) {
          items.push({
            label: h.commentaire,
            icon: 'bi-journal-text',
            date: this.formatDate(h.date),
            utilisateur: h.utilisateur,
            completed: true,
            active: false,
            isNote: true
          });
        }
      }
    }

    return items;
  }

  isStatusAfter(status: string, current: string): boolean {
    const order = this.statutsPossibles.map(s => s.value);
    const si = order.indexOf(status);
    const ci = order.indexOf(current);
    if (si === -1 || ci === -1) return false;
    return si < ci;
  }

  openActionModal(action: 'contact_fournisseur' | 'contact_client' | 'note' | 'intervention' | 'exception_status', commande: AdminCommande): void {
    this.modalCommande = commande;
    this.activeModal = action;
    this.modalMessage = '';
    this.modalMotif = '';
    this.modalStatut = commande.statut;

    const titles: { [k: string]: string } = {
      contact_fournisseur: 'Contacter le fournisseur',
      contact_client: 'Contacter le client',
      note: 'Ajouter une note interne',
      intervention: 'Créer une intervention',
      exception_status: 'Procédure exceptionnelle'
    };
    this.modalTitle = titles[action];
  }

  closeActionModal(): void {
    this.activeModal = null;
    this.modalCommande = null;
    this.modalMessage = '';
    this.modalMotif = '';
  }

  submitAction(): void {
    if (!this.modalCommande || !this.activeModal) return;

    const payload: any = { action: this.activeModal };
    if (this.activeModal === 'exception_status') {
      payload.statut = this.modalStatut;
      payload.motif = this.modalMotif;
    } else {
      payload.message = this.modalMessage;
    }

    this.adminCommandeService.actionCommande(this.modalCommande.id, payload).subscribe({
      next: (res) => {
        this.showNotification(res.message, 'success');
        this.closeActionModal();
        this.loadAll();
        if (this.showDetail && this.selectedCommande && this.modalCommande) {
          this.openDetail(this.modalCommande);
        }
      },
      error: () => this.showNotification('Erreur lors de l\'action', 'error')
    });
  }

  exportCSV(): void {
    this.adminCommandeService.exportCSV(this.filtres).subscribe({
      next: (blob) => this.downloadBlob(blob, 'commandes.csv'),
      error: () => this.showNotification('Erreur export CSV', 'error')
    });
  }

  exportPDF(): void {
    this.adminCommandeService.exportPDF(this.filtres).subscribe({
      next: (html) => {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
          setTimeout(() => win.print(), 300);
        }
      },
      error: () => this.showNotification('Erreur export PDF', 'error')
    });
  }

  printDetail(): void {
    window.print();
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  getAlertClass(type: string): string {
    switch (type) {
      case 'bloquee': return 'alert-red';
      case 'retard': return 'alert-amber';
      case 'annulee': return 'alert-red';
      case 'paiement': return 'alert-blue';
      case 'litige': return 'alert-red';
      default: return 'alert-gray';
    }
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'bloquee': return 'bi-exclamation-diamond';
      case 'retard': return 'bi-clock-history';
      case 'annulee': return 'bi-x-circle';
      case 'paiement': return 'bi-cash-coin';
      case 'litige': return 'bi-shield-exclamation';
      default: return 'bi-info-circle';
    }
  }

  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.notification = { message, type };
    setTimeout(() => this.notification = null, 4000);
  }

  trackByCommandeId(index: number, commande: AdminCommande): number {
    return commande.id;
  }
}
