import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Avis, AvisService, AvisStatus } from './avis.service';

type RatingFilter = 'toutes' | 1 | 2 | 3 | 4 | 5;
type StatusFilter = 'tous' | AvisStatus;
type ModalKind = 'reply' | 'signal' | 'delete' | null;

@Component({
  selector: 'app-avis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './avis.component.html',
  styleUrls: ['./avis.component.css']
})
export class AvisComponent implements OnInit {
  loading = true;
  avisList: Avis[] = [];
  filtered: Avis[] = [];

  searchTerm = '';
  ratingFilter: RatingFilter = 'toutes';
  statusFilter: StatusFilter = 'tous';

  ratingOptions: { value: RatingFilter; label: string }[] = [
    { value: 'toutes', label: 'Toutes les notes' },
    { value: 5, label: '5 étoiles' },
    { value: 4, label: '4 étoiles' },
    { value: 3, label: '3 étoiles' },
    { value: 2, label: '2 étoiles' },
    { value: 1, label: '1 étoile' }
  ];

  statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'tous', label: 'Tous les statuts de modération' },
    { value: 'visible', label: 'Visible en ligne' },
    { value: 'moderation_requise', label: 'Modération requise' },
    { value: 'masque', label: 'Masqué' }
  ];

  // --- Modale (réponse / signalement / suppression) ---
  activeModal: ModalKind = null;
  targetAvis: Avis | null = null;
  textInput = '';
  submitting = false;

  constructor(private avisService: AvisService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.avisService.getAll().subscribe((list: Avis[]) => {
      this.avisList = list;
      this.applyFilters();
      this.loading = false;
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.avisList.filter(a => {
      const matchesSearch =
        !term ||
        a.productName.toLowerCase().includes(term) ||
        a.buyer.toLowerCase().includes(term) ||
        a.comment.toLowerCase().includes(term);
      const matchesRating = this.ratingFilter === 'toutes' || a.rating === this.ratingFilter;
      const matchesStatus = this.statusFilter === 'tous' || a.status === this.statusFilter;
      return matchesSearch && matchesRating && matchesStatus;
    });
  }

  stars(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < rating);
  }

  statusLabel(status: AvisStatus): string {
    return status === 'visible' ? 'VISIBLE EN LIGNE' : status === 'masque' ? 'MASQUÉ' : 'MODÉRATION_REQUISE';
  }

  // --- KPIs calculés dynamiquement ---
  get satisfactionGlobale(): string {
    if (this.avisList.length === 0) return '0.0';
    const total = this.avisList.reduce((sum, a) => sum + a.rating, 0);
    return (total / this.avisList.length).toFixed(1);
  }

  get commentairesAudites(): number {
    return this.avisList.length;
  }

  get avisSignales(): number {
    return this.avisList.filter(a => a.status === 'moderation_requise').length;
  }

  // --- Actions directes ---
  toggleVisibility(a: Avis): void {
    const next: AvisStatus = a.status === 'visible' ? 'masque' : 'visible';
    this.avisService.setStatus(a.id, next).subscribe((updated: Avis) => this.replace(updated));
  }

  // --- Actions avec modale ---
  openReply(a: Avis): void {
    this.targetAvis = a;
    this.textInput = a.adminReply || '';
    this.activeModal = 'reply';
  }

  askSignal(a: Avis): void {
    this.targetAvis = a;
    this.textInput = '';
    this.activeModal = 'signal';
  }

  askDelete(a: Avis): void {
    this.targetAvis = a;
    this.activeModal = 'delete';
  }

  closeModal(): void {
    if (this.submitting) return;
    this.activeModal = null;
    this.targetAvis = null;
  }

  confirmModal(): void {
    if (!this.targetAvis) return;
    const id = this.targetAvis.id;
    this.submitting = true;

    if (this.activeModal === 'reply') {
      const reply = this.textInput.trim();
      if (!reply) { this.submitting = false; return; }
      this.avisService.reply(id, reply).subscribe((updated: Avis) => { this.replace(updated); this.endModal(); });
    } else if (this.activeModal === 'signal') {
      this.avisService.setStatus(id, 'moderation_requise', this.textInput.trim() || 'Signalé par un administrateur.')
        .subscribe((updated: Avis) => { this.replace(updated); this.endModal(); });
    } else if (this.activeModal === 'delete') {
      this.avisService.delete(id).subscribe(() => {
        this.avisList = this.avisList.filter(a => a.id !== id);
        this.applyFilters();
        this.endModal();
      });
    }
  }

  private endModal(): void {
    this.submitting = false;
    this.activeModal = null;
    this.targetAvis = null;
  }

  private replace(updated: Avis): void {
    this.avisList = this.avisList.map(a => (a.id === updated.id ? updated : a));
    this.applyFilters();
  }

  trackById(_index: number, item: Avis): string {
    return item.id;
  }
}