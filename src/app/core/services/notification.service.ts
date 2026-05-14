import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private notifications: Notification[] = [];

  constructor() { }

  // Ajouter une notification
  show(notification: Omit<Notification, 'id' | 'timestamp'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: Date.now(),
      duration: notification.duration || 4000
    };

    this.notifications.push(newNotification);
    this.updateNotifications();

    // Auto-suppression après la durée
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.remove(newNotification.id);
      }, newNotification.duration);
    }
  }

  // Méthodes raccourcies
  success(message: string, title: string = 'Succès'): void {
    this.show({
      type: 'success',
      title,
      message,
      duration: 3000
    });
  }

  error(message: string, title: string = 'Erreur'): void {
    this.show({
      type: 'error',
      title,
      message,
      duration: 5000
    });
  }

  warning(message: string, title: string = 'Attention'): void {
    this.show({
      type: 'warning',
      title,
      message,
      duration: 4000
    });
  }

  info(message: string, title: string = 'Information'): void {
    this.show({
      type: 'info',
      title,
      message,
      duration: 3000
    });
  }

  // Supprimer une notification spécifique
  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.updateNotifications();
  }

  // Vider toutes les notifications
  clear(): void {
    this.notifications = [];
    this.updateNotifications();
  }

  // Mettre à jour le BehaviorSubject
  private updateNotifications(): void {
    this.notificationsSubject.next([...this.notifications]);
  }

  // Générer un ID unique
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
