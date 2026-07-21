import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, Utilisateur } from '../../../core/services/auth.service';
import { SecurityService, SecurityActivity, SecurityOverview } from '../../../core/services/security.service';
import { finalize, take } from 'rxjs';

interface AlertMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

@Component({
  selector: 'app-admin-profil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css']
})
export class ProfilComponent implements OnInit {
  private authService = inject(AuthService);
  private securityService = inject(SecurityService);

  user: Utilisateur | null = null;
  isEditing = false;
  loading = false;
  alerts: AlertMessage[] = [];

  form = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: ''
  };

  avatarFile: File | null = null;
  avatarPreview: string | null = null;

  preferences = {
    emailNotifications: true,
    darkMode: true,
    compactSidebar: false
  };

  overview: Partial<SecurityOverview> = {};
  recentActivity: SecurityActivity[] = [];
  activityLoading = false;

  ngOnInit(): void {
    this.authService.utilisateur$.subscribe(u => {
      this.user = u;
      if (u) {
        this.form = {
          nom: u.nom || '',
          prenom: u.prenom || '',
          email: u.email || '',
          telephone: u.telephone || '',
          adresse: u.adresse || ''
        };
      }
    });

    this.loadPreferences();
    this.loadOverview();
    this.loadActivity();
  }

  private loadPreferences(): void {
    const stored = localStorage.getItem('admin_preferences');
    if (stored) {
      try {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      } catch {}
    }
  }

  savePreferences(): void {
    localStorage.setItem('admin_preferences', JSON.stringify(this.preferences));
    this.addAlert('success', 'Préférences enregistrées.');
  }

  private loadOverview(): void {
    this.securityService.getOverview().subscribe({
      next: (data) => this.overview = data,
      error: () => this.addAlert('error', 'Impossible de charger le résumé de sécurité.')
    });
  }

  private loadActivity(): void {
    this.activityLoading = true;
    this.securityService.getActivity().pipe(finalize(() => this.activityLoading = false)).subscribe({
      next: (data) => this.recentActivity = data.slice(0, 6),
      error: () => this.addAlert('error', 'Impossible de charger l\'activité récente.')
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing && this.user) {
      this.form = {
        nom: this.user.nom || '',
        prenom: this.user.prenom || '',
        email: this.user.email || '',
        telephone: this.user.telephone || '',
        adresse: this.user.adresse || ''
      };
      this.avatarPreview = null;
      this.avatarFile = null;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.avatarFile = null;
    this.avatarPreview = '';
  }

  saveProfile(): void {
    if (!this.form.nom.trim() || !this.form.prenom.trim() || !this.form.email.trim()) {
      this.addAlert('error', 'Les champs nom, prénom et email sont obligatoires.');
      return;
    }

    this.loading = true;
    const data: Partial<Utilisateur> = {
      nom: this.form.nom,
      prenom: this.form.prenom,
      email: this.form.email,
      telephone: this.form.telephone,
      adresse: this.form.adresse
    };

    if (this.avatarPreview === '') {
      // avatar removed (placeholder until backend supports avatar)
    }

    this.authService.updateProfil(data).pipe(
      take(1),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (updated) => {
        this.user = updated;
        this.isEditing = false;
        this.addAlert('success', 'Profil mis à jour avec succès.');
      },
      error: (err) => {
        this.addAlert('error', err?.error?.error || 'Erreur lors de la mise à jour du profil.');
      }
    });
  }

  getInitials(): string {
    const u = this.user;
    if (!u) return '?';
    return `${u.prenom?.[0] ?? ''}${u.nom?.[0] ?? ''}`.toUpperCase();
  }

  getFullName(): string {
    const u = this.user;
    if (!u) return 'Admin';
    return `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() || 'Admin';
  }

  getRoleLabel(role?: string): string {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'fournisseur': return 'Fournisseur';
      case 'client': return 'Client';
      default: return role || 'Utilisateur';
    }
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('fr-FR');
  }

  timeAgo(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'À l\'instant';
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days} j`;
  }

  activityIcon(code?: string): string {
    switch (code) {
      case 'login': return 'bi-box-arrow-in-right';
      case 'logout': return 'bi-box-arrow-right';
      case 'password_change': return 'bi-key';
      case 'two_factor_enabled': return 'bi-shield-check';
      case 'two_factor_disabled': return 'bi-shield-x';
      case 'session_revoked': return 'bi-slash-circle';
      case 'all_sessions_revoked': return 'bi-power';
      case 'token_created': return 'bi-key-fill';
      case 'token_revoked': return 'bi-trash';
      case 'account_deactivated': return 'bi-person-x';
      default: return 'bi-shield';
    }
  }

  private addAlert(type: 'success' | 'error' | 'info', text: string): void {
    this.alerts.push({ type, text });
    setTimeout(() => this.alerts.shift(), 6000);
  }

  dismissAlert(index: number): void {
    this.alerts.splice(index, 1);
  }
}
