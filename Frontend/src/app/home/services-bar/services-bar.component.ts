import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-services-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './services-bar.component.html',
  styleUrls: ['./services-bar.component.css']
})
export class ServicesBarComponent {
  services = [
    {
      icon: 'bi-truck',
      title: 'Livraison Express',
      desc: '24-48h à Dakar & régions',
      color: '#3b82f6'
    },
    {
      icon: 'bi-shield-check',
      title: 'Paiement Sécurisé',
      desc: 'Transactions protégées',
      color: '#22c55e'
    },
    {
      icon: 'bi-headset',
      title: 'Support 24/7',
      desc: 'Assistance technique gratuite',
      color: '#ff5a00'
    },
    {
      icon: 'bi-patch-check-fill',
      title: 'Qualité Garantie',
      desc: 'Pièces certifiées OEM',
      color: '#8b5cf6'
    }
  ];
}
