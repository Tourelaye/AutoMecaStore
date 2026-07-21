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
  ) {
    this.checkValidated();
  }

  get statut(): string {
    return this.authService.getUtilisateur()?.statut || 'attente';
  }

  get raisonRefus(): string {
    return this.authService.getUtilisateur()?.raisonRefus || '';
  }

  get isRefused(): boolean {
    return this.statut === 'desactive';
  }

  private checkValidated(): void {
    if (this.authService.isFournisseurValidated()) {
      this.router.navigateByUrl('/fournisseur/dashboard', { replaceUrl: true });
    }
  }

  refreshStatus(): void {
    this.isRefreshing = true;
    this.authService.fetchProfil().subscribe({
      next: () => {
        this.isRefreshing = false;
        window.location.reload();
      },
      error: () => {
        this.isRefreshing = false;
        window.location.reload();
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/fournisseur/login', { replaceUrl: true });
  }
}