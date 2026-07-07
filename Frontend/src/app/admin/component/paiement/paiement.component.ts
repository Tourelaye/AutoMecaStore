import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {Paiement, PaiementService, PaiementStatus} from './paiement.service';
type StatusFilter = 'tous' | PaiementStatus;
type ModalKind = 'refund' | 'retry' | null;

@Component({
  selector: 'app-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paiement.component.html',
  styleUrls: ['./paiement.component.css']
})
export class PaiementComponent implements OnInit {
  loading = true;
  paiements: Paiement[] = [];
  filtered: Paiement[] = [];

  searchTerm = '';
  statusFilter: StatusFilter = 'tous';

  statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'tous', label: 'Tous les statuts bancaires' },
    { value: 'reussi', label: 'Réussi' },
    { value: 'rembourse', label: 'Remboursé' },
    { value: 'echec', label: 'Échec' }
  ];

  // --- Modale de confirmation (remboursement / réessai) ---
  activeModal: ModalKind = null;
  targetPaiement: Paiement | null = null;
  submitting = false;

  constructor(private paiementService: PaiementService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.paiementService.getAll().subscribe(list => {
      this.paiements = list;
      this.applyFilters();
      this.loading = false;
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.paiements.filter(p => {
      const matchesSearch =
        !term ||
        p.orderRef.toLowerCase().includes(term) ||
        p.client.toLowerCase().includes(term) ||
        p.vendor.toLowerCase().includes(term);
      const matchesStatus = this.statusFilter === 'tous' || p.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  // --- KPIs calculés à partir des données actuelles ---
  get volumeCA(): number {
    return this.paiements
      .filter(p => p.status !== 'echec')
      .reduce((sum, p) => sum + p.netClient, 0);
  }

  get commissionsNet(): number {
    return this.paiements
      .filter(p => p.status !== 'echec')
      .reduce((sum, p) => sum + p.commission, 0);
  }

  get paiementsEchoues(): number {
    return this.paiements.filter(p => p.status === 'echec').length;
  }

  get remboursementsEmis(): number {
    return this.paiements.filter(p => p.status === 'rembourse').length;
  }

  statusLabel(status: PaiementStatus): string {
    return status === 'reussi' ? 'REUSSI' : status === 'rembourse' ? 'REMBOURSE' : 'ECHEC';
  }

  // --- Actions ---
  askRefund(p: Paiement): void {
    this.targetPaiement = p;
    this.activeModal = 'refund';
  }

  askRetry(p: Paiement): void {
    this.targetPaiement = p;
    this.activeModal = 'retry';
  }

  closeModal(): void {
    if (this.submitting) return;
    this.activeModal = null;
    this.targetPaiement = null;
  }

  confirmModal(): void {
    if (!this.targetPaiement) return;
    const id = this.targetPaiement.id;
    this.submitting = true;

    const action$ = this.activeModal === 'refund'
      ? this.paiementService.refund(id)
      : this.paiementService.retry(id);

    action$.subscribe(updated => {
      this.paiements = this.paiements.map(p => (p.id === updated.id ? updated : p));
      this.applyFilters();
      this.submitting = false;
      this.activeModal = null;
      this.targetPaiement = null;
    });
  }

  trackById(_index: number, item: Paiement): string {
    return item.id;
  }
}