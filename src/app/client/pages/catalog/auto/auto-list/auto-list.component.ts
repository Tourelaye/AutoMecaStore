import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
@Component({
  selector: 'app-auto-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auto-list.component.html',
  styleUrls: ['./auto-list.component.css']
})
export class AutoListComponent {

  showFilters = true;

  viewMode: 'grid' | 'list' = 'grid';

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  setGrid() {
    this.viewMode = 'grid';
  }

  setList() {
    this.viewMode = 'list';
  }
constructor(private router: Router) {}

  goToProduits() {
    this.router.navigate(['/produits']);
  }

}