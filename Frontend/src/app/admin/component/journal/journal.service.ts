import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export type LogCategory = 'securite' | 'finances' | 'vendeurs' | 'categories' | 'systeme';

export interface LogEntry {
  id: string;
  date: string; // jj/mm/aaaa
  time: string; // hh:mm:ss
  category: LogCategory;
  action: string;
  adminUser: string;
  ipAddress: string;
  description: string;
}

const MOCK_LOGS: LogEntry[] = [
  {
    id: 'log_1', date: '05/07/2026', time: '01:10:24', category: 'securite',
    action: "Connexion de l'administrateur", adminUser: 'Thomas Admin (Principal)', ipAddress: '192.168.1.52',
    description: "Authentification réussie sur le panneau d'administration de la marketplace."
  },
  {
    id: 'log_2', date: '03/07/2026', time: '14:30:00', category: 'finances',
    action: 'Remboursement de commande', adminUser: 'Thomas Admin (Principal)', ipAddress: '192.168.1.52',
    description: "Validation du remboursement de 115.00 € au client Jean Dupont pour l'ordre ORD-20260705-1029."
  },
  {
    id: 'log_3', date: '03/07/2026', time: '14:28:00', category: 'vendeurs',
    action: "Suspension d'un fournisseur", adminUser: 'Thomas Admin (Principal)', ipAddress: '192.168.1.52',
    description: 'Suspension administrative du fournisseur "CarHacker Paris" suite à des plaintes de non-expédition répétées.'
  },
  {
    id: 'log_4', date: '02/07/2026', time: '10:15:00', category: 'categories',
    action: "Création d'une catégorie", adminUser: 'Thomas Admin (Principal)', ipAddress: '192.168.1.52',
    description: 'Ajout de la nouvelle catégorie "Transmission" au catalogue global.'
  },
  {
    id: 'log_5', date: '04/07/2026', time: '18:22:11', category: 'systeme',
    action: 'Mise à jour des frais de plateforme', adminUser: 'Thomas Admin (Principal)', ipAddress: '192.168.1.52',
    description: 'Modification du taux de commission standard de la plateforme à 10.0%.'
  }
];

@Injectable({ providedIn: 'root' })
export class JournalService {
  // Même approche que les autres modules : 100% en mémoire pour l'instant.
  // NB: dans une vraie implémentation, ce journal devrait être écrit
  // uniquement côté serveur (append-only), jamais modifiable depuis le front.
  private data: LogEntry[] = [...MOCK_LOGS];

  getAll(): Observable<LogEntry[]> {
    return of([...this.data].sort((a, b) => this.toTimestamp(b) - this.toTimestamp(a))).pipe(delay(150));
  }

  clear(): Observable<void> {
    this.data = [];
    return of(void 0).pipe(delay(200));
  }

  private toTimestamp(entry: LogEntry): number {
    const [d, m, y] = entry.date.split('/').map(Number);
    return new Date(y, m - 1, d, ...(entry.time.split(':').map(Number) as [number, number, number])).getTime();
  }
}