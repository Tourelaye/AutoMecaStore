import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Avis {
  id: number;
  client: string;
  note: number;
  date: string;
  commentaire: string;
  produit: string;
  reponse?: string;
  dateReponse?: string;
}

type TriAvis = 'recent' | 'ancien' | 'meilleure' | 'pire' | 'sans_reponse';

@Component({
  selector: 'app-liste-avis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './liste-avis.component.html',
  styleUrls: ['./liste-avis.component.css']
})
export class ListeAvisComponent {

  avis: Avis[] = [
    { id: 1, client: 'Jean Dupont', note: 5, date: '2024-06-28', commentaire: 'Produits de très bonne qualité, livraison rapide.', produit: 'Frein à disque avant', reponse: 'Merci beaucoup Jean, ravis que la livraison vous ait satisfait !', dateReponse: '2024-06-29' },
    { id: 2, client: 'Marie Martin', note: 4, date: '2024-06-27', commentaire: 'Satisfait de mon achat, mais emballage pourrait être amélioré.', produit: 'Filtre à huile' },
    { id: 3, client: 'Pierre Bernard', note: 5, date: '2024-06-26', commentaire: 'Excellent rapport qualité/prix, je recommande.', produit: 'Batterie 12V' },
    { id: 4, client: 'Sophie Petit', note: 3, date: '2024-06-25', commentaire: 'Produit correct mais délai de livraison un peu long.', produit: 'Amortisseur arrière' },
    { id: 5, client: 'Luc Dubois', note: 5, date: '2024-06-24', commentaire: 'Parfait, correspond exactement à mes attentes.', produit: 'Kit plaquettes frein' },
    { id: 6, client: 'Awa Ndiaye', note: 2, date: '2024-06-22', commentaire: "Le produit reçu ne correspondait pas tout à fait à la description.", produit: 'Vanne de freinage pneumatique' },
    { id: 7, client: 'Moussa Diop', note: 1, date: '2024-06-20', commentaire: 'Très déçu, produit reçu endommagé.', produit: 'Dérailleur Shimano' }
  ];

  searchTerm = '';
  selectedNote = '';
  sortBy: TriAvis = 'recent';
  notes = ['5 étoiles', '4 étoiles', '3 étoiles', '2 étoiles', '1 étoile'];

  editingId: number | null = null;
  reponseTexte = '';

  toastMsg = '';
  private toastTimeout: any;

  // =============================================
  // FILTRAGE + TRI
  // =============================================
  get filteredAvis(): Avis[] {
    let result = this.avis.filter(avi => {
      const term = this.searchTerm.toLowerCase().trim();
      const matchesSearch = !term ||
        avi.client.toLowerCase().includes(term) ||
        avi.commentaire.toLowerCase().includes(term) ||
        avi.produit.toLowerCase().includes(term);

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
          return (a.reponse ? 1 : 0) - (b.reponse ? 1 : 0);
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
    this.reponseTexte = avi.reponse ?? '';
  }

  annulerReponse(): void {
    this.editingId = null;
    this.reponseTexte = '';
  }

  enregistrerReponse(avi: Avis): void {
    if (!this.reponseTexte.trim()) return;

    avi.reponse = this.reponseTexte.trim();
    avi.dateReponse = new Date().toISOString().slice(0, 10);

    // TODO: appeler ton service (POST/PUT /avis/:id/reponse)

    this.editingId = null;
    this.reponseTexte = '';
    this.showToast('Réponse publiée avec succès.');
  }

  private showToast(msg: string): void {
    this.toastMsg = msg;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 3000);
  }
}