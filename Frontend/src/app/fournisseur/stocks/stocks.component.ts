import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { StockService, MouvementStock, MouvementPayload } from '../services/stock.service';
import { Produit } from '../services/produit.service';

type StatutStock = 'en_stock' | 'faible' | 'rupture';
type TypeMouvement = 'entree' | 'sortie' | 'retour' | 'correction';

interface StatutMeta {
  label: string;
  icon: string;
  colorClass: string;
  badgeClass: string;
  rowClass: string;
}

@Component({
  selector: 'app-stock-fournisseur',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './stocks.component.html',
  styleUrls: ['./stocks.component.css']
})
export class StockComponent implements OnInit {

  isLoading = false;
  saving = false;

  stockItems: Produit[] = [];
  filteredStock: Produit[] = [];
  mouvements: MouvementStock[] = [];
  categories: string[] = [];
  imageErrors: { [id: number]: boolean } = {};

  filtresForm: FormGroup;
  mouvementForm: FormGroup;

  activeTab: 'tableau' | 'mouvements' | 'alertes' = 'tableau';
  showMouvementModal = false;
  mouvementProduit?: Produit;

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  readonly statuts: Record<StatutStock, StatutMeta> = {
    en_stock: { label: 'En stock', icon: 'bi-check-circle-fill', colorClass: 'ok', badgeClass: 'sb-en_stock', rowClass: '' },
    faible:   { label: 'Stock faible', icon: 'bi-exclamation-triangle-fill', colorClass: 'low', badgeClass: 'sb-faible', rowClass: 'row-faible' },
    rupture:  { label: 'Rupture de stock', icon: 'bi-x-circle-fill', colorClass: 'zero', badgeClass: 'sb-rupture', rowClass: 'row-rupture' }
  };

  constructor(private stockService: StockService, private fb: FormBuilder) {
    this.filtresForm = this.fb.group({
      search: [''],
      statut: ['tous'],
      categorie: ['tous'],
      sortBy: ['date'],
      sortDir: ['desc']
    });

    this.mouvementForm = this.fb.group({
      produitId: [null],
      type_mouvement: ['entree'],
      quantite: [null],
      observation: ['']
    });
  }

  ngOnInit(): void {
    this.chargerStock();
    this.chargerMouvements();

    this.filtresForm.valueChanges.subscribe(() => this.applyFilters());
  }

  // =============================================
  // STATUTS
  // =============================================
  getStatut(produit: Produit): StatutStock {
    if (produit.statut_stock) return produit.statut_stock;
    const stock = produit.stock ?? 0;
    const seuil = produit.seuil_alerte ?? 5;
    if (stock === 0) return 'rupture';
    if (stock <= seuil) return 'faible';
    return 'en_stock';
  }

  getStatutMeta(produit: Produit): StatutMeta {
    return this.statuts[this.getStatut(produit)];
  }

  getSeuil(produit: Produit): number {
    return produit.seuil_alerte ?? 5;
  }

  getCategorie(produit: Produit): string {
    return produit.categorie_nom || 'Non spécifié';
  }

  getImage(produit: Produit): string | null {
    return produit.image_url || produit.image || null;
  }

