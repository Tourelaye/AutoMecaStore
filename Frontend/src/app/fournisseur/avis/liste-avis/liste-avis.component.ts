import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AvisService, Avis, AvisStats, AvisFilters } from '../../services/avis.service';

type BooleanFilter = 'tous' | 'true' | 'false';
type NoteFilter = 'tous' | '5' | '4' | '3' | '2' | '1';

@Component({
  selector: 'app-liste-avis',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './liste-avis.component.html',
  styleUrls: ['./liste-avis.component.css']
})
export class ListeAvisComponent implements OnInit, OnDestroy {

  avis: Avis[] = [];
  filteredAvis: Avis[] = [];
  isLoading = false;
  isStatsLoading = false;

  stats: AvisStats | null = null;

  filtresForm: FormGroup;
  replyForm: FormGroup;
  reportForm: FormGroup;

  activeReplyAvis: Avis | null = null;
  activeReportAvis: Avis | null = null;
  showReportModal = false;

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;
  private destroy$ = new Subject<void>();

  readonly noteOptions = [
    { value: 'tous', label: 'Toutes les notes' },
    { value: '5', label: '5 étoiles' },
    { value: '4', label: '4 étoiles' },
    { value: '3', label: '3 étoiles' },
    { value: '2', label: '2 étoiles' },
    { value: '1', label: '1 étoile' }
  ];

  readonly ouiNonOptions = [
    { value: 'tous', label: 'Tous' },
    { value: 'true', label: 'Oui' },
    { value: 'false', label: 'Non' }
  ];

