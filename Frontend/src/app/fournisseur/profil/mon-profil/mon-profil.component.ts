import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

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
export class MonProfilComponent {

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  // TODO: remplacer par un appel API (getProfilFournisseur())
  fournisseur: FournisseurProfil = {
    nom: 'AutoMeca Dakar Distribution (AMDD)',
    logo: '',
    dateInscription: '15 Janvier 2024',
    description: `Distributeur agréé de pièces détachées d'origine et première monte pour automobiles, deux-roues et poids lourds. Présent sur le marché ouest-africain depuis 2018.`,
    adresse: 'Zone Industrielle SODIDA, Rue 14 x 22, Dakar, Sénégal',
    email: 'contact@automeca-dakar.sn',
    telephone: '+221 77 845 20 30',
    ninea: '005489212G3',
    agreeNinea: true,
    banque: {
      nom: 'CBAO Groupe Attijariwafa Bank',
      iban: 'SN012 01001 034567890123 45',
      mobileMoney: '+221 77 845 20 30 (Wave / Orange Money)'
    }
  };

  constructor(private router: Router) {}

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

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => (this.toastMsg = ''), 3000);
  }
}