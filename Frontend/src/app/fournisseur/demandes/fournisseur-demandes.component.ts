import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandeService, Demande, Offre } from '../../core/services/demande.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-fournisseur-demandes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fournisseur-demandes.component.html',
  styleUrls: ['./fournisseur-demandes.component.css']
})
export class FournisseurDemandesComponent implements OnInit {
  demandes: Demande[] = [];
  loading = true;
  selectedDemande: Demande | null = null;
  offreForm = {
    prix: 0,
    etat: 'neuf',
    garantie: '',
    disponibilite: 'en_stock',
    delai: '',
    mode_reception: 'livraison',
    description: ''
  };
  submitting = false;
  filtreVille = '';
  filtreMarque = '';

  constructor(
    private demandeService: DemandeService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.demandeService.getDemandesFournisseur({
      ville: this.filtreVille,
      marque: this.filtreMarque
    }).subscribe({
      next: (data) => {
        this.demandes = data;
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Impossible de charger les demandes', 'Erreur');
        this.loading = false;
      }
    });
  }

  openOffer(d: Demande): void {
    this.selectedDemande = d;
    this.offreForm = {
      prix: 0,
      etat: 'neuf',
      garantie: '',
      disponibilite: 'en_stock',
      delai: '',
      mode_reception: 'livraison',
      description: ''
    };
  }

  closeOffer(): void {
    this.selectedDemande = null;
  }

  soumettreOffre(): void {
    if (!this.selectedDemande || !this.offreForm.prix) { return; }
    this.submitting = true;
    this.demandeService.creerOffre(this.selectedDemande.id, this.offreForm).subscribe({
      next: () => {
        this.notificationService.success('Votre offre a été envoyée', 'Offre enregistrée');
        this.submitting = false;
        this.selectedDemande = null;
        this.load();
      },
      error: (err: any) => {
        this.submitting = false;
        this.notificationService.error(err?.error?.error || 'Erreur', 'Envoi impossible');
      }
    });
  }
}
