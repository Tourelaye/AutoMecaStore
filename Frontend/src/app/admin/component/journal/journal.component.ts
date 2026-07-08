import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JournalService, LogEntry, LogCategory } from './journal.service';

type CategoryFilter = 'toutes' | LogCategory;

@Component({
  selector: 'app-journal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './journal.component.html',
  styleUrls: ['./journal.component.css']
})
export class JournalComponent implements OnInit {
  loading = true;
  logs: LogEntry[] = [];
  filtered: LogEntry[] = [];

  searchTerm = '';
  categoryFilter: CategoryFilter = 'toutes';

  categoryOptions: { value: CategoryFilter; label: string }[] = [
    { value: 'toutes', label: 'Toutes les rubriques' },
    { value: 'securite', label: 'Sécurité' },
    { value: 'finances', label: 'Finances' },
    { value: 'vendeurs', label: 'Vendeurs' },
    { value: 'categories', label: 'Catégories' },
    { value: 'systeme', label: 'Système' }
  ];

  // --- Modale de confirmation "Vider" ---
  showClearModal = false;
  clearConfirmText = '';
  clearing = false;

  constructor(private journalService: JournalService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.journalService.getAll().subscribe((list: LogEntry[]) => {
      this.logs = list;
      this.applyFilters();
      this.loading = false;
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.logs.filter(l => {
      const matchesSearch =
        !term ||
        l.action.toLowerCase().includes(term) ||
        l.ipAddress.toLowerCase().includes(term) ||
        l.description.toLowerCase().includes(term) ||
        l.adminUser.toLowerCase().includes(term);
      const matchesCategory = this.categoryFilter === 'toutes' || l.category === this.categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }

  categoryLabel(category: LogCategory): string {
    const found = this.categoryOptions.find(o => o.value === category);
    return (found?.label || category).toUpperCase();
  }

  // --- Export CSV réel, généré côté client ---
  exportCsv(): void {
    const headers = ['Date', 'Heure (UTC)', 'Rubrique', 'Action', 'Utilisateur Admin', 'Adresse IP', 'Description'];
    const rows = this.filtered.map(l => [
      l.date, l.time, this.categoryLabel(l.category), l.action, l.adminUser, l.ipAddress, l.description
    ]);

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csvContent = [headers, ...rows]
      .map(row => row.map(escape).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `journal-activite-automecastore-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // --- Purge du journal (déconseillé en usage réel, voir avertissement dans la modale) ---
  openClearModal(): void {
    this.clearConfirmText = '';
    this.showClearModal = true;
  }

  closeClearModal(): void {
    if (this.clearing) return;
    this.showClearModal = false;
  }

  confirmClear(): void {
    if (this.clearConfirmText.trim().toUpperCase() !== 'VIDER') return;
    this.clearing = true;
    this.journalService.clear().subscribe(() => {
      this.logs = [];
      this.applyFilters();
      this.clearing = false;
      this.showClearModal = false;
    });
  }
}