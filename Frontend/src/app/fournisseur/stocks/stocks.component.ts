import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockService, StockItem as ApiStockItem } from '../services/stock.service';

type StatutStock = 'normal' | 'faible' | 'rupture';
type FiltreStock = 'tous' | 'faible' | 'rupture';

interface StockItem {
  id: number;
  nom: string;
  categorie: string;
  reference: string;
  image?: string;
  stockActuel: number;
  seuilCritique: number;
  statut: StatutStock;
}

@Component({
  selector: 'app-stock-fournisseur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stocks.component.html',
  styleUrls: ['./stocks.component.css']
})
export class StockComponent implements OnInit {

  isLoading = false;

  stockItems: StockItem[] = [];
  filteredStock: StockItem[] = [];

  constructor(private stockService: StockService) {}

  searchTerm = '';
  selectedFilter: FiltreStock = 'tous';

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  ngOnInit(): void {
    this.chargerStock();
  }

  // =============================================
  // CHARGEMENT DES DONNÉES
  // =============================================
  chargerStock(): void {
    this.isLoading = true;

    this.stockService.getStocks().subscribe({
      next: (stocks: ApiStockItem[]) => {
        this.stockItems = stocks.map(s => ({
          id: s.id,
          nom: s.nom,
          categorie: 'Non spécifié',
          reference: s.reference,
          image: s.image || undefined,
          stockActuel: s.stock,
          seuilCritique: 5,
          statut: s.statut === 'ok' ? 'normal' : s.statut
        }));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.showToast('Erreur lors du chargement du stock', 'error');
        this.isLoading = false;
      }
    });
  }

  // =============================================
  // COMPTEURS (utilisés dans le header et les tabs)
  // =============================================
  get totalCount(): number {
    return this.stockItems.length;
  }

  get faibleCount(): number {
    return this.stockItems.filter(i => i.statut === 'faible').length;
  }

  get ruptureCount(): number {
    return this.stockItems.filter(i => i.statut === 'rupture').length;
  }

  // =============================================
  // FILTRES
  // =============================================
  selectFilter(filtre: FiltreStock): void {
    this.selectedFilter = filtre;
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.stockItems];

    if (this.selectedFilter !== 'tous') {
      result = result.filter(i => i.statut === this.selectedFilter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(i =>
        i.nom.toLowerCase().includes(term) ||
        i.reference.toLowerCase().includes(term)
      );
    }

    this.filteredStock = result;
  }

  // =============================================
  // RÉASSORT
  // =============================================
  reapprovisionner(item: StockItem, quantite: number): void {
    const nouvelleQuantite = item.stockActuel + quantite;
    this.stockService.updateStock(item.id, nouvelleQuantite).subscribe({
      next: () => {
        item.stockActuel = nouvelleQuantite;
        this.recalculerStatut(item);
        this.applyFilters();
        this.showToast(`+${quantite} unités ajoutées à "${item.nom}"`, 'success');
      },
      error: () => {
        this.showToast('Impossible de mettre à jour le stock', 'error');
      }
    });
  }

  ouvrirReappro(item: StockItem): void {
    // TODO: ouvrir un modal de réapprovisionnement manuel (quantité personnalisée)
    // Placeholder simple en attendant le modal :
    const quantite = window.prompt(`Quantité à ajouter pour "${item.nom}" :`, '10');
    if (quantite && !isNaN(+quantite) && +quantite > 0) {
      this.reapprovisionner(item, +quantite);
    }
  }

  private recalculerStatut(item: StockItem): void {
    if (item.stockActuel === 0) {
      item.statut = 'rupture';
    } else if (item.stockActuel <= item.seuilCritique) {
      item.statut = 'faible';
    } else {
      item.statut = 'normal';
    }
  }

  // =============================================
  // UTILITAIRES
  // =============================================
  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg;
    this.toastType = type;

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMsg = '';
    }, 3000);
  }
}