  formatDate(d?: string | null): string {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatDateOnly(d?: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR');
  }

  // =============================================
  // CHARGEMENT DES DONNÉES
  // =============================================
  chargerStock(): void {
    this.isLoading = true;
    this.stockService.getStocks().subscribe({
      next: (stocks: Produit[]) => {
        this.stockItems = stocks;
        this.categories = Array.from(new Set(stocks.map(p => this.getCategorie(p)))).sort();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.showToast('Erreur lors du chargement du stock', 'error');
        this.isLoading = false;
      }
    });
  }

  chargerMouvements(): void {
    this.stockService.getMouvements().subscribe({
      next: (mouvements: MouvementStock[]) => {
        this.mouvements = mouvements;
      },
      error: () => {
        this.showToast('Erreur lors du chargement des mouvements', 'error');
      }
    });
  }

  // =============================================
  // DASHBOARD & STATISTIQUES
  // =============================================
  get totalCount(): number {
    return this.stockItems.length;
  }

  get ruptureCount(): number {
    return this.stockItems.filter(p => this.getStatut(p) === 'rupture').length;
  }

  get faibleCount(): number {
    return this.stockItems.filter(p => this.getStatut(p) === 'faible').length;
  }

  get valeurTotaleStock(): number {
    return this.stockItems.reduce((sum, p) => sum + (p.prix || 0) * (p.stock || 0), 0);
  }

  get topVentes(): Produit[] {
    const avecVentes = this.stockItems.filter(p => (p.nombre_ventes || 0) > 0);
    const base = avecVentes.length ? avecVentes : this.stockItems;
    return [...base].sort((a, b) => (b.nombre_ventes || 0) - (a.nombre_ventes || 0)).slice(0, 3);
  }

  get flopVentes(): Produit[] {
    const avecVentes = this.stockItems.filter(p => (p.nombre_ventes || 0) > 0);
    const base = avecVentes.length ? avecVentes : this.stockItems;
    return [...base].sort((a, b) => (a.nombre_ventes || 0) - (b.nombre_ventes || 0)).slice(0, 3);
  }

  get alertes(): { produit: Produit; raison: string; severite: 'rupture' | 'faible' | 'old' }[] {
    const now = Date.now();
    const alertes: { produit: Produit; raison: string; severite: 'rupture' | 'faible' | 'old' }[] = [];
    for (const p of this.stockItems) {
      const statut = this.getStatut(p);
      if (statut === 'rupture') alertes.push({ produit: p, raison: 'Rupture de stock', severite: 'rupture' });
      else if (statut === 'faible') alertes.push({ produit: p, raison: 'Stock faible', severite: 'faible' });

      const last = p.date_derniere_maj_stock || p.date_ajout;
      if (last && (now - new Date(last).getTime()) > 30 * 24 * 60 * 60 * 1000) {
        alertes.push({ produit: p, raison: 'Non réapprovisionné depuis +30 jours', severite: 'old' });
      }
    }
    const severiteOrdre = { rupture: 0, faible: 1, old: 2 };
    return alertes.sort((a, b) => severiteOrdre[a.severite] - severiteOrdre[b.severite]);
  }

  // =============================================
  // FILTRES & TRI
  // =============================================
  applyFilters(): void {
    const f = this.filtresForm.value;
    let result = [...this.stockItems];

    if (f.search?.trim()) {
      const term = f.search.toLowerCase().trim();
      result = result.filter(p =>
        p.nom?.toLowerCase().includes(term) ||
        p.reference?.toLowerCase().includes(term) ||
        this.getCategorie(p).toLowerCase().includes(term)
      );
    }

    if (f.statut && f.statut !== 'tous') {
      result = result.filter(p => this.getStatut(p) === f.statut);
    }

    if (f.categorie && f.categorie !== 'tous') {
      result = result.filter(p => this.getCategorie(p) === f.categorie);
    }

    const dir = f.sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      let cmp = 0;
      switch (f.sortBy) {
        case 'nom':
          cmp = (a.nom || '').localeCompare(b.nom || '');
          break;
        case 'prix':
          cmp = (a.prix || 0) - (b.prix || 0);
          break;
        case 'stock':
          cmp = (a.stock || 0) - (b.stock || 0);
          break;
        case 'date':
          const da = new Date(a.date_derniere_maj_stock || a.date_ajout || 0).getTime();
          const db = new Date(b.date_derniere_maj_stock || b.date_ajout || 0).getTime();
          cmp = da - db;
          break;
      }
      return cmp * dir;
    });