  readonly sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'note', label: 'Note' },
    { value: 'produit', label: 'Produit' }
  ];

  readonly motifsSignalement = [
    { value: 'offensant', label: 'Langage offensant' },
    { value: 'spam', label: 'Spam' },
    { value: 'faux', label: 'Faux avis' },
    { value: 'inapproprie', label: 'Contenu inapproprié' }
  ];

  constructor(
    private avisService: AvisService,
    private fb: FormBuilder
  ) {
    this.filtresForm = this.fb.group({
      search: [''],
      note: ['tous'],
      avecPhotos: ['tous'],
      achatVerifie: ['tous'],
      sortBy: ['date'],
      sortDir: ['desc']
    });

    this.replyForm = this.fb.group({
      reponse: ['', [Validators.required, Validators.maxLength(1000)]]
    });

    this.reportForm = this.fb.group({
      motif: ['', Validators.required],
      commentaire: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    this.loadAvis();
    this.loadStats();

    this.filtresForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  // =============================================
  // CHARGEMENT
  // =============================================
  private loadAvis(): void {
    this.isLoading = true;
    this.avisService.getAvis().subscribe({
      next: (avis) => {
        this.avis = avis;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement avis:', err);
        this.isLoading = false;
      }
    });
  }

  private loadStats(): void {
    this.isStatsLoading = true;
    this.avisService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isStatsLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement stats avis:', err);
        this.isStatsLoading = false;
      }
    });
  }

  // =============================================
  // FILTRES + TRI
  // =============================================
  private applyFilters(): void {
    const f = this.filtresForm.value as AvisFilters;
    const search = f.search?.toLowerCase().trim() || '';
    const note = f.note as NoteFilter;
    const avecPhotos = this.parseBooleanFilter(f.avecPhotos as BooleanFilter);
    const achatVerifie = this.parseBooleanFilter(f.achatVerifie as BooleanFilter);

    let result = this.avis.filter(avi => {
      const matchesSearch = !search ||
        avi.client_nom?.toLowerCase().includes(search) ||
        avi.client_prenom?.toLowerCase().includes(search) ||
        avi.produit_nom?.toLowerCase().includes(search) ||
        avi.commentaire?.toLowerCase().includes(search);

      const matchesNote = note === 'tous' || avi.note.toString() === note;

      const matchesPhotos = avecPhotos === null ||
        (avecPhotos ? (avi.photos?.length > 0) : (!avi.photos || avi.photos.length === 0));

      const matchesAchat = achatVerifie === null || avi.achat_verifie === achatVerifie;

      return matchesSearch && matchesNote && matchesPhotos && matchesAchat;
    });

    const dir = f.sortDir === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (f.sortBy) {
        case 'note':
          cmp = a.note - b.note;
          break;
        case 'produit':
          cmp = (a.produit_nom || '').localeCompare(b.produit_nom || '');
          break;
        case 'date':
        default:
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
      }
      return cmp * dir;
    });

    this.filteredAvis = result;
  }

  private parseBooleanFilter(value: BooleanFilter): boolean | null {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  }

  resetFilters(): void {
    this.filtresForm.reset({
      search: '',
      note: 'tous',
      avecPhotos: 'tous',
      achatVerifie: 'tous',
      sortBy: 'date',
      sortDir: 'desc'
    });
  }

  toggleSortDirection(): void {
    const current = this.filtresForm.get('sortDir')?.value as 'asc' | 'desc';
    this.filtresForm.patchValue({ sortDir: current === 'asc' ? 'desc' : 'asc' });
  }

  // =============================================
  // ÉTOILES / CLASSES
  // =============================================
  getStars(note: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < note);
  }

  getNoteClass(note: number): string {
    if (note >= 4) return 'note-high';
    if (note === 3) return 'note-medium';
    return 'note-low';
  }

  getInitials(nom?: string, prenom?: string): string {
    const n = (nom || '').trim().charAt(0);
    const p = (prenom || '').trim().charAt(0);
    return (p + n).toUpperCase() || 'CL';
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatShortDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // =============================================
  // RÉPONSE FOURNISSEUR
  // =============================================
  ouvrirReponse(avi: Avis): void {
    this.activeReplyAvis = avi;
    this.replyForm.setValue({ reponse: avi.reponse_fournisseur || '' });
  }

  annulerReponse(): void {
    this.activeReplyAvis = null;
    this.replyForm.reset({ reponse: '' });
  }

  enregistrerReponse(): void {
    if (!this.activeReplyAvis || this.replyForm.invalid) return;

    const texte = this.replyForm.value.reponse.trim();
    if (!texte) return;

    this.avisService.repondre(this.activeReplyAvis.id, texte).subscribe({
      next: (updated) => {
        const avi = this.avis.find(a => a.id === updated.id);
        if (avi) {
          avi.reponse_fournisseur = updated.reponse_fournisseur;
          avi.date_reponse = updated.date_reponse;
          avi.reponse_fournisseur_nom = updated.reponse_fournisseur_nom;
        }
        this.activeReplyAvis = null;
        this.replyForm.reset();
        this.showToast('Réponse publiée avec succès.');
        this.loadStats();
      },
      error: () => {
        this.showToast('Erreur lors de la publication de la réponse', 'error');
      }
    });
  }

  // =============================================
  // SIGNALEMENT
  // =============================================
  ouvrirSignalement(avi: Avis): void {
    this.activeReportAvis = avi;
    this.reportForm.reset({ motif: '', commentaire: '' });
    this.showReportModal = true;
  }

  annulerSignalement(): void {
    this.showReportModal = false;
    this.activeReportAvis = null;
    this.reportForm.reset();
  }

  confirmerSignalement(): void {
    if (!this.activeReportAvis || this.reportForm.invalid) return;

    const { motif, commentaire } = this.reportForm.value;
    this.avisService.signaler(this.activeReportAvis.id, motif, commentaire).subscribe({
      next: () => {
        this.activeReportAvis!.signale = true;
        this.showReportModal = false;
        this.activeReportAvis = null;
        this.reportForm.reset();
        this.showToast('Signalement envoyé à l\'administrateur.');
      },
      error: (err) => {
        const msg = err?.error?.error || 'Erreur lors du signalement';
        this.showToast(msg, 'error');
      }
    });
  }

  // =============================================
  // EXPORT
  // =============================================
  exportExcel(): void {
    const rows = this.filteredAvis.map(avi => ({
      Date: this.formatShortDate(avi.date),
      Client: `${avi.client_prenom || ''} ${avi.client_nom || ''}`.trim(),
      Produit: avi.produit_nom,
      Référence: avi.produit_reference || 'N/A',
      Note: avi.note,
      Commentaire: this.sanitizeForCsv(avi.commentaire),
      'Achat vérifié': avi.achat_verifie ? 'Oui' : 'Non',
      'Avec photos': (avi.photos?.length || 0) > 0 ? 'Oui' : 'Non',
      Répondu: avi.reponse_fournisseur ? 'Oui' : 'Non'
    }));

    if (!rows.length) {
      this.showToast('Aucun avis à exporter', 'error');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(';'),
      ...rows.map(r => headers.map(h => r[h as keyof typeof r]).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    this.download(blob, 'avis-automecastore.csv');
  }

  exportPDF(): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.showToast('La fenêtre d\'impression a été bloquée', 'error');
      return;
    }

    const html = this.buildPrintableHtml();
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }

  private buildPrintableHtml(): string {
    const rows = this.filteredAvis.map(avi => `
      <tr>
        <td>${this.formatShortDate(avi.date)}</td>
        <td>${avi.client_prenom || ''} ${avi.client_nom || ''}</td>
        <td>${avi.produit_nom}</td>
        <td>${avi.note}/5</td>
        <td>${avi.commentaire}</td>
        <td>${avi.achat_verifie ? 'Oui' : 'Non'}</td>
        <td>${avi.reponse_fournisseur ? 'Oui' : 'Non'}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Avis clients - AutoMecaStore</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
          h1 { font-size: 18px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; vertical-align: top; }
          th { background: #f5f5f5; }
          .header { margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Avis clients - AutoMecaStore</h1>
          <p>Total: ${this.filteredAvis.length} avis | Note moyenne: ${this.stats?.note_moyenne?.toFixed(1) || '—'}/5</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Client</th><th>Produit</th><th>Note</th><th>Commentaire</th><th>Achat vérifié</th><th>Répondu</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `;
  }

  private sanitizeForCsv(value: string): string {
    if (!value) return '';
    return value.replace(/\r?\n/g, ' ').replace(/;/g, ',');
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // =============================================
  // STATISTIQUES VISUELLES
  // =============================================
  get repartitionPercentages(): { note: number; count: number; pct: number }[] {
    const total = this.stats?.total || this.avis.length || 1;
    return [5, 4, 3, 2, 1].map(note => {
      const count = this.stats?.repartition?.[note.toString()] ??
        this.avis.filter(a => a.note === note).length;
      return { note, count, pct: total ? Math.round((count / total) * 100) : 0 };
    });
  }

  get evolutionLabels(): string[] {
    return this.stats?.evolution ? Object.keys(this.stats.evolution) : [];
  }

  get maxEvolutionCount(): number {
    if (!this.stats?.evolution) return 1;
    const counts = Object.values(this.stats.evolution).map(v => v.count || 0);
    return Math.max(...counts, 1);
  }

  get signalesCount(): number {
    return this.avis.filter(a => a.signale).length;
  }

  getRoundedNote(note: number): number {
    return Math.round(note || 0);
  }

  openPhotoPreview(url: string): void {
    window.open(url, '_blank');
  }

  // =============================================
  // TOAST
  // =============================================
  private showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toastMsg = msg;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 4000);
  }
}