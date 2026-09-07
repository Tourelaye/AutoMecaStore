import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ProduitService, MagasinDetail } from '../../../core/services/produit.service';

@Component({
  selector: 'app-magasins-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './magasins-list.component.html',
  styleUrls: ['./magasins-list.component.css']
})
export class MagasinsListComponent implements OnInit, OnDestroy {
  magasins: MagasinDetail[] = [];
  filteredMagasins: MagasinDetail[] = [];
  loading = false;
  error = '';

  searchTerm = '';
  sortOption = 'nom';
  filterLivraison = false;
  filterRetrait = false;

  showGeolocBtn = true;
  geoLoading = false;
  geoError = '';
  clientPosition: { lat: number; lng: number } | null = null;

  private searchSubject = new Subject<string>();

  constructor(
    private produitService: ProduitService,
    public router: Router
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => this.loadMagasins());
  }

  ngOnInit(): void {
    const saved = localStorage.getItem('client_location');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p?.lat != null && p?.lng != null) {
          this.clientPosition = { lat: p.lat, lng: p.lng };
          this.showGeolocBtn = false;
        }
      } catch {}
    }
    this.loadMagasins();
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  loadMagasins(): void {
    this.loading = true;
    this.error = '';
    this.produitService.getMagasins({
      search: this.searchTerm || undefined,
      livraison: this.filterLivraison || undefined,
      retrait: this.filterRetrait || undefined,
      sort: this.sortOption,
      lat: this.clientPosition?.lat,
      lng: this.clientPosition?.lng
    }).subscribe({
      next: (data) => {
        this.magasins = data;
        this.applySort();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Impossible de charger les magasins.';
        this.loading = false;
        console.error('Magasins load error:', err);
      }
    });
  }

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  onSortChange(value: string): void {
    this.sortOption = value;
    this.applySort();
  }

  toggleLivraison(): void {
    this.filterLivraison = !this.filterLivraison;
    this.loadMagasins();
  }

  toggleRetrait(): void {
    this.filterRetrait = !this.filterRetrait;
    this.loadMagasins();
  }

  applySort(): void {
    const list = [...this.magasins];
    if (this.sortOption === 'note') {
      list.sort((a, b) => (b.note ?? 0) - (a.note ?? 0));
    } else if (this.sortOption === 'distance') {
      list.sort((a, b) => {
        const da = a.distance_km ?? Infinity;
        const db = b.distance_km ?? Infinity;
        return da - db;
      });
    } else {
      list.sort((a, b) => (a.nom_magasin || '').localeCompare(b.nom_magasin || ''));
    }
    this.filteredMagasins = list;
  }

  requestGeolocation(): void {
    if (!('geolocation' in navigator)) {
      this.geoError = 'Géolocalisation non supportée par votre navigateur.';
      return;
    }
    this.geoLoading = true;
    this.geoError = '';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.clientPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        localStorage.setItem('client_location', JSON.stringify(this.clientPosition));
        this.geoLoading = false;
        this.showGeolocBtn = false;
        this.loadMagasins();
      },
      (err) => {
        this.geoLoading = false;
        this.geoError = err.code === 1 ? 'Géolocalisation refusée. Activez-la pour calculer les distances.' : 'Position indisponible.';
      }
    );
  }

  get magasinCount(): number {
    return this.filteredMagasins.length;
  }

  get ouvertCount(): number {
    return this.filteredMagasins.filter(m => this.isMagasinOuvert(m)).length;
  }

  get livraisonCount(): number {
    return this.filteredMagasins.filter(m => m.livraison_disponible).length;
  }

  isMagasinOuvert(magasin: MagasinDetail): boolean {
    if (!magasin.horaires_ouverture || !magasin.jours_ouverture) return false;
    const now = new Date();
    const jours = (magasin.jours_ouverture || '').toLowerCase().split(',').map(j => j.trim());
    const jourActuel = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'][now.getDay()];
    if (!jours.includes(jourActuel)) return false;
    const h = magasin.horaires_ouverture;
    const heure = now.getHours() + now.getMinutes() / 60;
    const debut = this.parseHeure(h.debut ?? h.ouverture);
    const fin = this.parseHeure(h.fin ?? h.fermeture);
    if (debut == null || fin == null) return false;
    return heure >= debut && heure <= fin;
  }

  private parseHeure(v: any): number | null {
    if (v == null) return null;
    const s = String(v);
    const [h, m] = s.split(':').map(Number);
    if (isNaN(h)) return null;
    return h + (m || 0) / 60;
  }

  getAdresse(magasin: MagasinDetail): string {
    return [magasin.adresse, magasin.ville, magasin.region]
      .filter(Boolean)
      .join(', ');
  }

  openItineraire(magasin: MagasinDetail): void {
    const lat = magasin.latitude;
    const lng = magasin.longitude;
    let url = '';
    if (lat != null && lng != null) {
      if (this.clientPosition) {
        url = `https://www.google.com/maps/dir/?api=1&origin=${this.clientPosition.lat},${this.clientPosition.lng}&destination=${lat},${lng}&travelmode=driving`;
      } else {
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      }
    } else {
      const q = encodeURIComponent(this.getAdresse(magasin));
      url = `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  trackById(_index: number, m: MagasinDetail): number {
    return m.id;
  }
}
