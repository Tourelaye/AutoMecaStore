import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PanierService } from '../../../core/services/panier.service';
import { PanierItem } from '../../../models/panier.model';
import { Subscription } from 'rxjs';

import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './panier.component.html',
  styleUrls: ['./panier.component.css'],

  animations: [
    // 🎬 Animation page
    trigger('pageAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ])
    ]),

    // ⚡ Animation items
    trigger('itemAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('300ms ease-out')
      ]),
      transition(':leave', [
        animate('300ms ease-in',
          style({ opacity: 0, transform: 'translateX(20px)' })
        )
      ])
    ])
  ]
})
export class PanierComponent implements OnDestroy {

  items: PanierItem[] = [];
  private sub!: Subscription;

  constructor(private panierService: PanierService) {
    this.sub = this.panierService.items$.subscribe((items) => {
      this.items = items;
    });
  }

  // 🧮 TOTAL
  get total(): number {
    return this.items.reduce(
      (sum, item) => sum + item.produit.prix * item.quantite,
      0
    );
  }

  // ➕
  increaseQty(item: PanierItem): void {
    this.panierService.augmenterQuantite(item);
  }

  // ➖
  decreaseQty(item: PanierItem): void {
    this.panierService.diminuerQuantite(item);
  }

  // ❌
  removeItem(item: PanierItem): void {
    this.panierService.supprimerLigne(item);
  }

  toggleFavorite(item: PanierItem): void {
    this.panierService.toggleFavori(item);
  }

  // ⚡ PERFORMANCE
  trackById(index: number, item: PanierItem) {
    return item.produit.id;
  }

  // 🧹 CLEAN
  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }
}