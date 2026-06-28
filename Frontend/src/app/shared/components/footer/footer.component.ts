import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {

  email = '';
  subscribeSuccess = false;
  subscribeError   = false;

  currentYear = new Date().getFullYear();

  categories = [
    { label: 'Automobile',     route: '/catalog/auto' },
    { label: 'Moto & Scooter', route: '/catalog/moto' },
    { label: 'Vélo & E-bike',  route: '/catalog/velo' },
    { label: 'Poids Lourds',   route: '/catalog/poidLourds' },
  ];

  services = [
    { label: 'FAQ',                    route: '/faq' },
    { label: 'Contact',                route: '/aide' },
    { label: 'Retours & Remboursements', route: '/aide' },
    { label: 'Garantie',               route: '/aide' },
  ];

  compte = [
    { label: 'Connexion',          route: '/login' },
    { label: 'Inscription',        route: '/register' },
    { label: 'Mes commandes',      route: '/mes-commandes' },
    { label: 'Ma liste d\'envies', route: '/mes-favoris' },
  ];

  socials = [
    { icon: 'bi-facebook',  url: '#', color: '#1877f2' },
    { icon: 'bi-instagram', url: '#', color: '#e1306c' },
    { icon: 'bi-twitter-x', url: '#', color: '#ffffff' },
    { icon: 'bi-youtube',   url: '#', color: '#ff0000' },
  ];

  onSubscribe(): void {
    this.subscribeError   = false;
    this.subscribeSuccess = false;

    if (!this.email || !this.email.includes('@')) {
      this.subscribeError = true;
      return;
    }

    // TODO: brancher sur l'API Django
    this.subscribeSuccess = true;
    this.email = '';
    setTimeout(() => this.subscribeSuccess = false, 4000);
  }
}