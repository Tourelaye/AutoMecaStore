import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface UniversVehicule {
  key: 'auto' | 'moto' | 'poidLourds' | 'velo';
  label: string;
  icon: string;
  route: string;
}

/**
 * Widget « Trouver ma pièce » : recherche par véhicule (marque / modèle / pièce)
 * qui redirige vers la page de recherche existante avec ses filtres véhicule.
 */
@Component({
  selector: 'app-vehicule-finder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicule-finder.component.html',
  styleUrls: ['./vehicule-finder.component.css']
})
export class VehiculeFinderComponent {

  univers: UniversVehicule[] = [
    { key: 'auto',       label: 'Auto',         icon: 'bi-car-front-fill', route: '/catalog/auto' },
    { key: 'moto',       label: 'Moto',         icon: 'bi-scooter',        route: '/catalog/moto' },
    { key: 'poidLourds', label: 'Poids lourds', icon: 'bi-truck',          route: '/catalog/poidLourds' },
    { key: 'velo',       label: 'Vélo',         icon: 'bi-bicycle',        route: '/catalog/velo' }
  ];

  universActif: UniversVehicule = this.univers[0];

  marque = '';
  modele = '';
  piece = '';

  suggestionsPieces = ['Plaquettes de frein', 'Filtre à huile', 'Batterie', 'Amortisseur', 'Courroie', 'Bougies'];

  constructor(private router: Router) {}

  choisirUnivers(u: UniversVehicule): void {
    this.universActif = u;
  }

  get peutRechercher(): boolean {
    return !!(this.marque.trim() || this.modele.trim() || this.piece.trim());
  }

  rechercher(): void {
    const queryParams: Record<string, string> = {};
    if (this.piece.trim())  queryParams['search'] = this.piece.trim();
    if (this.marque.trim()) queryParams['veh_marque'] = this.marque.trim();
    if (this.modele.trim()) queryParams['veh_modele'] = this.modele.trim();

    if (Object.keys(queryParams).length === 0) {
      this.router.navigate([this.universActif.route]);
      return;
    }
    this.router.navigate(['/recherche'], { queryParams });
  }

  rechercherPiece(nom: string): void {
    this.piece = nom;
    this.rechercher();
  }
}
