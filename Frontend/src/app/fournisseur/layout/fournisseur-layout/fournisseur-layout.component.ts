import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarFournisseurComponent } from '../../layout/sidebar-fournisseur/sidebar-fournisseur.component';
import { NavbarFournisseurComponent } from '../../layout/navbar-fournisseur/navbar-fournisseur.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fournisseur-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarFournisseurComponent, NavbarFournisseurComponent],
  templateUrl: './fournisseur-layout.component.html',
  styleUrls: ['./fournisseur-layout.component.css']
})
export class FournisseurLayoutComponent {
  isSidebarCollapsed = false;

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
