import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-moto-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './moto-list.component.html',
  styleUrls: ['./moto-list.component.css']
})
export class MotoListComponent {

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

}