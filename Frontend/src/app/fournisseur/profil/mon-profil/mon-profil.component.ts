import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FournisseurService, FournisseurProfile } from '../../services/fournisseur.service';

interface BanqueInfo {
  nom: string;
  iban: string;
  mobileMoney: string;
}

interface FournisseurProfil {
  nom: string;
  logo?: string;
  dateInscription: string;
  description: string;
  adresse: string;
  email: string;
  telephone: string;
  ninea: string;
  agreeNinea: boolean;
  banque: BanqueInfo;
}

@Component({
  selector: 'app-mon-profil',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mon-profil.component.html',
  styleUrls: ['./mon-profil.component.css']
})
export class MonProfilComponent implements OnInit {

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  fournisseur: FournisseurProfil = {
    nom: '',
    logo: '',
    dateInscription: '',
    description: '',
    adresse: '',
    email: '',
    telephone: '',
    ninea: '',
    agreeNinea: false,
    banque: {
      nom: '',
      iban: '',
      mobileMoney: ''
    }
  };

  constructor(
    private router: Router,
    private fournisseurService: FournisseurService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.fournisseurService.getProfile().subscribe({
      next: (p: FournisseurProfile) => {
        this.fournisseur = {
          nom: p.nom_entreprise || `${p.user?.prenom || ''} ${p.user?.nom || ''}`.trim(),
          logo: p.logo || '',
          dateInscription: p.date_inscription ? new Date(p.date_inscription).toLocaleDateString('fr-FR') : '',
          description: p.description || '',
          adresse: p.user?.adresse || '',
          email: p.user?.email || '',
          telephone: p.user?.telephone || '',
          ninea: p.siret || '',
          agreeNinea: true,
          banque: {
            nom: '',
            iban: '',
            mobileMoney: ''
          }
        };
      },
      error: () => this.showToast('Impossible de charger le profil', 'error')
    });
  }

  ouvrirEdition(): void {
    this.router.navigate(['/fournisseur/profil/modifier']);
  }

  getInitials(nom: string): string {
    if (!nom) return 'AM';
    const words = nom.trim().split(' ');
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return nom.substring(0, 2).toUpperCase();
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
    this.fournisseur.logo = '';
  }

  private showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toastMsg = msg;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 3000);
  }
}