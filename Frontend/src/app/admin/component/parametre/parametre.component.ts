import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import {
  ParametresService,
  AdminProfile,
  FinanceConfig,
  PaymentGateway,
  RolePermission,
  ApiConfig
} from './parametre.service';

type TabId = 'profil' | 'finance' | 'passerelles' | 'roles';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametre.component.html',
  styleUrls: ['./parametre.component.css']
})
export class ParametresComponent implements OnInit {
  activeTab: TabId = 'profil';

  tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'profil', label: 'Profil Administrateur', icon: 'bi-person' },
    { id: 'finance', label: 'Commissions & Taxes', icon: 'bi-percent' },
    { id: 'passerelles', label: 'Passerelles de paiement', icon: 'bi-credit-card' },
    { id: 'roles', label: 'Rôles & Permissions API', icon: 'bi-shield-check' }
  ];

  loading = true;

  // --- Profil ---
  profileForm: { fullName: string; email: string; password: string } = { fullName: '', email: '', password: '' };
  savingProfile = false;
  profileSaved = false;

  // --- Finance ---
  financeForm: FinanceConfig = { commissionRate: 0, vatRate: 0, baseShippingFee: 0 };
  savingFinance = false;
  financeSaved = false;

  // --- Passerelles ---
  gateways: PaymentGateway[] = [];
  pendingDisableGateway: PaymentGateway | null = null;

  // --- Rôles (lecture seule) ---
  roles: RolePermission[] = [];
  apiConfig: ApiConfig | null = null;
  copiedField: string | null = null;

  constructor(private parametresService: ParametresService) {}

  ngOnInit(): void {
    this.loading = true;

    this.parametresService.getProfile().subscribe((profile: AdminProfile) => {
      this.profileForm = { fullName: profile.fullName, email: profile.email, password: '' };
    });

    this.parametresService.getFinanceConfig().subscribe((finance: FinanceConfig) => {
      this.financeForm = { ...finance };
    });

    this.parametresService.getGateways().subscribe((gateways: PaymentGateway[]) => {
      this.gateways = gateways;
    });

    this.parametresService.getRoles().subscribe((roles: RolePermission[]) => {
      this.roles = roles;
    });

    this.parametresService.getApiConfig().subscribe((config: ApiConfig) => {
      this.apiConfig = config;
      this.loading = false;
    });
  }

  selectTab(id: TabId): void {
    this.activeTab = id;
  }

  // --- Profil ---
  saveProfile(form: NgForm): void {
    if (form.invalid) {
      Object.values(form.controls).forEach(c => c.markAsTouched());
      return;
    }
    this.savingProfile = true;
    this.profileSaved = false;
    const payload = {
      fullName: this.profileForm.fullName,
      email: this.profileForm.email,
      password: this.profileForm.password || undefined
    };
    this.parametresService.saveProfile(payload).subscribe(() => {
      this.savingProfile = false;
      this.profileSaved = true;
      this.profileForm.password = '';
      form.form.markAsPristine();
      setTimeout(() => (this.profileSaved = false), 2500);
    });
  }

  // --- Finance ---
  saveFinance(form: NgForm): void {
    if (form.invalid) {
      Object.values(form.controls).forEach(c => c.markAsTouched());
      return;
    }
    this.savingFinance = true;
    this.financeSaved = false;
    this.parametresService.saveFinanceConfig(this.financeForm).subscribe(() => {
      this.savingFinance = false;
      this.financeSaved = true;
      form.form.markAsPristine();
      setTimeout(() => (this.financeSaved = false), 2500);
    });
  }

  // --- Passerelles ---
  onGatewayToggle(g: PaymentGateway): void {
    if (g.enabled) {
      // Désactiver un moyen de paiement est sensible (impacte le checkout) → confirmation requise
      this.pendingDisableGateway = g;
      return;
    }
    this.parametresService.toggleGateway(g.id).subscribe((updated: PaymentGateway) => this.replaceGateway(updated));
  }

  cancelDisableGateway(): void {
    this.pendingDisableGateway = null;
  }

  confirmDisableGateway(): void {
    if (!this.pendingDisableGateway) return;
    const id = this.pendingDisableGateway.id;
    this.parametresService.toggleGateway(id).subscribe((updated: PaymentGateway) => {
      this.replaceGateway(updated);
      this.pendingDisableGateway = null;
    });
  }

  private replaceGateway(updated: PaymentGateway): void {
    this.gateways = this.gateways.map(g => (g.id === updated.id ? updated : g));
  }

  // --- Rôles / API config ---
  copyToClipboard(value: string, field: string): void {
    navigator.clipboard?.writeText(value).then(() => {
      this.copiedField = field;
      setTimeout(() => (this.copiedField = null), 1500);
    });
  }
}