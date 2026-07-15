import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvisService } from '../../services/avis.service';

interface Avis {
  id: number;
  client_nom: string;
  note: number;
  date: string;
  commentaire: string;
  produit_nom: string;
  reponse_fournisseur?: string;
  date_reponse?: string;
}

type TriAvis = 'recent' | 'ancien' | 'meilleure' | 'pire' | 'sans_reponse';

@Component({
  selector: 'app-liste-avis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './liste-avis.component.html',
  styleUrls: ['./liste-avis.component.css']
})
export class ListeAvisComponent implements OnInit {

  avis: Avis[] = [];
  isLoading = false;

  searchTerm = '';
  selectedNote = '';
  sortBy: TriAvis = 'recent';
  notes = ['5 étoiles', '4 étoiles', '3 étoiles', '2 étoiles', '1 étoile'];

  editingId: number | null = null;
  reponseTexte = '';

  toastMsg = '';
  private toastTimeout: any;

  constructor(private avisService: AvisService) {}

  ngOnInit(): void {
    this.loadAvis();
  }

  private loadAvis(): void {
    this.isLoading = true;
    this.avisService.getAvis().subscribe({
      next: (avis) => {
        this.avis = avis;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement avis:', err);
        this.isLoading = false;
      }
    });
  }

  // =============================================
  // FILTRAGE + TRI
  // =============================================
  get filteredAvis(): Avis[] {
    let result = this.avis.filter(avi => {
      const term = this.searchTerm.toLowerCase().trim();
      const matchesSearch = !term ||
        avi.client_nom.toLowerCase().includes(term) ||
        avi.commentaire.toLowerCase().includes(term) ||
        avi.produit_nom.toLowerCase().includes(term);

      const matchesNote = this.selectedNote === '' || this.matchNoteLabel(avi.note, this.selectedNote);

      return matchesSearch && matchesNote;
    });

    result = [...result].sort((a, b) => {
      switch (this.sortBy) {
        case 'recent':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'ancien':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'meilleure':
          return b.note - a.note;
        case 'pire':
          return a.note - b.note;
        case 'sans_reponse':
          return (a.reponse_fournisseur ? 1 : 0) - (b.reponse_fournisseur ? 1 : 0);
        default:
          return 0;
      }
    });

    return result;
  }

  // Gère correctement le singulier "1 étoile" vs le pluriel "X étoiles"
  private matchNoteLabel(note: number, label: string): boolean {
    const attendu = note === 1 ? '1 étoile' : `${note} étoiles`;
    return label === attendu;
  }

  get repartitionNotes(): { note: number; count: number; pct: number }[] {
    const total = this.avis.length || 1;
    return [5, 4, 3, 2, 1].map(note => {
      const count = this.avis.filter(a => a.note === note).length;
      return { note, count, pct: Math.round((count / total) * 100) };
    });
  }

  get noteMoyenne(): number {
    if (!this.avis.length) return 0;
    const somme = this.avis.reduce((s, a) => s + a.note, 0);
    return somme / this.avis.length;
  }

  onNoteChange(note: string): void {
    this.selectedNote = note;
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

  // =============================================
  // RÉPONSE FOURNISSEUR
  // =============================================
  ouvrirReponse(avi: Avis): void {
    this.editingId = avi.id;
    this.reponseTexte = avi.reponse_fournisseur ?? '';
  }

  annulerReponse(): void {
    this.editingId = null;
    this.reponseTexte = '';
  }

  enregistrerReponse(avi: Avis): void {
    if (!this.reponseTexte.trim()) return;

    this.avisService.repondre(avi.id, this.reponseTexte.trim()).subscribe({
      next: (updated) => {
        avi.reponse_fournisseur = updated.reponse_fournisseur;
        avi.date_reponse = updated.date_reponse;
        this.editingId = null;
        this.reponseTexte = '';
        this.showToast('Réponse publiée avec succès.');
      },
      error: () => {
        this.showToast('Erreur lors de la publication de la réponse', 'error');
      }
    });
  }

  private showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toastMsg = msg;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 3000);
  }
}