    this.filteredStock = result;
  }

  toggleSortDirection(): void {
    const current = this.filtresForm.get('sortDir')?.value;
    this.filtresForm.patchValue({ sortDir: current === 'asc' ? 'desc' : 'asc' });
  }

  resetFilters(): void {
    this.filtresForm.reset({ search: '', statut: 'tous', categorie: 'tous', sortBy: 'date', sortDir: 'desc' });
  }

  // =============================================
  // MOUVEMENTS DE STOCK
  // =============================================
  openMouvement(produit: Produit, type: TypeMouvement = 'entree'): void {
    this.mouvementProduit = produit;
    this.mouvementForm.reset({
      produitId: produit.id,
      type_mouvement: type,
      quantite: null,
      observation: ''
    });
    this.showMouvementModal = true;
  }

  closeMouvementModal(): void {
    this.showMouvementModal = false;
    this.mouvementProduit = undefined;
  }

  saveMouvement(): void {
    if (this.mouvementForm.invalid || this.saving) return;
    const v = this.mouvementForm.value;
    if (!v.quantite || v.quantite <= 0) {
      this.showToast('Veuillez saisir une quantité valide', 'error');
      return;
    }

    this.saving = true;
    const payload: MouvementPayload = {
      type_mouvement: v.type_mouvement,
      quantite: v.quantite,
      observation: v.observation || ''
    };

    this.stockService.createMouvement(v.produitId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.showToast('Mouvement enregistré avec succès', 'success');
        this.closeMouvementModal();
        this.chargerStock();
        this.chargerMouvements();
      },
      error: () => {
        this.saving = false;
        this.showToast('Erreur lors de l\'enregistrement du mouvement', 'error');
      }
    });
  }

  // =============================================
  // EXPORT
  // =============================================
  exportExcel(): void {
    if (!this.filteredStock.length) return;
    const rows = this.filteredStock.map(p => ({
      Nom: p.nom,
      Reference: p.reference || '',
      Categorie: this.getCategorie(p),
      Prix: p.prix,
      Quantite: p.stock,
      Seuil: this.getSeuil(p),
      Statut: this.getStatutMeta(p).label,
      DerniereMAJ: this.formatDate(p.date_derniere_maj_stock)
    }));

    const headers = Object.keys(rows[0]);
    const csv = [
      '\uFEFF' + headers.join(';'),
      ...rows.map(r => headers.map(h => String((r as any)[h]).replace(/"/g, '""')).join(';'))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stocks_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Export Excel téléchargé', 'success');
  }

  exportPDF(): void {
    if (!this.filteredStock.length) return;
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Stock - AutoMecaStore</title>
<style>
body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
h2 { text-align: center; margin-bottom: 10px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
th { background: #0f3d38; color: white; }
.rupture { color: #ef4444; font-weight: bold; }
.faible { color: #c99a4f; font-weight: bold; }
.en_stock { color: #0d9488; font-weight: bold; }
footer { margin-top: 20px; text-align: right; font-size: 11px; color: #666; }
</style>
</head>
<body>
<h2>Liste des stocks - AutoMecaStore</h2>
<p>Export du ${new Date().toLocaleString('fr-FR')}</p>
<table>
<thead>
<tr>
  <th>Produit</th><th>Référence</th><th>Catégorie</th><th>Prix</th>
  <th>Quantité</th><th>Seuil</th><th>Statut</th><th>Dernière MAJ</th>
</tr>
</thead>
<tbody>
${this.filteredStock.map(p => `<tr>
  <td>${p.nom}</td>
  <td>${p.reference || ''}</td>
  <td>${this.getCategorie(p)}</td>
  <td>${p.prix?.toLocaleString('fr-FR') || 0}</td>
  <td>${p.stock ?? 0}</td>
  <td>${this.getSeuil(p)}</td>
  <td class="${this.getStatut(p)}">${this.getStatutMeta(p).label}</td>
  <td>${this.formatDate(p.date_derniere_maj_stock)}</td>
</tr>`).join('')}
</tbody>
</table>
<footer>Généré par AutoMecaStore</footer>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      this.showToast('Veuillez autoriter les popups pour exporter le PDF', 'error');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.print();
  }

  // =============================================
  // UTILITAIRES
  // =============================================
  onImgError(id: number): void {
    this.imageErrors[id] = true;
  }

  setActiveTab(tab: 'tableau' | 'mouvements' | 'alertes'): void {
    this.activeTab = tab;
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastMsg = '', 3000);
  }
}