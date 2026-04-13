import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-poid-lourds-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './poid-lourds-list.component.html',
  styleUrls: ['./poid-lourds-list.component.css']
})
export class PoidLourdsListComponen {

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