import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-statistiques-fournisseur',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistiques-fournisseur.component.html',
  styleUrls: ['./statistiques-fournisseur.component.css']
})
export class StatistiquesFournisseurComponent {
  selectedPeriod = 'month';
  periods = ['week', 'month', 'quarter', 'year'];

  onPeriodChange(period: string): void {
    this.selectedPeriod = period;
  }
}
