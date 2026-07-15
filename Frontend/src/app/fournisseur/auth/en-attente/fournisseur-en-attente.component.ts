import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-fournisseur-en-attente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fournisseur-en-attente.component.html',
  styleUrls: ['./fournisseur-en-attente.component.css']
})
export class FournisseurEnAttenteComponent {

  isRefreshing = false;
  readonly currentYear = new Date().getFullYear();

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  // Recharge la page pour re-déclencher les guards/résolveurs
  // et vérifier si le compte a été validé entre-temps.
  refreshStatus(): void {
    this.isRefreshing = true;
    setTimeout(() => window.location.reload(), 400);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/fournisseur/login', { replaceUrl: true });
  }
}