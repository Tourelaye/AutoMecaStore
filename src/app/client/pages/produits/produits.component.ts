import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanierService } from '../../../core/services/panier.service';
import { Produit } from '../../../models/produit.model';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';
import {
  trigger,
  transition,
  style,
  animate
} from '@angular/animations';

@Component({
  selector: 'app-produits',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './produits.component.html',
  styleUrls: ['./produits.component.css', '../../../shared/styles/scroll-reveal.css'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(15px)' }),
        animate('300ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in',
          style({ opacity: 0, transform: 'translateY(10px)' }))
      ])
    ])
  ]
})
export class ProduitsComponent {

  produit: Produit = {
    id: 1,
    nom: 'Filtre à huile BMW E90',
    description: 'Filtre de haute qualité pour moteur...',
    prix: 12990,
    stock: 25,
    image: 'https://via.placeholder.com/300',
    categorie: 0,
    gestionnaire_stock: 0
  };

  produits: Produit[] = [
    {
      id: 2,
      nom: 'Filtre à air BMW E90',
      description: 'Filtre performant',
      prix: 18990,
      stock: 20,
      image: 'https://via.placeholder.com/150',
      categorie: 0,
      gestionnaire_stock: 0
    },
    {
      id: 3,
      nom: 'Filtre habitacle BMW E90',
      description: 'Bonne qualité',
      prix: 15990,
      stock: 15,
      image: 'https://via.placeholder.com/150',
      categorie: 0,
      gestionnaire_stock: 0
    },
    {
      id: 4,
      nom: 'Filtre carburant BMW E90',
      description: 'Top qualité',
      prix: 22990,
      stock: 0,
      image: 'https://via.placeholder.com/150',
      categorie: 0,
      gestionnaire_stock: 0
    }
  ];

  images: string[] = [
    'https://via.placeholder.com/300',
    'https://via.placeholder.com/300'
  ];

  quantity: number = 1;

  // ✅ tab dynamique
  activeTab: string = 'description';

  constructor(private panierService: PanierService) {}

  setTab(tab: string): void {
    this.activeTab = tab;
  }

  increase(): void {
    this.quantity++;
  }

  decrease(): void {
    if (this.quantity > 1) this.quantity--;
  }

  addToCart(produit: Produit): void {
    this.panierService.ajouterProduit({
      ...produit,
      quantite: this.quantity
    });
  
  }
}