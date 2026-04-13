import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-poid-lourds-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './velo-list.component.html',
  styleUrls: ['./velo-list.component.css']
})
export class VeloListComponen {

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