import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

import { ProduitService, MagasinDetail } from '../../../core/services/produit.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-magasin-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './magasin-detail.component.html',
  styleUrls: ['./magasin-detail.component.css']
})
export class MagasinDetailComponent implements OnInit {
  magasin: MagasinDetail | null = null;
  loading = false;
  error = '';
  private routeSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private produitService: ProduitService,
    private sanitizer: DomSanitizer,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe(p => {
      const id = Number(p['id']);
      if (id) this.loadMagasin(id);
    });
  }

  loadMagasin(id: number): void {
    this.loading = true;
    const pos = this.clientPosition;
    this.produitService.getMagasin(id, pos?.lat, pos?.lng).subscribe({
      next: (m) => {
        this.magasin = m;
        this.loading = false;
      },
      error: () => {
        this.error = 'Magasin introuvable.';
        this.loading = false;
      }
    });
  }

  get clientPosition(): { lat: number; lng: number } | null {
    const raw = localStorage.getItem('client_location');
    if (!raw) return null;
    try {
      const p = JSON.parse(raw);
      return (p?.lat != null && p?.lng != null) ? { lat: p.lat, lng: p.lng } : null;
    } catch { return null; }
  }

  getMapUrl(): SafeResourceUrl | null {
    const lat = this.magasin?.latitude;
    const lng = this.magasin?.longitude;
    if (!lat || !lng) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${lat},${lng}&output=embed`);
  }

  openItineraire(): void {
    const lat = this.magasin?.latitude;
    const lng = this.magasin?.longitude;
    const client = this.clientPosition;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let url = '';

    if (lat != null && lng != null && client?.lat != null && client?.lng != null) {
      const dest = `${lat},${lng}`;
      const start = `${client.lat},${client.lng}`;
      if (isMobile) {
        url = `https://maps.apple.com/?daddr=${dest}&saddr=${start}`;
      } else {
        url = `https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${dest}`;
      }
    } else if (lat != null && lng != null) {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else {
      const q = encodeURIComponent(this.adresseComplete);
      url = `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    window.open(url, '_blank');
  }

  callMagasin(): void {
    const tel = this.magasin?.telephone;
    if (tel) window.location.href = `tel:${tel}`;
  }

  get adresseComplete(): string {
    const m = this.magasin;
    if (!m) return '';
    return [m.adresse, m.ville, m.region].filter(Boolean).join(' ');
  }

  get isOpen(): boolean {
    const m = this.magasin;
    if (!m?.horaires_ouverture || !m?.jours_ouverture) return false;
    const now = new Date();
    const jours = (m.jours_ouverture || '').toLowerCase().split(',').map(j => j.trim());
    const jourActuel = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'][now.getDay()];
    if (!jours.includes(jourActuel)) return false;
    const h = m.horaires_ouverture;
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

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }
}
