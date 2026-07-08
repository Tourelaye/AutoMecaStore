import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Livraison, LivraisonService, LivraisonStatus } from './livraison.service';

type StatusFilter = 'tous' | LivraisonStatus;

@Component({
  selector: 'app-livraison',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './livraison.component.html',
  styleUrls: ['./livraison.component.css']
})
export class LivraisonComponent implements OnInit {
  loading = true;
  livraisons: Livraison[] = [];
  filtered: Livraison[] = [];

  searchTerm = '';
  statusFilter: StatusFilter = 'tous';

  statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'tous', label: 'Tous les états logistiques' },
    { value: 'livre', label: 'Livré' },
    { value: 'en_transit', label: 'En transit' },
    { value: 'incident', label: 'Incident' }
  ];

  // --- Modale de résolution d'incident ---
  showIncidentModal = false;
  targetLivraison: Livraison | null = null;
  noteInput = '';
  submitting = false;

  constructor(private livraisonService: LivraisonService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.livraisonService.getAll().subscribe((list: Livraison[]) => {
      this.livraisons = list;
      this.applyFilters();
      this.loading = false;
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.livraisons.filter(l => {
      const matchesSearch =
        !term ||
        l.orderRef.toLowerCase().includes(term) ||
        l.carrier.toLowerCase().includes(term) ||
        l.client.toLowerCase().includes(term) ||
        l.vendor.toLowerCase().includes(term);
      const matchesStatus = this.statusFilter === 'tous' || l.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  // --- KPIs ---
  get livreesTerminees(): number {
    return this.livraisons.filter(l => l.status === 'livre').length;
  }

  get enTransitActifs(): number {
    return this.livraisons.filter(l => l.status === 'en_transit').length;
  }

  get retardsConstates(): number {
    return this.livraisons.filter(l => l.status === 'incident').length;
  }

  statusLabel(status: LivraisonStatus): string {
    return status === 'livre' ? 'COLIS LIVRÉ' : status === 'en_transit' ? 'EN TRANSIT' : 'BLOCAGE INCIDENT';
  }

  openTracking(l: Livraison): void {
    window.open(this.livraisonService.trackingUrl(l), '_blank', 'noopener');
  }

  askResolve(l: Livraison): void {
    this.targetLivraison = l;
    this.noteInput = '';
    this.showIncidentModal = true;
  }

  closeModal(): void {
    if (this.submitting) return;
    this.showIncidentModal = false;
    this.targetLivraison = null;
  }

  confirmResolve(): void {
    if (!this.targetLivraison) return;
    const note = this.noteInput.trim();
    if (!note) return;
    this.submitting = true;
    this.livraisonService.resolveIncident(this.targetLivraison.id, note).subscribe((updated: Livraison) => {
      this.livraisons = this.livraisons.map(l => (l.id === updated.id ? updated : l));
      this.applyFilters();
      this.submitting = false;
      this.showIncidentModal = false;
      this.targetLivraison = null;
    });
  }

  trackById(_index: number, item: Livraison): string {
    return item.id;
  }
}