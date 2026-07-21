import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { HeaderService, Notification as RawNotification } from '../component/header/header.service';

export interface AdminNotification {
  id: number | string;
  type: 'order' | 'stock' | 'client' | 'produit' | 'system' | string;
  message: string;
  time: string;
  read: boolean;
  data?: any;
  lien?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminNotificationsService {
  private headerService = inject(HeaderService);

  private notificationsSubject = new BehaviorSubject<AdminNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  // Persist read/deleted state during the session
  private readIds = new Set<string | number>();
  private deletedIds = new Set<string | number>();

  getNotifications(): Observable<AdminNotification[]> {
    this.loadingSubject.next(true);
    return new Observable<AdminNotification[]>(observer => {
      const sub = this.headerService.getNotifications().subscribe({
        next: (response) => {
          const mapped = (response.notifications ?? [])
            .filter(n => !this.deletedIds.has(n.id))
            .map(n => this.mapRaw(n));
          this.notificationsSubject.next(mapped);
          observer.next(mapped);
          observer.complete();
        },
        error: (err) => {
          this.notificationsSubject.next([]);
          observer.error(err);
        }
      });
      return () => sub.unsubscribe();
    }).pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }

  markAsRead(id: number | string): void {
    this.readIds.add(id);
    const updated = this.notificationsSubject.value.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notificationsSubject.next(updated);
  }

  markAllRead(): void {
    this.notificationsSubject.value.forEach(n => this.readIds.add(n.id));
    const updated = this.notificationsSubject.value.map(n => ({ ...n, read: true }));
    this.notificationsSubject.next(updated);
  }

  deleteNotification(id: number | string): void {
    this.deletedIds.add(id);
    const updated = this.notificationsSubject.value.filter(n => n.id !== id);
    this.notificationsSubject.next(updated);
  }

  clearAll(): Observable<{ message: string }> {
    return new Observable<{ message: string }>(observer => {
      const sub = this.headerService.clearNotifications().subscribe({
        next: (res) => {
          this.readIds.clear();
          this.deletedIds.clear();
          this.notificationsSubject.next([]);
          observer.next(res);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
      return () => sub.unsubscribe();
    });
  }

  getUnreadCount(): number {
    return this.notificationsSubject.value.filter(n => !n.read).length;
  }

  private mapRaw(n: RawNotification): AdminNotification {
    return {
      ...n,
      lien: n.data?.lien ?? undefined
    };
  }
}
