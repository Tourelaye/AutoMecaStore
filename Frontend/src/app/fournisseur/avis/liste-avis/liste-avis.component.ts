import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-liste-avis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './liste-avis.component.html',
  styleUrls: ['./liste-avis.component.css']
})
export class ListeAvisComponent {
  avis = [
    { id: 1, client: 'Jean Dupont', note: 5, date: '2024-06-28', commentaire: 'Produits de très bonne qualité, livraison rapide.', produit: 'Frein à disque avant' },
    { id: 2, client: 'Marie Martin', note: 4, date: '2024-06-27', commentaire: 'Satisfait de mon achat, mais emballage pourrait être amélioré.', produit: 'Filtre à huile' },
    { id: 3, client: 'Pierre Bernard', note: 5, date: '2024-06-26', commentaire: 'Excellent rapport qualité/prix, je recommande.', produit: 'Batterie 12V' },
    { id: 4, client: 'Sophie Petit', note: 3, date: '2024-06-25', commentaire: 'Produit correct mais délai de livraison un peu long.', produit: 'Amortisseur arrière' },
    { id: 5, client: 'Luc Dubois', note: 5, date: '2024-06-24', commentaire: 'Parfait, correspond exactement à mes attentes.', produit: 'Kit plaquettes frein' }
  ];

  searchTerm = '';
  selectedNote = '';
  notes = ['Toutes', '5 étoiles', '4 étoiles', '3 étoiles', '2 étoiles', '1 étoile'];

  get filteredAvis() {
    return this.avis.filter(avi => {
      const matchesSearch = avi.client.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           avi.commentaire.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesNote = this.selectedNote === '' || this.selectedNote === 'Toutes' || 
                         this.selectedNote === `${avi.note} étoiles`;
      return matchesSearch && matchesNote;
    });
  }

  onNoteChange(note: string): void {
    this.selectedNote = note;
  }

  getStars(note: number): string[] {
    return Array(note).fill('★').concat(Array(5 - note).fill('☆'));
  }

  getNoteClass(note: number): string {
    if (note >= 4) return 'note-high';
    if (note === 3) return 'note-medium';
    return 'note-low';
  }
}
