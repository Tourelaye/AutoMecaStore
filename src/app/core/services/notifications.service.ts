import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface NotificationCount {
  commandes: number;
  avis: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private notificationCount = new BehaviorSubject<NotificationCount>({
    commandes: 0,
    avis: 0,
    total: 0
  });

  // Observable pour que les composants puissent s'abonner
  notificationCount$ = this.notificationCount.asObservable();

  constructor() { }

  // 🔄 Mettre à jour le compteur de commandes
  updateCommandesCount(count: number): void {
    const current = this.notificationCount.value;
    const newCount = {
      commandes: count,
      avis: current.avis,
      total: count + current.avis
    };
    this.notificationCount.next(newCount);
  }

  // 🔄 Mettre à jour le compteur d'avis
  updateAvisCount(count: number): void {
    const current = this.notificationCount.value;
    const newCount = {
      commandes: current.commandes,
      avis: count,
      total: current.commandes + count
    };
    this.notificationCount.next(newCount);
  }

  // 🔄 Mettre à jour tous les compteurs
  updateAllCounts(commandes: number, avis: number): void {
    const newCount = {
      commandes,
      avis,
      total: commandes + avis
    };
    this.notificationCount.next(newCount);
  }

  // 📊 Obtenir le compteur actuel
  getCurrentCount(): NotificationCount {
    return this.notificationCount.value;
  }

  // 🎬 Ajouter une nouvelle commande (incrémente le compteur)
  addNewCommande(): void {
    const current = this.notificationCount.value;
    this.updateCommandesCount(current.commandes + 1);
  }

  // 🎬 Marquer les commandes comme lues (réinitialise le compteur)
  markCommandesAsRead(): void {
    this.updateCommandesCount(0);
  }

  // 🎬 Ajouter un nouvel avis (incrémente le compteur)
  addNewAvis(): void {
    const current = this.notificationCount.value;
    this.updateAvisCount(current.avis + 1);
  }

  // 🎬 Marquer les avis comme lus (réinitialise le compteur)
  markAvisAsRead(): void {
    this.updateAvisCount(0);
  }
}
