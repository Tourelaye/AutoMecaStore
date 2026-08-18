import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Livraison, LivraisonService } from '../../../admin/component/livraison/livraison.service';

@Component({
  selector: 'app-liste-livraisons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './liste-livraisons.component.html',
  styleUrls: ['./liste-livraisons.component.css']
})
export class ListeLivraisonsComponent implements OnInit {
  livraisons: Livraison[] = [];
  filteredLivraisons: Livraison[] = [];
  loading = false;
  error = '';
  searchTerm = '';
  selectedStatut = '';
  statuts = ['Toutes', 'en_attente_attribution', 'livraison_attribuee', 'en_preparation', 'prise_en_charge', 'en_cours_livraison', 'livree', 'echec_livraison', 'annulee'];
  actionEnCours: number | null = null;

  constructor(public livraisonService: LivraisonService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.livraisonService.getFournisseurLivraisons().subscribe({
      next: (list: Livraison[]) => {
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
    this.filteredLivraisons = this.livraisons.filter(livraison => {
      const ref = livraison.commande?.reference || '';
      const client = `${livraison.client?.prenom || ''} ${livraison.client?.nom || ''} ${livraison.client?.email || ''}`.toLowerCase();
      const matchesSearch = !term || ref.toLowerCase().includes(term) || client.includes(term);
      const matchesStatut = this.selectedStatut === '' || this.selectedStatut === 'Toutes' || livraison.statut === this.selectedStatut;
      return matchesSearch && matchesStatut;
    });
  }

  onStatutChange(statut: string): void {
    this.selectedStatut = statut;
    this.applyFilters();
  }

  prendreEnCharge(id: number): void {
    this.actionEnCours = id;
    this.livraisonService.prendreEnCharge(id).subscribe({
      next: (updated: Livraison) => {
        this.updateLocal(updated);
        this.actionEnCours = null;
      },
      error: () => {
        this.error = 'Impossible de prendre en charge la livraison.';
        this.actionEnCours = null;
      }
    });
  }

  avancerStatut(id: number, statut: string): void {
    this.actionEnCours = id;
    this.livraisonService.updateFournisseurStatut(id, statut).subscribe({
      next: (updated: Livraison) => {
        this.updateLocal(updated);
        this.actionEnCours = null;
      },
      error: () => {
        this.error = 'Impossible de mettre à jour le statut.';
        this.actionEnCours = null;
      }
    });
  }

  prochainStatut(statut: string): string | null {
    const flow = ['livraison_attribuee', 'en_preparation', 'prise_en_charge', 'en_cours_livraison', 'livree'];
    const idx = flow.indexOf(statut);
    if (idx === -1 || idx === flow.length - 1) return null;
    return flow[idx + 1];
  }

  private updateLocal(updated: Livraison): void {
    this.livraisons = this.livraisons.map(l => (l.id === updated.id ? updated : l));
    this.applyFilters();
  }

  getStatutClass(statut: string | undefined): string {
    switch (statut) {
      case 'livree': return 'badge-success';
      case 'en_cours_livraison':
      case 'prise_en_charge': return 'badge-primary';
      case 'livraison_attribuee':
      case 'en_preparation': return 'badge-info';
      case 'echec_livraison':
      case 'annulee': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getStatutLabel(statut: string | undefined): string {
    return this.livraisonService.getStatutLabel(statut);
  }
}
