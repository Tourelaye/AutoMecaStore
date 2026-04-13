import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PanierService } from '../../../core/services/panier.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {

  totalPanier = 0;
  notification: string | null = null;

  private hideTimer: any;
  private subscriptions: Subscription[] = [];

  constructor(private panierService: PanierService) {}

  ngOnInit() {

    const sub1 = this.panierService.items$.subscribe((items) => {
      this.totalPanier = items.reduce((total, item) => total + item.quantite, 0);
    });

    const sub2 = this.panierService.lastAdded$.subscribe((productName) => {

      if (!productName) {
        this.notification = null;
        return;
      }

      this.notification = `✅ ${productName} ajouté au panier`;

      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
      }

      this.hideTimer = setTimeout(() => {
        this.notification = null;
        this.panierService.clearNotification();
      }, 2500);

    });

    this.subscriptions.push(sub1, sub2);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}