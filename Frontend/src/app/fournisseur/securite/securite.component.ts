import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SecurityService, SecurityActivity, UserSession, APIToken, TwoFactorResponse } from '../../core/services/security.service';
import { AuthService } from '../../core/services/auth.service';

interface PasswordForm {
  current: string;
  new: string;
  confirm: string;
}

interface AlertMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

@Component({
  selector: 'app-securite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './securite.component.html',
  styleUrls: ['./securite.component.css']
})
export class SecuriteComponent implements OnInit {
  private securityService = inject(SecurityService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Global
  loading = false;
  alerts: AlertMessage[] = [];

  // Password
  passwordForm: PasswordForm = { current: '', new: '', confirm: '' };

  // 2FA
  twoFactorEnabled = false;
  emailAlertsEnabled = true;
  twoFactorSecret: string | null = null;
  twoFactorQrUrl: string | null = null;
  backupCodes: string[] = [];
  showBackupCodes = false;

  // Sessions
  sessions: UserSession[] = [];
  currentSessionKey = '';

  // Activity
  activities: SecurityActivity[] = [];

  // Tokens
  tokens: APIToken[] = [];
  newTokenName = '';
  lastCreatedTokenKey: string | null = null;

  // Account
  deactivatePassword = '';

  // Overview
  overview: any = {};

  ngOnInit(): void {
    this.currentSessionKey = localStorage.getItem('security_session_key') || '';
    this.loadAll();
  }

  private loadAll(): void {
    this.loading = true;
    this.registerCurrentSession();
    this.loadOverview();
    this.loadTwoFactor();
    this.loadSessions();
    this.loadActivity();
    this.loadTokens();
    this.loading = false;
  }

  registerCurrentSession(): void {
    const device = this.guessDeviceName();
    this.securityService.registerSession(device).subscribe({
      error: (err) => console.error('Session registration failed', err)
    });
  }

  private loadOverview(): void {
    this.securityService.getOverview().subscribe({
      next: (data) => this.overview = data,
      error: () => this.addAlert('error', 'Impossible de charger le résumé de sécurité.')
    });
  }

  private loadTwoFactor(): void {
    this.securityService.getTwoFactor().subscribe({
      next: (data) => {
        this.twoFactorEnabled = data.enabled;
        this.emailAlertsEnabled = data.email_alerts_enabled;
      },
      error: () => this.addAlert('error', 'Impossible de charger la configuration 2FA.')
    });
  }

  private loadSessions(): void {
    this.securityService.getSessions().subscribe({
      next: (data) => this.sessions = data,
      error: () => this.addAlert('error', 'Impossible de charger les sessions actives.')
    });
  }

  private loadActivity(): void {
    this.securityService.getActivity().subscribe({
      next: (data) => this.activities = data,
      error: () => this.addAlert('error', 'Impossible de charger l\'historique d\'activité.')
    });
  }

  private loadTokens(): void {
    this.securityService.getTokens().subscribe({
      next: (data) => this.tokens = data,
      error: () => this.addAlert('error', 'Impossible de charger les clés API.')
    });
  }

  addAlert(type: 'success' | 'error' | 'info', text: string): void {
    this.alerts.push({ type, text });
    setTimeout(() => this.alerts.shift(), 6000);
  }

  clearAlert(index: number): void {
    this.alerts.splice(index, 1);
  }

  changePassword(): void {
    if (this.passwordForm.new !== this.passwordForm.confirm) {
      this.addAlert('error', 'Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (this.passwordForm.new.length < 8) {
      this.addAlert('error', 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    this.securityService.changePassword(this.passwordForm.current, this.passwordForm.new).subscribe({
      next: () => {
        this.addAlert('success', 'Mot de passe mis à jour avec succès.');
        this.passwordForm = { current: '', new: '', confirm: '' };
        this.loadOverview();
        this.loadActivity();
      },
      error: (err) => this.addAlert('error', err?.error?.error || 'Erreur lors du changement de mot de passe.')
    });
  }

  toggleTwoFactor(): void {
    const newState = !this.twoFactorEnabled;
    this.securityService.setTwoFactor(newState, this.emailAlertsEnabled).subscribe({
      next: (res: TwoFactorResponse) => {
        this.twoFactorEnabled = res.enabled;
        this.twoFactorSecret = res.secret;
        this.twoFactorQrUrl = res.otpauth_url;
        this.backupCodes = res.backup_codes;
        this.showBackupCodes = newState;
        if (newState) {
          this.addAlert('info', '2FA activé. Sauvegardez impérativement les codes de secours.');
        } else {
          this.addAlert('info', '2FA désactivé.');
        }
        this.loadOverview();
        this.loadActivity();
      },
      error: (err) => this.addAlert('error', err?.error?.error || 'Erreur lors de la configuration 2FA.')
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => this.addAlert('success', 'Copié dans le presse-papiers.'));
  }

  downloadBackupCodes(): void {
    const blob = new Blob([this.backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codes-secours-automeca.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  revokeSession(session: UserSession): void {
    if (session.is_current) {
      this.addAlert('error', 'Vous ne pouvez pas révoquer votre session active.');
      return;
    }
    this.securityService.revokeSession(session.session_key).subscribe({
      next: () => {
        this.addAlert('success', 'Session révoquée.');
        this.loadSessions();
        this.loadActivity();
      },
      error: (err) => this.addAlert('error', err?.error?.error || 'Erreur lors de la révocation.')
    });
  }

  revokeOtherSessions(): void {
    this.securityService.revokeOtherSessions().subscribe({
      next: (res) => {
        this.addAlert('success', res.message);
        this.loadSessions();
        this.loadActivity();
      },
      error: (err) => this.addAlert('error', err?.error?.error || 'Erreur lors de la révocation des autres sessions.')
    });
  }

  createToken(): void {
    if (!this.newTokenName.trim()) {
      this.addAlert('error', 'Veuillez nommer la clé API.');
      return;
    }
    this.securityService.createToken(this.newTokenName.trim()).subscribe({
      next: (token) => {
        this.lastCreatedTokenKey = token.key;
        this.newTokenName = '';
        this.loadTokens();
        this.addAlert('info', 'Clé API créée. Copiez-la maintenant, elle ne sera plus affichée.');
        this.loadActivity();
      },
      error: (err) => this.addAlert('error', err?.error?.error || 'Erreur lors de la création de la clé API.')
    });
  }

  revokeToken(tokenId: number): void {
    this.securityService.revokeToken(tokenId).subscribe({
      next: () => {
        this.addAlert('success', 'Clé API révoquée.');
        this.loadTokens();
        this.loadActivity();
      },
      error: (err) => this.addAlert('error', err?.error?.error || 'Erreur lors de la révocation de la clé.')
    });
  }

  logoutAll(): void {
    this.securityService.logoutAll().subscribe({
      next: () => {
        this.addAlert('success', 'Toutes les sessions ont été fermées.');
        this.authService.logout();
        this.router.navigate(['/fournisseur/login']);
      },
      error: (err) => this.addAlert('error', err?.error?.error || 'Erreur lors de la déconnexion globale.')
    });
  }

  deactivateAccount(): void {
    if (!confirm('Êtes-vous sûr de vouloir désactiver votre compte ? Cette action est irréversible.')) return;
    this.securityService.deactivateAccount(this.deactivatePassword).subscribe({
      next: () => {
        this.addAlert('success', 'Compte désactivé.');
        this.authService.logout();
        this.router.navigate(['/fournisseur/login']);
      },
      error: (err) => this.addAlert('error', err?.error?.error || 'Erreur lors de la désactivation du compte.')
    });
  }

  formatDate(iso: string | null): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('fr-FR');
  }

  private guessDeviceName(): string {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return 'Mobile';
    if (/iPad|Tablet/i.test(ua)) return 'Tablette';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Appareil inconnu';
  }

  toggleEmailAlerts(): void {
    // Saved together with 2FA settings
    this.securityService.setTwoFactor(this.twoFactorEnabled, this.emailAlertsEnabled).subscribe({
      next: (res) => this.addAlert('success', 'Préférences de notification mises à jour.'),
      error: (err) => this.addAlert('error', 'Erreur lors de la mise à jour des alertes.')
    });
  }

  activityIcon(actionCode?: string): string {
    switch (actionCode) {
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
}

