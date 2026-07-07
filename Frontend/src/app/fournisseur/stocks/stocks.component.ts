import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

    // TODO: remplacer par un appel à ton service (ex: this.stockService.getStock())
    setTimeout(() => {
      this.stockItems = [
        {
          id: 1,
          nom: 'Jeu de 4 Plaquettes de Frein Brembo Sport',
          categorie: 'Automobile',
          reference: 'REF-BRM-P85020',
          image: '',
          stockActuel: 24,
          seuilCritique: 5,
          statut: 'normal'
        },
        {
          id: 2,
          nom: 'Filtre à Huile Moteur Bosch Premium',
          categorie: 'Automobile',
          reference: 'REF-BSH-0451103079',
          image: '',
          stockActuel: 3,
          seuilCritique: 10,
          statut: 'faible'
        },
        {
          id: 3,
          nom: 'Amortisseur Avant Gaz Sachs (Unité)',
          categorie: 'Automobile',
          reference: 'REF-SCH-314718',
          image: '',
          stockActuel: 0,
          seuilCritique: 4,
          statut: 'rupture'
        },
        {
          id: 4,
          nom: 'Kit Chaîne DID 520 Renforcé O-Ring',
          categorie: 'Moto & Scooter',
          reference: 'REF-DID-520VX3',
          image: '',
          stockActuel: 12,
          seuilCritique: 3,
          statut: 'normal'
        },
        {
          id: 5,
          nom: 'Vanne de Freinage Pneumatique Wabco',
          categorie: 'Poids Lourds',
          reference: 'REF-WBC-9710021500',
          image: '',
          stockActuel: 6,
          seuilCritique: 2,
          statut: 'normal'
        },
        {
          id: 6,
          nom: 'Dérailleur Arrière Shimano Deore XT',
          categorie: 'Vélo',
          reference: 'REF-SHM-RD-M8100',
          image: '',
          stockActuel: 15,
          seuilCritique: 5,
          statut: 'normal'
        }
      ];

      this.applyFilters();
      this.isLoading = false;
    }, 400);
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
    item.stockActuel += quantite;
    this.recalculerStatut(item);
    this.applyFilters();
    this.showToast(`+${quantite} unités ajoutées à "${item.nom}"`, 'success');

    // TODO: appeler ton service pour persister le changement côté backend
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