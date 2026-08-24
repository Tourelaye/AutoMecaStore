import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Livraison, LivraisonService } from './livraison.service';

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
  error = '';

  searchTerm = '';
  statusFilter = 'tous';

  statuts = ['en_attente_attribution', 'livraison_attribuee', 'en_preparation', 'prise_en_charge', 'en_cours_livraison', 'livree', 'echec_livraison', 'annulee'];

  statusOptions: { value: string; label: string }[] = [];

  actionEnCours: number | null = null;
  nouveauStatut: Record<number, string> = {};

  constructor(public livraisonService: LivraisonService) {
    this.statusOptions = [
      { value: 'tous', label: 'Tous les statuts' },
      ...this.statuts.map(s => ({ value: s, label: this.livraisonService.getStatutLabel(s) }))
    ];
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.livraisonService.getAdminLivraisons().subscribe({
      next: (list) => {
        this.livraisons = list;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les livraisons.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.livraisons.filter(l => {
      const ref = (l.commande?.reference || '').toLowerCase();
      const client = `${l.client?.prenom || ''} ${l.client?.nom || ''} ${l.client?.email || ''}`.toLowerCase();
      const magasin = (l.magasin?.nom_magasin || '').toLowerCase();
      const matchesSearch = !term || ref.includes(term) || client.includes(term) || magasin.includes(term);
      const matchesStatus = this.statusFilter === 'tous' || l.statut === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  get livreesTerminees(): number {
    return this.livraisons.filter(l => l.statut === 'livree').length;
  }

  get enCours(): number {
    return this.livraisons.filter(l => ['livraison_attribuee', 'en_preparation', 'prise_en_charge', 'en_cours_livraison'].includes(l.statut)).length;
  }

  get enAttente(): number {
    return this.livraisons.filter(l => l.statut === 'en_attente_attribution').length;
  }

  updateStatut(id: number): void {
    const statut = this.nouveauStatut[id];
    if (!statut) return;
    this.actionEnCours = id;
    this.livraisonService.updateAdminStatut(id, statut).subscribe({
      next: (updated) => {
        this.updateLocal(updated);
        this.actionEnCours = null;
        this.nouveauStatut[id] = '';
      },
      error: () => {
        this.error = 'Impossible de mettre à jour le statut.';
        this.actionEnCours = null;
      }
    });
  }

  private updateLocal(updated: Livraison): void {
    this.livraisons = this.livraisons.map(l => (l.id === updated.id ? updated : l));
    this.applyFilters();
  }

  trackById(_index: number, item: Livraison): number {
    return item.id;
  }
}