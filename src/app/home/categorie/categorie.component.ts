import { Component, OnInit } from '@angular/core';
import { CategorieService } from '../../services/categorie.service';
import { Categorie } from '../../models/categorie.model';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-categorie',
  standalone: true,
  imports: [
    CommonModule,   // ✅ pour *ngFor, *ngIf
    RouterModule    // ✅ pour routerLink
  ],
  templateUrl: './categorie.component.html',
  styleUrls: ['./categorie.component.css']
})
export class CategorieComponent implements OnInit {

  categories: Categorie[] = [];

  constructor(private categorieService: CategorieService) {}

  ngOnInit(): void {
    this.categorieService.getCategories().subscribe(data => {
      this.categories = data;
    });
  }

}