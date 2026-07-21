var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b ||= {})
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/app/core/services/auth.service.ts
var auth_service_exports = {};
__export(auth_service_exports, {
  AuthService: () => AuthService
});
import { Injectable as Injectable5, inject, forwardRef } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
import { BehaviorSubject as BehaviorSubject4, tap as tap3 } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/rxjs.js?v=7203ffec";

// src/app/core/services/panier.service.ts
var panier_service_exports = {};
__export(panier_service_exports, {
  PanierService: () => PanierService
});
import { Injectable as Injectable4 } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
import { BehaviorSubject as BehaviorSubject3, Observable } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/rxjs.js?v=7203ffec";
import { tap as tap2 } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/rxjs_operators.js?v=7203ffec";
import * as i04 from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
import * as i13 from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_common_http.js?v=7203ffec";

// src/app/core/services/commande.service.ts
var commande_service_exports = {};
__export(commande_service_exports, {
  CommandeService: () => CommandeService
});
import { Injectable } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
import * as i0 from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
import * as i1 from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_common_http.js?v=7203ffec";
var CommandeService = class _CommandeService {
  http;
  apiUrl = "http://127.0.0.1:8000/api";
  constructor(http) {
    this.http = http;
  }
  // RÃ©cupÃ©rer toutes les commandes du client
  getCommandes() {
    return this.http.get(`${this.apiUrl}/commandes/`);
  }
  // RÃ©cupÃ©rer une commande
  getCommande(id) {
    return this.http.get(`${this.apiUrl}/commandes/${id}/`);
  }
  // CrÃ©er une commande depuis le panier
  creerCommandeDepuisPanier() {
    return this.http.post(`${this.apiUrl}/commande/panier/`, {});
  }
  // CrÃ©er une commande avec des items personnalisÃ©s
  createCommande(data) {
    return this.http.post(`${this.apiUrl}/commandes/create/`, data);
  }
  // Mettre Ã  jour une commande (statut)
  updateCommande(id, data) {
    return this.http.put(`${this.apiUrl}/commandes/${id}/`, data);
  }
  // Supprimer une commande
  deleteCommande(id) {
    return this.http.delete(`${this.apiUrl}/commandes/${id}/`);
  }
  // Convertir les items du panier en format commande
  convertirPanierEnCommandeItems(panierItems) {
    return panierItems.map((item) => ({
      produit: item.produit.id,
      quantite: item.quantite,
      prix_unitaire: item.prix
    }));
  }
  static \u0275fac = function CommandeService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _CommandeService)(i0.\u0275\u0275inject(i1.HttpClient));
  };
  static \u0275prov = /* @__PURE__ */ i0.\u0275\u0275defineInjectable({ token: _CommandeService, factory: _CommandeService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(CommandeService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [{ type: i1.HttpClient }], null);
})();

// src/app/core/services/notification.service.ts
var notification_service_exports = {};
__export(notification_service_exports, {
  NotificationService: () => NotificationService
});
import { Injectable as Injectable2 } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
import { BehaviorSubject } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/rxjs.js?v=7203ffec";
import * as i02 from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
var NotificationService = class _NotificationService {
  notificationsSubject = new BehaviorSubject([]);
  notifications$ = this.notificationsSubject.asObservable();
  notifications = [];
  constructor() {
  }
  // Ajouter une notification
  show(notification) {
    const newNotification = __spreadProps(__spreadValues({}, notification), {
      id: this.generateId(),
      timestamp: Date.now(),
      duration: notification.duration || 4e3
    });
    this.notifications.push(newNotification);
    this.updateNotifications();
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.remove(newNotification.id);
      }, newNotification.duration);
    }
  }
  // MÃ©thodes raccourcies
  success(message, title = "Succ\xE8s") {
    this.show({
      type: "success",
      title,
      message,
      duration: 3e3
    });
  }
  error(message, title = "Erreur") {
    this.show({
      type: "error",
      title,
      message,
      duration: 5e3
    });
  }
  warning(message, title = "Attention") {
    this.show({
      type: "warning",
      title,
      message,
      duration: 4e3
    });
  }
  info(message, title = "Information") {
    this.show({
      type: "info",
      title,
      message,
      duration: 3e3
    });
  }
  // Supprimer une notification spÃ©cifique
  remove(id) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.updateNotifications();
  }
  // Vider toutes les notifications
  clear() {
    this.notifications = [];
    this.updateNotifications();
  }
  // Mettre Ã  jour le BehaviorSubject
  updateNotifications() {
    this.notificationsSubject.next([...this.notifications]);
  }
  // GÃ©nÃ©rer un ID unique
  generateId() {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  static \u0275fac = function NotificationService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NotificationService)();
  };
  static \u0275prov = /* @__PURE__ */ i02.\u0275\u0275defineInjectable({ token: _NotificationService, factory: _NotificationService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassMetadata(NotificationService, [{
    type: Injectable2,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/app/core/services/mon-compte.service.ts
var mon_compte_service_exports = {};
__export(mon_compte_service_exports, {
  MonCompteService: () => MonCompteService
});
import { Injectable as Injectable3 } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
import { HttpHeaders } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_common_http.js?v=7203ffec";
import { BehaviorSubject as BehaviorSubject2, of } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/rxjs.js?v=7203ffec";
import { tap, catchError } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/rxjs_operators.js?v=7203ffec";
import * as i03 from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
import * as i12 from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_common_http.js?v=7203ffec";
var MonCompteService = class _MonCompteService {
  http;
  authService;
  API_URL = "http://127.0.0.1:8000/account";
  // BehaviorSubjects pour la mise Ã  jour automatique
  clientInfoSubject = new BehaviorSubject2(null);
  commandesSubject = new BehaviorSubject2(null);
  favorisSubject = new BehaviorSubject2(null);
  panierSubject = new BehaviorSubject2(null);
  // Observables publics
  clientInfo$ = this.clientInfoSubject.asObservable();
  commandes$ = this.commandesSubject.asObservable();
  favoris$ = this.favorisSubject.asObservable();
  panier$ = this.panierSubject.asObservable();
  constructor(http, authService) {
    this.http = http;
    this.authService = authService;
  }
  // ==============================
  // INFORMATIONS UTILISATEUR
  // ==============================
  getClientInfo() {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.API_URL}/me/`, { headers }).pipe(tap((clientInfo) => {
      this.clientInfoSubject.next(clientInfo);
    }), catchError((error) => {
      console.error("Erreur lors de la r\xE9cup\xE9ration des infos client:", error);
      throw error;
    }));
  }
  updateClientInfo(clientInfo) {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.API_URL}/me/`, clientInfo, { headers }).pipe(tap((updatedInfo) => {
      this.clientInfoSubject.next(updatedInfo);
    }), catchError((error) => {
      console.error("Erreur lors de la mise \xE0 jour des infos client:", error);
      throw error;
    }));
  }
  // ==============================
  // COMMANDES
  // ==============================
  getMesCommandes() {
    const headers = this.getAuthHeaders();
    console.log("\u{1F4E1} GET /mes-commandes/ - Headers:", headers);
    return this.http.get(`${this.API_URL}/mes-commandes/`, { headers }).pipe(tap((commandes) => {
      console.log("\u{1F4E6} COMMANDES API RESPONSE:", commandes);
      this.commandesSubject.next(commandes);
    }), catchError((error) => {
      console.error("\u274C Erreur lors de la r\xE9cup\xE9ration des commandes:", error);
      const emptyResponse = { commandes: [], total: 0 };
      this.commandesSubject.next(emptyResponse);
      return of(emptyResponse);
    }));
  }
  // ==============================
  // FAVORIS
  // ==============================
  getFavoris() {
    const headers = this.getAuthHeaders();
    console.log("\u{1F4E1} GET /favoris/ - Headers:", headers);
    return this.http.get(`${this.API_URL}/favoris/`, { headers }).pipe(tap((favoris) => {
      console.log("\u2764\uFE0F FAVORIS API RAW RESPONSE:", favoris);
      console.log("\u2764\uFE0F FAVORIS ARRAY:", favoris.favoris);
      console.log("\u2764\uFE0F FAVORIS TOTAL:", favoris.total);
      console.log("\u2764\uFE0F FAVORIS LENGTH:", favoris.favoris?.length || 0);
      this.favorisSubject.next(favoris);
      console.log("\u2764\uFE0F FAVORIS SUBJECT UPDATED");
    }), catchError((error) => {
      console.error("\u274C Erreur lors de la r\xE9cup\xE9ration des favoris:", error);
      const emptyResponse = { favoris: [], total: 0 };
      this.favorisSubject.next(emptyResponse);
      return of(emptyResponse);
    }));
  }
  ajouterFavori(produitId) {
    const headers = this.getAuthHeaders();
    console.log("\u{1F4E1} POST /favoris/ - produit_id:", produitId);
    console.log("\u{1F4E1} POST /favoris/ - Headers:", headers);
    return this.http.post(`${this.API_URL}/favoris/`, { produit_id: produitId }, { headers }).pipe(tap((response) => {
      console.log("\u2705 FAVORI POST RESPONSE:", response);
      console.log("\u{1F504} Refreshing favoris after add...");
      this.getFavoris().subscribe({
        next: (data) => console.log("\u2705 Favoris refreshed after add:", data),
        error: (err) => console.error("\u274C Error refreshing favoris:", err)
      });
    }), catchError((error) => {
      console.error("\u274C Erreur lors de l'ajout aux favoris:", error);
      console.error("\u274C Error details:", error.error);
      throw error;
    }));
  }
  retirerFavori(produitId) {
    const headers = this.getAuthHeaders();
    console.log("\u{1F4E1} DELETE /favoris/ - produit_id:", produitId);
    console.log("\u{1F4E1} DELETE /favoris/ - Headers:", headers);
    return this.http.delete(`${this.API_URL}/favoris/`, {
      headers,
      body: { produit_id: produitId }
    }).pipe(tap((response) => {
      console.log("\u2705 FAVORI DELETE RESPONSE:", response);
      console.log("\u{1F504} Refreshing favoris after remove...");
      this.getFavoris().subscribe({
        next: (data) => console.log("\u2705 Favoris refreshed after remove:", data),
        error: (err) => console.error("\u274C Error refreshing favoris:", err)
      });
    }), catchError((error) => {
      console.error("\u274C Erreur lors du retrait des favoris:", error);
      console.error("\u274C Error details:", error.error);
      throw error;
    }));
  }
  // ==============================
  // PANIER
  // ==============================
  getPanier() {
    const headers = this.getAuthHeaders();
    console.log("\u{1F4E1} GET /panier/ - Headers:", headers);
    return this.http.get(`${this.API_URL}/panier/`, { headers }).pipe(tap((panier) => {
      console.log("\u{1F6D2} PANIER API RESPONSE:", panier);
      this.panierSubject.next(panier);
    }), catchError((error) => {
      console.error("\u274C Erreur lors de la r\xE9cup\xE9ration du panier:", error);
      const emptyResponse = { items: [], total: 0, nombre_items: 0 };
      this.panierSubject.next(emptyResponse);
      return of(emptyResponse);
    }));
  }
  supprimerDuPanier(itemId) {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.API_URL}/panier/delete/${itemId}/`, { headers }).pipe(tap(() => {
      this.getPanier().subscribe();
    }), catchError((error) => {
      console.error("Erreur lors de la suppression du panier:", error);
      throw error;
    }));
  }
  mettreAJourQuantite(itemId, quantite) {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.API_URL}/panier/update/${itemId}/`, { quantite }, { headers }).pipe(tap(() => {
      this.getPanier().subscribe();
    }), catchError((error) => {
      console.error("Erreur lors de la mise \xE0 jour de la quantit\xE9:", error);
      throw error;
    }));
  }
  // ==============================
  // UTILITAIRES
  // ==============================
  getAuthHeaders() {
    const token = this.authService.getToken();
    console.log("\u{1F511} TOKEN:", token ? "PR\xC9SENT" : "ABSENT");
    const headers = new HttpHeaders({
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    });
    console.log("\u{1F4CB} HEADERS:", headers);
    return headers;
  }
  // ==============================
  // MISE Ã JOUR AUTOMATIQUE
  // ==============================
  refreshAllData() {
    console.log("\u{1F504} REFRESH ALL DATA APPELE");
    this.getClientInfo().subscribe({
      next: (data) => console.log("\u2705 Client info charg\xE9e:", data),
      error: (err) => console.error("\u274C Erreur client info:", err)
    });
    this.getMesCommandes().subscribe({
      next: (data) => console.log("\u2705 Commandes charg\xE9es:", data),
      error: (err) => console.error("\u274C Erreur commandes:", err)
    });
    this.getFavoris().subscribe({
      next: (data) => console.log("\u2705 Favoris charg\xE9s:", data),
      error: (err) => console.error("\u274C Erreur favoris:", err)
    });
    this.getPanier().subscribe({
      next: (data) => console.log("\u2705 Panier charg\xE9:", data),
      error: (err) => console.error("\u274C Erreur panier:", err)
    });
  }
  // MÃ©thodes utilitaires pour les statuts
  getStatutClass(statut) {
    switch (statut) {
      case "en_attente":
        return "statut-attente";
      case "en_cours":
        return "statut-cours";
      case "paye":
        return "statut-paye";
      case "livre":
        return "statut-livre";
      default:
        return "statut-default";
    }
  }
  getStatutLabel(statut) {
    switch (statut) {
      case "en_attente":
        return "En attente";
      case "en_cours":
        return "En cours";
      case "paye":
        return "Pay\xE9e";
      case "livre":
        return "Livr\xE9e";
      default:
        return statut;
    }
  }
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
  formatPrix(prix) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0
    }).format(prix);
  }
  static \u0275fac = function MonCompteService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MonCompteService)(i03.\u0275\u0275inject(i12.HttpClient), i03.\u0275\u0275inject(AuthService));
  };
  static \u0275prov = /* @__PURE__ */ i03.\u0275\u0275defineInjectable({ token: _MonCompteService, factory: _MonCompteService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i03.\u0275setClassMetadata(MonCompteService, [{
    type: Injectable3,
    args: [{
      providedIn: "root"
    }]
  }], () => [{ type: i12.HttpClient }, { type: AuthService }], null);
})();

// src/app/core/services/panier.service.ts
var PanierService = class _PanierService {
  http;
  authService;
  commandeService;
  notificationService;
  monCompteService;
  apiUrl = "http://127.0.0.1:8000/account";
  itemsSubject = new BehaviorSubject3([]);
  items$ = this.itemsSubject.asObservable();
  lastAddedSubject = new BehaviorSubject3(null);
  lastAdded$ = this.lastAddedSubject.asObservable();
  constructor(http, authService, commandeService, notificationService, monCompteService) {
    this.http = http;
    this.authService = authService;
    this.commandeService = commandeService;
    this.notificationService = notificationService;
    this.monCompteService = monCompteService;
    this.loadFromStorage();
  }
  // =========================
  // STORAGE
  // =========================
  loadFromStorage() {
    const stored = localStorage.getItem("panier_items");
    if (stored) {
      try {
        this.itemsSubject.next(JSON.parse(stored));
      } catch {
        this.itemsSubject.next([]);
      }
    }
  }
  saveToStorage(items) {
    localStorage.setItem("panier_items", JSON.stringify(items));
  }
  // =========================
  // GET ITEMS
  // =========================
  get items() {
    return this.itemsSubject.value;
  }
  save(items) {
    this.itemsSubject.next(items);
    this.saveToStorage(items);
  }
  // =========================
  // ADD PRODUCT
  // =========================
  ajouterAuPanier(item) {
    console.log("\u{1F6D2} Ajout au panier:", item);
    console.log("\u{1F511} Utilisateur authentifi\xE9:", this.authService.isLoggedIn());
    if (this.authService.isLoggedIn()) {
      this.ajouterAuPanierBackend(item.produit.id, item.quantite).subscribe({
        next: (response) => {
          console.log("\u2705 Backend response:", response);
          if (response === null) {
            console.log("\u26A0\uFE0F Backend failed, using localStorage fallback");
            this.ajouterAuPanierLocal(item);
          }
        },
        error: (error) => {
          console.error("\u274C Backend error, using localStorage fallback:", error);
          this.ajouterAuPanierLocal(item);
        }
      });
    } else {
      console.log("\u{1F4E6} Using localStorage (not authenticated)");
      this.ajouterAuPanierLocal(item);
    }
  }
  ajouterAuPanierLocal(item) {
    const items = [...this.items];
    const index = items.findIndex((i) => i.produit.id === item.produit.id);
    if (index !== -1) {
      items[index].quantite += item.quantite;
    } else {
      items.push(__spreadProps(__spreadValues({}, item), {
        favori: false
      }));
    }
    this.save(items);
    this.lastAddedSubject.next(item.nom);
  }
  ajouterAuPanierBackend(produitId, quantite) {
    return this.http.post(`${this.apiUrl}/panier/add/`, { produit_id: produitId, quantite }).pipe(tap2(() => {
      this.monCompteService.getPanier().subscribe();
      this.lastAddedSubject.next("Produit ajout\xE9");
    }));
  }
  // =========================
  // ADD PRODUCT (alias propre)
  // =========================
  ajouterProduit(data) {
    const item = {
      produit: data,
      nom: data.nom,
      prix: data.prix,
      quantite: data.quantite,
      favori: false
    };
    this.ajouterAuPanier(item);
  }
  // =========================
  // QUANTITE +
  // =========================
  augmenterQuantite(item) {
    if (this.authService.isLoggedIn()) {
      if (item.id !== void 0) {
        this.monCompteService.mettreAJourQuantite(item.id, (item.quantite || 0) + 1).subscribe();
      }
    } else {
      const items = this.items.map((i) => i.produit.id === item.produit.id ? __spreadProps(__spreadValues({}, i), { quantite: i.quantite + 1 }) : i);
      this.save(items);
    }
  }
  // =========================
  // QUANTITE -
  // =========================
  diminuerQuantite(item) {
    if (this.authService.isLoggedIn()) {
      if (item.id !== void 0 && item.quantite > 1) {
        this.monCompteService.mettreAJourQuantite(item.id, item.quantite - 1).subscribe();
      }
    } else {
      const items = this.items.map((i) => {
        if (i.produit.id === item.produit.id) {
          const q = i.quantite - 1;
          return q > 0 ? __spreadProps(__spreadValues({}, i), { quantite: q }) : i;
        }
        return i;
      });
      this.save(items);
    }
  }
  // =========================
  // DELETE ITEM
  // =========================
  supprimerLigne(item) {
    if (this.authService.isLoggedIn()) {
      if (item.id !== void 0) {
        this.monCompteService.supprimerDuPanier(item.id).subscribe();
      }
    } else {
      const items = this.items.filter((i) => i.produit.id !== item.produit.id);
      this.save(items);
    }
  }
  supprimerDuPanier(produitId) {
    if (this.authService.isLoggedIn()) {
      this.monCompteService.getPanier().subscribe((panier) => {
        const item = panier.items.find((i) => i.produit_id === produitId);
        if (item) {
          this.monCompteService.supprimerDuPanier(item.id).subscribe();
        }
      });
    } else {
      const items = this.items.filter((i) => i.produit.id !== produitId);
      this.save(items);
    }
  }
  // =========================
  // FAVORI
  // =========================
  toggleFavori(item) {
    const items = this.items.map((i) => i.produit.id === item.produit.id ? __spreadProps(__spreadValues({}, i), { favori: !i.favori }) : i);
    this.save(items);
  }
  // =========================
  // CLEAR
  // =========================
  viderPanier() {
    this.save([]);
  }
  clearNotification() {
    this.lastAddedSubject.next(null);
  }
  // =========================
  // TOTALS
  // =========================
  getTotalArticles() {
    return this.items.reduce((t, i) => t + i.quantite, 0);
  }
  getMontantTotal() {
    return this.items.reduce((t, i) => t + i.prix * i.quantite, 0);
  }
  getTotal() {
    return this.getMontantTotal();
  }
  // =========================
  // API
  // =========================
  syncAvecServeur() {
    return this.http.post(`${this.apiUrl}/panier/sync/`, { items: this.items });
  }
  // =========================
  // SYNC LOCAL STORAGE TO BACKEND
  // =========================
  syncLocalStorageToBackend() {
    if (!this.authService.isLoggedIn()) {
      return;
    }
    const localItems = this.items;
    if (localItems.length === 0) {
      return;
    }
    console.log("\u{1F504} Syncing localStorage cart to backend:", localItems);
    localItems.forEach((item) => {
      this.ajouterAuPanierBackend(item.produit.id, item.quantite).subscribe({
        next: () => {
          console.log("\u2705 Item synced:", item.nom);
        },
        error: (error) => {
          console.error("\u274C Error syncing item:", error);
        }
      });
    });
    this.viderPanier();
  }
  // =========================
  // SYNC BACKEND TO LOCAL STORAGE
  // =========================
  syncBackendToLocal() {
    if (!this.authService.isLoggedIn()) {
      return;
    }
    this.monCompteService.getPanier().subscribe((panier) => {
      if (panier && panier.items.length > 0) {
        const localItems = panier.items.map((item) => ({
          id: item.id,
          produit: {
            id: item.produit_id,
            nom: item.produit_nom,
            prix: item.prix,
            image: item.image
          },
          nom: item.produit_nom,
          prix: item.prix,
          quantite: item.quantite,
          favori: false
        }));
        this.save(localItems);
        console.log("\u{1F504} Backend cart synced to localStorage:", localItems);
      }
    });
  }
  passerCommande() {
    if (this.items.length === 0) {
      this.notificationService.error("Votre panier est vide");
      return new Observable((observer) => {
        observer.error("Panier vide");
      });
    }
    return new Observable((observer) => {
      this.commandeService.creerCommandeDepuisPanier().subscribe({
        next: (commande) => {
          this.notificationService.success(`Commande ${commande.reference} cr\xE9\xE9e avec succ\xE8s!`);
          this.viderPanier();
          observer.next(commande);
          observer.complete();
        },
        error: (err) => {
          console.error("Erreur lors de la cr\xE9ation de la commande:", err);
          this.notificationService.error("Erreur lors de la cr\xE9ation de la commande");
          observer.error(err);
        }
      });
    });
  }
  static \u0275fac = function PanierService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _PanierService)(i04.\u0275\u0275inject(i13.HttpClient), i04.\u0275\u0275inject(AuthService), i04.\u0275\u0275inject(CommandeService), i04.\u0275\u0275inject(NotificationService), i04.\u0275\u0275inject(MonCompteService));
  };
  static \u0275prov = /* @__PURE__ */ i04.\u0275\u0275defineInjectable({ token: _PanierService, factory: _PanierService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i04.\u0275setClassMetadata(PanierService, [{
    type: Injectable4,
    args: [{
      providedIn: "root"
    }]
  }], () => [{ type: i13.HttpClient }, { type: AuthService }, { type: CommandeService }, { type: NotificationService }, { type: MonCompteService }], null);
})();

// src/app/core/services/auth.service.ts
import * as i05 from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
import * as i14 from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_common_http.js?v=7203ffec";
var AuthService = class _AuthService {
  http;
  apiUrl = "http://127.0.0.1:8000/account";
  utilisateurSubject = new BehaviorSubject4(null);
  utilisateur$ = this.utilisateurSubject.asObservable();
  isLoggedInSubject = new BehaviorSubject4(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();
  constructor(http) {
    this.http = http;
    this.checkTokenAtStartup();
  }
  get panierService() {
    return inject(forwardRef(() => PanierService));
  }
  checkTokenAtStartup() {
    const token = localStorage.getItem("access_token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.utilisateurSubject.next(user);
        this.isLoggedInSubject.next(true);
      } catch {
        this.logout();
      }
    }
  }
  login(email, password) {
    return this.http.post(`${this.apiUrl}/login/`, { email, password }).pipe(tap3((response) => {
      localStorage.setItem("access_token", response.access);
      localStorage.setItem("refresh_token", response.refresh);
      const payload = this.decodeToken(response.access);
      const userFromToken = {
        id: payload.user_id ?? 0,
        nom: payload.nom ?? "",
        prenom: payload.prenom ?? "",
        email,
        adresse: "",
        role: payload.role ?? "client",
        statut: payload.fournisseur_status ?? ""
      };
      this.utilisateurSubject.next(userFromToken);
      this.isLoggedInSubject.next(true);
      localStorage.setItem("user", JSON.stringify(userFromToken));
      this.fetchProfil().subscribe(() => {
        this.panierService.syncLocalStorageToBackend();
      });
    }));
  }
  fetchProfil() {
    return this.http.get(`${this.apiUrl}/me/`).pipe(tap3((profil) => {
      this.utilisateurSubject.next(profil);
      localStorage.setItem("user", JSON.stringify(profil));
    }));
  }
  updateProfil(data) {
    return this.http.patch(`${this.apiUrl}/me/`, data).pipe(tap3((profil) => {
      this.utilisateurSubject.next(profil);
      localStorage.setItem("user", JSON.stringify(profil));
    }));
  }
  register(data) {
    return this.http.post(`${this.apiUrl}/register/`, data);
  }
  registerFournisseur(data) {
    return this.http.post(`${this.apiUrl}/register-fournisseur/`, data);
  }
  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    this.utilisateurSubject.next(null);
    this.isLoggedInSubject.next(false);
  }
  // MÃ©thodes pour gÃ©rer les rÃ´les
  isAdmin() {
    const user = this.utilisateurSubject.value;
    return user?.role === "admin";
  }
  isClient() {
    const user = this.utilisateurSubject.value;
    return user?.role === "client";
  }
  isFournisseur() {
    const user = this.utilisateurSubject.value;
    return user?.role === "fournisseur";
  }
  getCurrentUserRole() {
    const user = this.utilisateurSubject.value;
    return user?.role || null;
  }
  hasRole(role) {
    const user = this.utilisateurSubject.value;
    return user?.role === role;
  }
  getToken() {
    return localStorage.getItem("access_token");
  }
  getUtilisateur() {
    return this.utilisateurSubject.value;
  }
  getCurrentUser() {
    return this.utilisateurSubject.value;
  }
  isLoggedIn() {
    return this.isLoggedInSubject.value;
  }
  isAuthenticated() {
    return this.isLoggedInSubject.value;
  }
  homeRoute() {
    const role = this.getCurrentUserRole();
    if (role === "admin")
      return "/admin/dashboard";
    if (role === "fournisseur") {
      return this.getCurrentUser()?.statut === "actif" ? "/fournisseur/dashboard" : "/fournisseur/en-attente";
    }
    if (role === "client")
      return "/";
    return "/login";
  }
  isFournisseurValidated() {
    return this.isFournisseur() && this.getCurrentUser()?.statut === "actif";
  }
  getPrenom() {
    return this.utilisateurSubject.value?.prenom ?? "";
  }
  getInitiales() {
    const u = this.utilisateurSubject.value;
    if (!u)
      return "?";
    return `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase();
  }
  decodeToken(token) {
    try {
      const base64Url = token.split(".")[1];
      if (!base64Url)
        return {};
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - base64.length % 4);
      const binary = atob(base64 + padding);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const jsonPayload = new TextDecoder("utf-8").decode(bytes);
      return JSON.parse(jsonPayload);
    } catch {
      return {};
    }
  }
  static \u0275fac = function AuthService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AuthService)(i05.\u0275\u0275inject(i14.HttpClient));
  };
  static \u0275prov = /* @__PURE__ */ i05.\u0275\u0275defineInjectable({ token: _AuthService, factory: _AuthService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i05.\u0275setClassMetadata(AuthService, [{
    type: Injectable5,
    args: [{ providedIn: "root" }]
  }], () => [{ type: i14.HttpClient }], null);
})();

// src/app/core/guards/role.guard.ts
import { inject as inject2 } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
import { Router } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_router.js?v=7203ffec";
var roleGuard = (route) => {
  const auth = inject2(AuthService);
  const router = inject2(Router);
  const expectedRole = route.data["role"];
  if (!auth.isAuthenticated()) {
    let loginUrl = "/admin/login";
    if (expectedRole === "fournisseur") {
      loginUrl = "/fournisseur/login";
    } else if (expectedRole === "client") {
      loginUrl = "/login";
    }
    return router.parseUrl(loginUrl);
  }
  if (expectedRole && !auth.hasRole(expectedRole)) {
    return router.parseUrl(auth.homeRoute());
  }
  if (expectedRole === "fournisseur" && !auth.isFournisseurValidated()) {
    return router.parseUrl("/fournisseur/en-attente");
  }
  return true;
};

// src/app/core/services/security.service.ts
import { Injectable as Injectable6 } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
import { HttpHeaders as HttpHeaders2 } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_common_http.js?v=7203ffec";
import { tap as tap4 } from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/rxjs.js?v=7203ffec";
import * as i06 from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_core.js?v=7203ffec";
import * as i15 from "/@fs/C:/Users/ablay/AutoMecaStore_backup/Frontend/.angular/cache/19.2.24/automecastore-frontend/vite/deps/@angular_common_http.js?v=7203ffec";
var SecurityService = class _SecurityService {
  http;
  apiUrl = "http://127.0.0.1:8000/account/security";
  constructor(http) {
    this.http = http;
  }
  getSessionKey() {
    let key = localStorage.getItem("security_session_key");
    if (!key) {
      key = this.generateSessionKey();
      localStorage.setItem("security_session_key", key);
    }
    return key;
  }
  generateSessionKey() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }
  sessionHeaders() {
    return { headers: new HttpHeaders2({ "X-Session-Key": this.getSessionKey() }) };
  }
  getOverview() {
    return this.http.get(`${this.apiUrl}/overview/`);
  }
  changePassword(currentPassword, newPassword) {
    return this.http.post(`${this.apiUrl}/change-password/`, { current_password: currentPassword, new_password: newPassword });
  }
  getTwoFactor() {
    return this.http.get(`${this.apiUrl}/two-factor/`);
  }
  setTwoFactor(enabled, emailAlertsEnabled) {
    return this.http.post(`${this.apiUrl}/two-factor/`, { enabled, email_alerts_enabled: emailAlertsEnabled });
  }
  getActivity() {
    return this.http.get(`${this.apiUrl}/activity/`);
  }
  getSessions() {
    return this.http.get(`${this.apiUrl}/sessions/`, this.sessionHeaders());
  }
  registerSession(deviceName) {
    const body = {
      session_key: this.getSessionKey(),
      device_name: deviceName || this.guessDeviceName()
    };
    return this.http.post(`${this.apiUrl}/sessions/register/`, body, this.sessionHeaders()).pipe(tap4(() => {
    }));
  }
  revokeSession(sessionKey) {
    return this.http.post(`${this.apiUrl}/sessions/${sessionKey}/revoke/`, {}, this.sessionHeaders());
  }
  revokeOtherSessions() {
    return this.http.post(`${this.apiUrl}/sessions/revoke-others/`, {}, this.sessionHeaders());
  }
  getTokens() {
    return this.http.get(`${this.apiUrl}/tokens/`);
  }
  createToken(name) {
    return this.http.post(`${this.apiUrl}/tokens/`, { name });
  }
  revokeToken(tokenId) {
    return this.http.delete(`${this.apiUrl}/tokens/${tokenId}/`);
  }
  logoutAll() {
    return this.http.post(`${this.apiUrl}/logout-all/`, {}, this.sessionHeaders());
  }
  deactivateAccount(password) {
    return this.http.post(`${this.apiUrl}/deactivate/`, { password });
  }
  guessDeviceName() {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua))
      return "Mobile";
    if (/iPad|Tablet/i.test(ua))
      return "Tablette";
    if (/Windows/i.test(ua))
      return "Windows";
    if (/Mac/i.test(ua))
      return "Mac";
    if (/Linux/i.test(ua))
      return "Linux";
    return "Appareil inconnu";
  }
  static \u0275fac = function SecurityService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SecurityService)(i06.\u0275\u0275inject(i15.HttpClient));
  };
  static \u0275prov = /* @__PURE__ */ i06.\u0275\u0275defineInjectable({ token: _SecurityService, factory: _SecurityService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i06.\u0275setClassMetadata(SecurityService, [{
    type: Injectable6,
    args: [{
      providedIn: "root"
    }]
  }], () => [{ type: i15.HttpClient }], null);
})();

export {
  __spreadValues,
  __spreadProps,
  __export,
  AuthService,
  auth_service_exports,
  CommandeService,
  commande_service_exports,
  NotificationService,
  notification_service_exports,
  MonCompteService,
  mon_compte_service_exports,
  PanierService,
  panier_service_exports,
  roleGuard,
  SecurityService
};


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvY29yZS9zZXJ2aWNlcy9hdXRoLnNlcnZpY2UudHMiLCJzcmMvYXBwL2NvcmUvc2VydmljZXMvcGFuaWVyLnNlcnZpY2UudHMiLCJzcmMvYXBwL2NvcmUvc2VydmljZXMvY29tbWFuZGUuc2VydmljZS50cyIsInNyYy9hcHAvY29yZS9zZXJ2aWNlcy9ub3RpZmljYXRpb24uc2VydmljZS50cyIsInNyYy9hcHAvY29yZS9zZXJ2aWNlcy9tb24tY29tcHRlLnNlcnZpY2UudHMiLCJzcmMvYXBwL2NvcmUvZ3VhcmRzL3JvbGUuZ3VhcmQudHMiLCJzcmMvYXBwL2NvcmUvc2VydmljZXMvc2VjdXJpdHkuc2VydmljZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbmplY3RhYmxlLCBpbmplY3QsIGZvcndhcmRSZWYgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuaW1wb3J0IHsgSHR0cENsaWVudCB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi9odHRwJztcclxuaW1wb3J0IHsgQmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlLCB0YXAgfSBmcm9tICdyeGpzJztcclxuaW1wb3J0IHsgUGFuaWVyU2VydmljZSB9IGZyb20gJy4vcGFuaWVyLnNlcnZpY2UnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBVdGlsaXNhdGV1ciB7XHJcbiAgaWQ6IG51bWJlcjtcclxuICBub206IHN0cmluZztcclxuICBwcmVub206IHN0cmluZztcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIHRlbGVwaG9uZT86IHN0cmluZztcclxuICBhZHJlc3NlOiBzdHJpbmc7IC8vIFJlbW92ZWQgdGhlIG9wdGlvbmFsIG9wZXJhdG9yICg/KVxyXG4gIHJvbGU/OiBzdHJpbmc7XHJcbiAgc3RhdHV0Pzogc3RyaW5nO1xyXG4gIGRhdGVfam9pbmVkPzogc3RyaW5nO1xyXG4gIGF2YXRhcj86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMb2dpblJlc3BvbnNlIHtcclxuICBhY2Nlc3M6IHN0cmluZztcclxuICByZWZyZXNoOiBzdHJpbmc7XHJcbn1cclxuXHJcbkBJbmplY3RhYmxlKHsgcHJvdmlkZWRJbjogJ3Jvb3QnIH0pXHJcbmV4cG9ydCBjbGFzcyBBdXRoU2VydmljZSB7XHJcblxyXG4gIHByaXZhdGUgYXBpVXJsID0gJ2h0dHA6Ly8xMjcuMC4wLjE6ODAwMC9hY2NvdW50JztcclxuXHJcbiAgcHJpdmF0ZSB1dGlsaXNhdGV1clN1YmplY3QgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFV0aWxpc2F0ZXVyIHwgbnVsbD4obnVsbCk7XHJcbiAgcHVibGljIHV0aWxpc2F0ZXVyJCA9IHRoaXMudXRpbGlzYXRldXJTdWJqZWN0LmFzT2JzZXJ2YWJsZSgpO1xyXG5cclxuICBwcml2YXRlIGlzTG9nZ2VkSW5TdWJqZWN0ID0gbmV3IEJlaGF2aW9yU3ViamVjdDxib29sZWFuPihmYWxzZSk7XHJcbiAgcHVibGljIGlzTG9nZ2VkSW4kID0gdGhpcy5pc0xvZ2dlZEluU3ViamVjdC5hc09ic2VydmFibGUoKTtcclxuXHJcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBodHRwOiBIdHRwQ2xpZW50KSB7XHJcbiAgICB0aGlzLmNoZWNrVG9rZW5BdFN0YXJ0dXAoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0IHBhbmllclNlcnZpY2UoKTogUGFuaWVyU2VydmljZSB7XHJcbiAgICByZXR1cm4gaW5qZWN0KGZvcndhcmRSZWYoKCkgPT4gUGFuaWVyU2VydmljZSkpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjaGVja1Rva2VuQXRTdGFydHVwKCk6IHZvaWQge1xyXG4gICAgY29uc3QgdG9rZW4gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnYWNjZXNzX3Rva2VuJyk7XHJcbiAgICBjb25zdCB1c2VyU3RyID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3VzZXInKTtcclxuICAgIGlmICh0b2tlbiAmJiB1c2VyU3RyKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgdXNlciA9IEpTT04ucGFyc2UodXNlclN0cikgYXMgVXRpbGlzYXRldXI7XHJcbiAgICAgICAgdGhpcy51dGlsaXNhdGV1clN1YmplY3QubmV4dCh1c2VyKTtcclxuICAgICAgICB0aGlzLmlzTG9nZ2VkSW5TdWJqZWN0Lm5leHQodHJ1ZSk7XHJcbiAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgIHRoaXMubG9nb3V0KCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGxvZ2luKGVtYWlsOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpOiBPYnNlcnZhYmxlPExvZ2luUmVzcG9uc2U+IHtcclxuICAgIHJldHVybiB0aGlzLmh0dHAucG9zdDxMb2dpblJlc3BvbnNlPihgJHt0aGlzLmFwaVVybH0vbG9naW4vYCwgeyBlbWFpbCwgcGFzc3dvcmQgfSkucGlwZShcclxuICAgICAgdGFwKChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdhY2Nlc3NfdG9rZW4nLCByZXNwb25zZS5hY2Nlc3MpO1xyXG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdyZWZyZXNoX3Rva2VuJywgcmVzcG9uc2UucmVmcmVzaCk7XHJcblxyXG4gICAgICAgIGNvbnN0IHBheWxvYWQgPSB0aGlzLmRlY29kZVRva2VuKHJlc3BvbnNlLmFjY2Vzcyk7XHJcbiAgICAgICAgY29uc3QgdXNlckZyb21Ub2tlbjogVXRpbGlzYXRldXIgPSB7XHJcbiAgICAgICAgICBpZDogcGF5bG9hZC51c2VyX2lkID8/IDAsXHJcbiAgICAgICAgICBub206IHBheWxvYWQubm9tID8/ICcnLFxyXG4gICAgICAgICAgcHJlbm9tOiBwYXlsb2FkLnByZW5vbSA/PyAnJyxcclxuICAgICAgICAgIGVtYWlsOiBlbWFpbCxcclxuICAgICAgICAgIGFkcmVzc2U6ICcnLFxyXG4gICAgICAgICAgcm9sZTogcGF5bG9hZC5yb2xlID8/ICdjbGllbnQnLFxyXG4gICAgICAgICAgc3RhdHV0OiBwYXlsb2FkLmZvdXJuaXNzZXVyX3N0YXR1cyA/PyAnJ1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy51dGlsaXNhdGV1clN1YmplY3QubmV4dCh1c2VyRnJvbVRva2VuKTtcclxuICAgICAgICB0aGlzLmlzTG9nZ2VkSW5TdWJqZWN0Lm5leHQodHJ1ZSk7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3VzZXInLCBKU09OLnN0cmluZ2lmeSh1c2VyRnJvbVRva2VuKSk7XHJcblxyXG4gICAgICAgIC8vIENoYXJnZSBsZSBwcm9maWwgY29tcGxldCBkZXB1aXMgL21lL1xyXG4gICAgICAgIHRoaXMuZmV0Y2hQcm9maWwoKS5zdWJzY3JpYmUoKCkgPT4ge1xyXG4gICAgICAgICAgLy8gU3luYyBsb2NhbFN0b3JhZ2UgY2FydCB0byBiYWNrZW5kIGFmdGVyIGxvZ2luXHJcbiAgICAgICAgICB0aGlzLnBhbmllclNlcnZpY2Uuc3luY0xvY2FsU3RvcmFnZVRvQmFja2VuZCgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIGZldGNoUHJvZmlsKCk6IE9ic2VydmFibGU8VXRpbGlzYXRldXI+IHtcclxuICAgIHJldHVybiB0aGlzLmh0dHAuZ2V0PFV0aWxpc2F0ZXVyPihgJHt0aGlzLmFwaVVybH0vbWUvYCkucGlwZShcclxuICAgICAgdGFwKChwcm9maWwpID0+IHtcclxuICAgICAgICB0aGlzLnV0aWxpc2F0ZXVyU3ViamVjdC5uZXh0KHByb2ZpbCk7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3VzZXInLCBKU09OLnN0cmluZ2lmeShwcm9maWwpKTtcclxuICAgICAgfSlcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVQcm9maWwoZGF0YTogUGFydGlhbDxVdGlsaXNhdGV1cj4pOiBPYnNlcnZhYmxlPFV0aWxpc2F0ZXVyPiB7XHJcbiAgICByZXR1cm4gdGhpcy5odHRwLnBhdGNoPFV0aWxpc2F0ZXVyPihgJHt0aGlzLmFwaVVybH0vbWUvYCwgZGF0YSkucGlwZShcclxuICAgICAgdGFwKChwcm9maWwpID0+IHtcclxuICAgICAgICB0aGlzLnV0aWxpc2F0ZXVyU3ViamVjdC5uZXh0KHByb2ZpbCk7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3VzZXInLCBKU09OLnN0cmluZ2lmeShwcm9maWwpKTtcclxuICAgICAgfSlcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICByZWdpc3RlcihkYXRhOiBhbnkpOiBPYnNlcnZhYmxlPGFueT4ge1xyXG4gICAgcmV0dXJuIHRoaXMuaHR0cC5wb3N0KGAke3RoaXMuYXBpVXJsfS9yZWdpc3Rlci9gLCBkYXRhKTtcclxuICB9XHJcblxyXG4gIHJlZ2lzdGVyRm91cm5pc3NldXIoZGF0YTogYW55KTogT2JzZXJ2YWJsZTxhbnk+IHtcclxuICAgIHJldHVybiB0aGlzLmh0dHAucG9zdChgJHt0aGlzLmFwaVVybH0vcmVnaXN0ZXItZm91cm5pc3NldXIvYCwgZGF0YSk7XHJcbiAgfVxyXG5cclxuICBsb2dvdXQoKTogdm9pZCB7XHJcbiAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnYWNjZXNzX3Rva2VuJyk7XHJcbiAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgncmVmcmVzaF90b2tlbicpO1xyXG4gICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3VzZXInKTtcclxuICAgIHRoaXMudXRpbGlzYXRldXJTdWJqZWN0Lm5leHQobnVsbCk7XHJcbiAgICB0aGlzLmlzTG9nZ2VkSW5TdWJqZWN0Lm5leHQoZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgLy8gTcOpdGhvZGVzIHBvdXIgZ8OpcmVyIGxlcyByw7RsZXNcclxuICBpc0FkbWluKCk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgdXNlciA9IHRoaXMudXRpbGlzYXRldXJTdWJqZWN0LnZhbHVlO1xyXG4gICAgcmV0dXJuIHVzZXI/LnJvbGUgPT09ICdhZG1pbic7XHJcbiAgfVxyXG5cclxuICBpc0NsaWVudCgpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IHVzZXIgPSB0aGlzLnV0aWxpc2F0ZXVyU3ViamVjdC52YWx1ZTtcclxuICAgIHJldHVybiB1c2VyPy5yb2xlID09PSAnY2xpZW50JztcclxuICB9XHJcblxyXG4gIGlzRm91cm5pc3NldXIoKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCB1c2VyID0gdGhpcy51dGlsaXNhdGV1clN1YmplY3QudmFsdWU7XHJcbiAgICByZXR1cm4gdXNlcj8ucm9sZSA9PT0gJ2ZvdXJuaXNzZXVyJztcclxuICB9XHJcblxyXG4gIGdldEN1cnJlbnRVc2VyUm9sZSgpOiBzdHJpbmcgfCBudWxsIHtcclxuICAgIGNvbnN0IHVzZXIgPSB0aGlzLnV0aWxpc2F0ZXVyU3ViamVjdC52YWx1ZTtcclxuICAgIHJldHVybiB1c2VyPy5yb2xlIHx8IG51bGw7XHJcbiAgfVxyXG5cclxuICBoYXNSb2xlKHJvbGU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgdXNlciA9IHRoaXMudXRpbGlzYXRldXJTdWJqZWN0LnZhbHVlO1xyXG4gICAgcmV0dXJuIHVzZXI/LnJvbGUgPT09IHJvbGU7XHJcbiAgfVxyXG5cclxuICBnZXRUb2tlbigpOiBzdHJpbmcgfCBudWxsIHsgcmV0dXJuIGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdhY2Nlc3NfdG9rZW4nKTsgfVxyXG4gIGdldFV0aWxpc2F0ZXVyKCk6IFV0aWxpc2F0ZXVyIHwgbnVsbCB7IHJldHVybiB0aGlzLnV0aWxpc2F0ZXVyU3ViamVjdC52YWx1ZTsgfVxyXG4gIGdldEN1cnJlbnRVc2VyKCk6IFV0aWxpc2F0ZXVyIHwgbnVsbCB7IHJldHVybiB0aGlzLnV0aWxpc2F0ZXVyU3ViamVjdC52YWx1ZTsgfVxyXG4gIGlzTG9nZ2VkSW4oKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmlzTG9nZ2VkSW5TdWJqZWN0LnZhbHVlOyB9XHJcbiAgaXNBdXRoZW50aWNhdGVkKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5pc0xvZ2dlZEluU3ViamVjdC52YWx1ZTsgfVxyXG5cclxuICBob21lUm91dGUoKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHJvbGUgPSB0aGlzLmdldEN1cnJlbnRVc2VyUm9sZSgpO1xyXG4gICAgaWYgKHJvbGUgPT09ICdhZG1pbicpIHJldHVybiAnL2FkbWluL2Rhc2hib2FyZCc7XHJcbiAgICBpZiAocm9sZSA9PT0gJ2ZvdXJuaXNzZXVyJykge1xyXG4gICAgICByZXR1cm4gdGhpcy5nZXRDdXJyZW50VXNlcigpPy5zdGF0dXQgPT09ICdhY3RpZidcclxuICAgICAgICA/ICcvZm91cm5pc3NldXIvZGFzaGJvYXJkJ1xyXG4gICAgICAgIDogJy9mb3Vybmlzc2V1ci9lbi1hdHRlbnRlJztcclxuICAgIH1cclxuICAgIGlmIChyb2xlID09PSAnY2xpZW50JykgcmV0dXJuICcvJztcclxuICAgIHJldHVybiAnL2xvZ2luJztcclxuICB9XHJcblxyXG4gIGlzRm91cm5pc3NldXJWYWxpZGF0ZWQoKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpcy5pc0ZvdXJuaXNzZXVyKCkgJiYgdGhpcy5nZXRDdXJyZW50VXNlcigpPy5zdGF0dXQgPT09ICdhY3RpZic7XHJcbiAgfVxyXG5cclxuICBnZXRQcmVub20oKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMudXRpbGlzYXRldXJTdWJqZWN0LnZhbHVlPy5wcmVub20gPz8gJyc7IH1cclxuXHJcbiAgZ2V0SW5pdGlhbGVzKCk6IHN0cmluZyB7XHJcbiAgICBjb25zdCB1ID0gdGhpcy51dGlsaXNhdGV1clN1YmplY3QudmFsdWU7XHJcbiAgICBpZiAoIXUpIHJldHVybiAnPyc7XHJcbiAgICByZXR1cm4gYCR7dS5wcmVub20uY2hhckF0KDApfSR7dS5ub20uY2hhckF0KDApfWAudG9VcHBlckNhc2UoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZGVjb2RlVG9rZW4odG9rZW46IHN0cmluZyk6IGFueSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBiYXNlNjRVcmwgPSB0b2tlbi5zcGxpdCgnLicpWzFdO1xyXG4gICAgICBpZiAoIWJhc2U2NFVybCkgcmV0dXJuIHt9O1xyXG5cclxuICAgICAgY29uc3QgYmFzZTY0ID0gYmFzZTY0VXJsLnJlcGxhY2UoLy0vZywgJysnKS5yZXBsYWNlKC9fL2csICcvJyk7XHJcbiAgICAgIGNvbnN0IHBhZGRpbmcgPSBiYXNlNjQubGVuZ3RoICUgNCA9PT0gMCA/ICcnIDogJz0nLnJlcGVhdCg0IC0gKGJhc2U2NC5sZW5ndGggJSA0KSk7XHJcbiAgICAgIGNvbnN0IGJpbmFyeSA9IGF0b2IoYmFzZTY0ICsgcGFkZGluZyk7XHJcbiAgICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYmluYXJ5Lmxlbmd0aCk7XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYmluYXJ5Lmxlbmd0aDsgaSsrKSB7IGJ5dGVzW2ldID0gYmluYXJ5LmNoYXJDb2RlQXQoaSk7IH1cclxuICAgICAgY29uc3QganNvblBheWxvYWQgPSBuZXcgVGV4dERlY29kZXIoJ3V0Zi04JykuZGVjb2RlKGJ5dGVzKTtcclxuXHJcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGpzb25QYXlsb2FkKTtcclxuICAgIH0gY2F0Y2ggeyByZXR1cm4ge307IH1cclxuICB9XHJcbn0iLCJpbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XHJcbmltcG9ydCB7IEh0dHBDbGllbnQgfSBmcm9tICdAYW5ndWxhci9jb21tb24vaHR0cCc7XHJcbmltcG9ydCB7IEJlaGF2aW9yU3ViamVjdCwgT2JzZXJ2YWJsZSwgb2YgfSBmcm9tICdyeGpzJztcclxuaW1wb3J0IHsgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xyXG5pbXBvcnQgeyBBdXRoU2VydmljZSB9IGZyb20gJy4vYXV0aC5zZXJ2aWNlJztcclxuaW1wb3J0IHsgQ29tbWFuZGVTZXJ2aWNlIH0gZnJvbSAnLi9jb21tYW5kZS5zZXJ2aWNlJztcclxuaW1wb3J0IHsgTm90aWZpY2F0aW9uU2VydmljZSB9IGZyb20gJy4vbm90aWZpY2F0aW9uLnNlcnZpY2UnO1xyXG5pbXBvcnQgeyBNb25Db21wdGVTZXJ2aWNlIH0gZnJvbSAnLi9tb24tY29tcHRlLnNlcnZpY2UnO1xyXG5pbXBvcnQgeyBQcm9kdWl0IH0gZnJvbSAnLi4vLi4vbW9kZWxzL3Byb2R1aXQubW9kZWwnO1xyXG5pbXBvcnQgeyBQYW5pZXJJdGVtIH0gZnJvbSAnLi4vLi4vbW9kZWxzL3Bhbmllci5tb2RlbCc7XHJcblxyXG5ASW5qZWN0YWJsZSh7XHJcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXHJcbn0pXHJcbmV4cG9ydCBjbGFzcyBQYW5pZXJTZXJ2aWNlIHtcclxuXHJcbiAgcHJpdmF0ZSBhcGlVcmwgPSAnaHR0cDovLzEyNy4wLjAuMTo4MDAwL2FjY291bnQnO1xyXG5cclxuICBwcml2YXRlIGl0ZW1zU3ViamVjdCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8UGFuaWVySXRlbVtdPihbXSk7XHJcbiAgcHVibGljIGl0ZW1zJCA9IHRoaXMuaXRlbXNTdWJqZWN0LmFzT2JzZXJ2YWJsZSgpO1xyXG5cclxuICBwcml2YXRlIGxhc3RBZGRlZFN1YmplY3QgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZyB8IG51bGw+KG51bGwpO1xyXG4gIHB1YmxpYyBsYXN0QWRkZWQkID0gdGhpcy5sYXN0QWRkZWRTdWJqZWN0LmFzT2JzZXJ2YWJsZSgpO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHByaXZhdGUgaHR0cDogSHR0cENsaWVudCxcclxuICAgIHByaXZhdGUgYXV0aFNlcnZpY2U6IEF1dGhTZXJ2aWNlLFxyXG4gICAgcHJpdmF0ZSBjb21tYW5kZVNlcnZpY2U6IENvbW1hbmRlU2VydmljZSxcclxuICAgIHByaXZhdGUgbm90aWZpY2F0aW9uU2VydmljZTogTm90aWZpY2F0aW9uU2VydmljZSxcclxuICAgIHByaXZhdGUgbW9uQ29tcHRlU2VydmljZTogTW9uQ29tcHRlU2VydmljZVxyXG4gICkge1xyXG4gICAgdGhpcy5sb2FkRnJvbVN0b3JhZ2UoKTtcclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBTVE9SQUdFXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIHByaXZhdGUgbG9hZEZyb21TdG9yYWdlKCk6IHZvaWQge1xyXG4gICAgY29uc3Qgc3RvcmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3Bhbmllcl9pdGVtcycpO1xyXG4gICAgaWYgKHN0b3JlZCkge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHRoaXMuaXRlbXNTdWJqZWN0Lm5leHQoSlNPTi5wYXJzZShzdG9yZWQpKTtcclxuICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgdGhpcy5pdGVtc1N1YmplY3QubmV4dChbXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2F2ZVRvU3RvcmFnZShpdGVtczogUGFuaWVySXRlbVtdKTogdm9pZCB7XHJcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncGFuaWVyX2l0ZW1zJywgSlNPTi5zdHJpbmdpZnkoaXRlbXMpKTtcclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBHRVQgSVRFTVNcclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgcHJpdmF0ZSBnZXQgaXRlbXMoKTogUGFuaWVySXRlbVtdIHtcclxuICAgIHJldHVybiB0aGlzLml0ZW1zU3ViamVjdC52YWx1ZTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2F2ZShpdGVtczogUGFuaWVySXRlbVtdKSB7XHJcbiAgICB0aGlzLml0ZW1zU3ViamVjdC5uZXh0KGl0ZW1zKTtcclxuICAgIHRoaXMuc2F2ZVRvU3RvcmFnZShpdGVtcyk7XHJcbiAgfVxyXG5cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gQUREIFBST0RVQ1RcclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgYWpvdXRlckF1UGFuaWVyKGl0ZW06IFBhbmllckl0ZW0pOiB2b2lkIHtcclxuICAgIGNvbnNvbGUubG9nKCfwn5uSIEFqb3V0IGF1IHBhbmllcjonLCBpdGVtKTtcclxuICAgIGNvbnNvbGUubG9nKCfwn5SRIFV0aWxpc2F0ZXVyIGF1dGhlbnRpZmnDqTonLCB0aGlzLmF1dGhTZXJ2aWNlLmlzTG9nZ2VkSW4oKSk7XHJcbiAgICBcclxuICAgIC8vIFN5bmMgd2l0aCBiYWNrZW5kIGlmIHVzZXIgaXMgYXV0aGVudGljYXRlZFxyXG4gICAgaWYgKHRoaXMuYXV0aFNlcnZpY2UuaXNMb2dnZWRJbigpKSB7XHJcbiAgICAgIHRoaXMuYWpvdXRlckF1UGFuaWVyQmFja2VuZChpdGVtLnByb2R1aXQuaWQsIGl0ZW0ucXVhbnRpdGUpLnN1YnNjcmliZSh7XHJcbiAgICAgICAgbmV4dDogKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIEJhY2tlbmQgcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgaWYgKHJlc3BvbnNlID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgIC8vIEJhY2tlbmQgZmFpbGVkLCBmYWxsYmFjayB0byBsb2NhbFN0b3JhZ2VcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ+KaoO+4jyBCYWNrZW5kIGZhaWxlZCwgdXNpbmcgbG9jYWxTdG9yYWdlIGZhbGxiYWNrJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYWpvdXRlckF1UGFuaWVyTG9jYWwoaXRlbSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjogKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgQmFja2VuZCBlcnJvciwgdXNpbmcgbG9jYWxTdG9yYWdlIGZhbGxiYWNrOicsIGVycm9yKTtcclxuICAgICAgICAgIHRoaXMuYWpvdXRlckF1UGFuaWVyTG9jYWwoaXRlbSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIEZhbGxiYWNrIHRvIGxvY2FsU3RvcmFnZSBmb3Igbm9uLWF1dGhlbnRpY2F0ZWQgdXNlcnNcclxuICAgICAgY29uc29sZS5sb2coJ/Cfk6YgVXNpbmcgbG9jYWxTdG9yYWdlIChub3QgYXV0aGVudGljYXRlZCknKTtcclxuICAgICAgdGhpcy5ham91dGVyQXVQYW5pZXJMb2NhbChpdGVtKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYWpvdXRlckF1UGFuaWVyTG9jYWwoaXRlbTogUGFuaWVySXRlbSk6IHZvaWQge1xyXG4gICAgY29uc3QgaXRlbXMgPSBbLi4udGhpcy5pdGVtc107XHJcblxyXG4gICAgY29uc3QgaW5kZXggPSBpdGVtcy5maW5kSW5kZXgoaSA9PiBpLnByb2R1aXQuaWQgPT09IGl0ZW0ucHJvZHVpdC5pZCk7XHJcblxyXG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xyXG4gICAgICBpdGVtc1tpbmRleF0ucXVhbnRpdGUgKz0gaXRlbS5xdWFudGl0ZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGl0ZW1zLnB1c2goe1xyXG4gICAgICAgIC4uLml0ZW0sXHJcbiAgICAgICAgZmF2b3JpOiBmYWxzZVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnNhdmUoaXRlbXMpO1xyXG4gICAgdGhpcy5sYXN0QWRkZWRTdWJqZWN0Lm5leHQoaXRlbS5ub20pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBham91dGVyQXVQYW5pZXJCYWNrZW5kKHByb2R1aXRJZDogbnVtYmVyLCBxdWFudGl0ZTogbnVtYmVyKTogT2JzZXJ2YWJsZTxhbnk+IHtcclxuICAgIHJldHVybiB0aGlzLmh0dHAucG9zdChgJHt0aGlzLmFwaVVybH0vcGFuaWVyL2FkZC9gLFxyXG4gICAgICB7IHByb2R1aXRfaWQ6IHByb2R1aXRJZCwgcXVhbnRpdGU6IHF1YW50aXRlIH1cclxuICAgICkucGlwZShcclxuICAgICAgdGFwKCgpID0+IHtcclxuICAgICAgICAvLyBSZWZyZXNoIGNhcnQgZnJvbSBiYWNrZW5kIGFmdGVyIGFkZGluZ1xyXG4gICAgICAgIHRoaXMubW9uQ29tcHRlU2VydmljZS5nZXRQYW5pZXIoKS5zdWJzY3JpYmUoKTtcclxuICAgICAgICB0aGlzLmxhc3RBZGRlZFN1YmplY3QubmV4dCgnUHJvZHVpdCBham91dMOpJyk7XHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIC8vIEFERCBQUk9EVUNUIChhbGlhcyBwcm9wcmUpXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIGFqb3V0ZXJQcm9kdWl0KGRhdGE6IFByb2R1aXQgJiB7IHF1YW50aXRlOiBudW1iZXIgfSk6IHZvaWQge1xyXG5cclxuICAgIGNvbnN0IGl0ZW06IFBhbmllckl0ZW0gPSB7XHJcbiAgICAgIHByb2R1aXQ6IGRhdGEsXHJcbiAgICAgIG5vbTogZGF0YS5ub20sXHJcbiAgICAgIHByaXg6IGRhdGEucHJpeCxcclxuICAgICAgcXVhbnRpdGU6IGRhdGEucXVhbnRpdGUsXHJcbiAgICAgIGZhdm9yaTogZmFsc2VcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5ham91dGVyQXVQYW5pZXIoaXRlbSk7XHJcbiAgfVxyXG5cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gUVVBTlRJVEUgK1xyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICBhdWdtZW50ZXJRdWFudGl0ZShpdGVtOiBQYW5pZXJJdGVtKSB7XHJcbiAgICBpZiAodGhpcy5hdXRoU2VydmljZS5pc0xvZ2dlZEluKCkpIHtcclxuICAgICAgLy8gU3luYyB3aXRoIGJhY2tlbmRcclxuICAgICAgaWYgKGl0ZW0uaWQgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHRoaXMubW9uQ29tcHRlU2VydmljZS5tZXR0cmVBSm91clF1YW50aXRlKGl0ZW0uaWQsIChpdGVtLnF1YW50aXRlIHx8IDApICsgMSkuc3Vic2NyaWJlKCk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIExvY2FsIHN0b3JhZ2UgZmFsbGJhY2tcclxuICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLml0ZW1zLm1hcChpID0+XHJcbiAgICAgICAgaS5wcm9kdWl0LmlkID09PSBpdGVtLnByb2R1aXQuaWRcclxuICAgICAgICAgID8geyAuLi5pLCBxdWFudGl0ZTogaS5xdWFudGl0ZSArIDEgfVxyXG4gICAgICAgICAgOiBpXHJcbiAgICAgICk7XHJcbiAgICAgIHRoaXMuc2F2ZShpdGVtcyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gUVVBTlRJVEUgLVxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICBkaW1pbnVlclF1YW50aXRlKGl0ZW06IFBhbmllckl0ZW0pIHtcclxuICAgIGlmICh0aGlzLmF1dGhTZXJ2aWNlLmlzTG9nZ2VkSW4oKSkge1xyXG4gICAgICAvLyBTeW5jIHdpdGggYmFja2VuZFxyXG4gICAgICBpZiAoaXRlbS5pZCAhPT0gdW5kZWZpbmVkICYmIGl0ZW0ucXVhbnRpdGUgPiAxKSB7XHJcbiAgICAgICAgdGhpcy5tb25Db21wdGVTZXJ2aWNlLm1ldHRyZUFKb3VyUXVhbnRpdGUoaXRlbS5pZCwgaXRlbS5xdWFudGl0ZSAtIDEpLnN1YnNjcmliZSgpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBMb2NhbCBzdG9yYWdlIGZhbGxiYWNrXHJcbiAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5pdGVtcy5tYXAoaSA9PiB7XHJcbiAgICAgICAgaWYgKGkucHJvZHVpdC5pZCA9PT0gaXRlbS5wcm9kdWl0LmlkKSB7XHJcbiAgICAgICAgICBjb25zdCBxID0gaS5xdWFudGl0ZSAtIDE7XHJcbiAgICAgICAgICByZXR1cm4gcSA+IDAgPyB7IC4uLmksIHF1YW50aXRlOiBxIH0gOiBpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaTtcclxuICAgICAgfSk7XHJcbiAgICAgIHRoaXMuc2F2ZShpdGVtcyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gREVMRVRFIElURU1cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgc3VwcHJpbWVyTGlnbmUoaXRlbTogUGFuaWVySXRlbSkge1xyXG4gICAgaWYgKHRoaXMuYXV0aFNlcnZpY2UuaXNMb2dnZWRJbigpKSB7XHJcbiAgICAgIC8vIFN5bmMgd2l0aCBiYWNrZW5kXHJcbiAgICAgIGlmIChpdGVtLmlkICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aGlzLm1vbkNvbXB0ZVNlcnZpY2Uuc3VwcHJpbWVyRHVQYW5pZXIoaXRlbS5pZCkuc3Vic2NyaWJlKCk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIExvY2FsIHN0b3JhZ2UgZmFsbGJhY2tcclxuICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLml0ZW1zLmZpbHRlcihpID0+IGkucHJvZHVpdC5pZCAhPT0gaXRlbS5wcm9kdWl0LmlkKTtcclxuICAgICAgdGhpcy5zYXZlKGl0ZW1zKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN1cHByaW1lckR1UGFuaWVyKHByb2R1aXRJZDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBpZiAodGhpcy5hdXRoU2VydmljZS5pc0xvZ2dlZEluKCkpIHtcclxuICAgICAgLy8gTmVlZCB0byBmaW5kIHRoZSBpdGVtIElEIGZpcnN0IGZyb20gYmFja2VuZCBjYXJ0XHJcbiAgICAgIHRoaXMubW9uQ29tcHRlU2VydmljZS5nZXRQYW5pZXIoKS5zdWJzY3JpYmUocGFuaWVyID0+IHtcclxuICAgICAgICBjb25zdCBpdGVtID0gcGFuaWVyLml0ZW1zLmZpbmQoaSA9PiBpLnByb2R1aXRfaWQgPT09IHByb2R1aXRJZCk7XHJcbiAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgIHRoaXMubW9uQ29tcHRlU2VydmljZS5zdXBwcmltZXJEdVBhbmllcihpdGVtLmlkKS5zdWJzY3JpYmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gTG9jYWwgc3RvcmFnZSBmYWxsYmFja1xyXG4gICAgICBjb25zdCBpdGVtcyA9IHRoaXMuaXRlbXMuZmlsdGVyKGkgPT4gaS5wcm9kdWl0LmlkICE9PSBwcm9kdWl0SWQpO1xyXG4gICAgICB0aGlzLnNhdmUoaXRlbXMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIC8vIEZBVk9SSVxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICB0b2dnbGVGYXZvcmkoaXRlbTogUGFuaWVySXRlbSkge1xyXG4gICAgY29uc3QgaXRlbXMgPSB0aGlzLml0ZW1zLm1hcChpID0+XHJcbiAgICAgIGkucHJvZHVpdC5pZCA9PT0gaXRlbS5wcm9kdWl0LmlkXHJcbiAgICAgICAgPyB7IC4uLmksIGZhdm9yaTogIWkuZmF2b3JpIH1cclxuICAgICAgICA6IGlcclxuICAgICk7XHJcbiAgICB0aGlzLnNhdmUoaXRlbXMpO1xyXG4gIH1cclxuXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIC8vIENMRUFSXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIHZpZGVyUGFuaWVyKCk6IHZvaWQge1xyXG4gICAgdGhpcy5zYXZlKFtdKTtcclxuICB9XHJcblxyXG4gIGNsZWFyTm90aWZpY2F0aW9uKCk6IHZvaWQge1xyXG4gICAgdGhpcy5sYXN0QWRkZWRTdWJqZWN0Lm5leHQobnVsbCk7XHJcbiAgfVxyXG5cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gVE9UQUxTXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIGdldFRvdGFsQXJ0aWNsZXMoKTogbnVtYmVyIHtcclxuICAgIHJldHVybiB0aGlzLml0ZW1zLnJlZHVjZSgodCwgaSkgPT4gdCArIGkucXVhbnRpdGUsIDApO1xyXG4gIH1cclxuXHJcbiAgZ2V0TW9udGFudFRvdGFsKCk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gdGhpcy5pdGVtcy5yZWR1Y2UoXHJcbiAgICAgICh0LCBpKSA9PiB0ICsgaS5wcml4ICogaS5xdWFudGl0ZSxcclxuICAgICAgMFxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIGdldFRvdGFsKCk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gdGhpcy5nZXRNb250YW50VG90YWwoKTtcclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBBUElcclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgc3luY0F2ZWNTZXJ2ZXVyKCk6IE9ic2VydmFibGU8YW55PiB7XHJcbiAgICByZXR1cm4gdGhpcy5odHRwLnBvc3QoXHJcbiAgICAgIGAke3RoaXMuYXBpVXJsfS9wYW5pZXIvc3luYy9gLFxyXG4gICAgICB7IGl0ZW1zOiB0aGlzLml0ZW1zIH1cclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gU1lOQyBMT0NBTCBTVE9SQUdFIFRPIEJBQ0tFTkRcclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgc3luY0xvY2FsU3RvcmFnZVRvQmFja2VuZCgpOiB2b2lkIHtcclxuICAgIGlmICghdGhpcy5hdXRoU2VydmljZS5pc0xvZ2dlZEluKCkpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGxvY2FsSXRlbXMgPSB0aGlzLml0ZW1zO1xyXG4gICAgaWYgKGxvY2FsSXRlbXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZygn8J+UhCBTeW5jaW5nIGxvY2FsU3RvcmFnZSBjYXJ0IHRvIGJhY2tlbmQ6JywgbG9jYWxJdGVtcyk7XHJcblxyXG4gICAgLy8gQWRkIGVhY2ggaXRlbSB0byBiYWNrZW5kXHJcbiAgICBsb2NhbEl0ZW1zLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgIHRoaXMuYWpvdXRlckF1UGFuaWVyQmFja2VuZChpdGVtLnByb2R1aXQuaWQsIGl0ZW0ucXVhbnRpdGUpLnN1YnNjcmliZSh7XHJcbiAgICAgICAgbmV4dDogKCkgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ+KchSBJdGVtIHN5bmNlZDonLCBpdGVtLm5vbSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjogKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRXJyb3Igc3luY2luZyBpdGVtOicsIGVycm9yKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2xlYXIgbG9jYWxTdG9yYWdlIGFmdGVyIHN5bmNcclxuICAgIHRoaXMudmlkZXJQYW5pZXIoKTtcclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBTWU5DIEJBQ0tFTkQgVE8gTE9DQUwgU1RPUkFHRVxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICBzeW5jQmFja2VuZFRvTG9jYWwoKTogdm9pZCB7XHJcbiAgICBpZiAoIXRoaXMuYXV0aFNlcnZpY2UuaXNMb2dnZWRJbigpKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLm1vbkNvbXB0ZVNlcnZpY2UuZ2V0UGFuaWVyKCkuc3Vic2NyaWJlKHBhbmllciA9PiB7XHJcbiAgICAgIGlmIChwYW5pZXIgJiYgcGFuaWVyLml0ZW1zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zdCBsb2NhbEl0ZW1zOiBQYW5pZXJJdGVtW10gPSBwYW5pZXIuaXRlbXMubWFwKGl0ZW0gPT4gKHtcclxuICAgICAgICAgIGlkOiBpdGVtLmlkLFxyXG4gICAgICAgICAgcHJvZHVpdDoge1xyXG4gICAgICAgICAgICBpZDogaXRlbS5wcm9kdWl0X2lkLFxyXG4gICAgICAgICAgICBub206IGl0ZW0ucHJvZHVpdF9ub20sXHJcbiAgICAgICAgICAgIHByaXg6IGl0ZW0ucHJpeCxcclxuICAgICAgICAgICAgaW1hZ2U6IGl0ZW0uaW1hZ2VcclxuICAgICAgICAgIH0gYXMgYW55LFxyXG4gICAgICAgICAgbm9tOiBpdGVtLnByb2R1aXRfbm9tLFxyXG4gICAgICAgICAgcHJpeDogaXRlbS5wcml4LFxyXG4gICAgICAgICAgcXVhbnRpdGU6IGl0ZW0ucXVhbnRpdGUsXHJcbiAgICAgICAgICBmYXZvcmk6IGZhbHNlXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICAgIHRoaXMuc2F2ZShsb2NhbEl0ZW1zKTtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBCYWNrZW5kIGNhcnQgc3luY2VkIHRvIGxvY2FsU3RvcmFnZTonLCBsb2NhbEl0ZW1zKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG4gIHBhc3NlckNvbW1hbmRlKCk6IE9ic2VydmFibGU8YW55PiB7XHJcbiAgICBpZiAodGhpcy5pdGVtcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgdGhpcy5ub3RpZmljYXRpb25TZXJ2aWNlLmVycm9yKCdWb3RyZSBwYW5pZXIgZXN0IHZpZGUnKTtcclxuICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKG9ic2VydmVyID0+IHtcclxuICAgICAgICBvYnNlcnZlci5lcnJvcignUGFuaWVyIHZpZGUnKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKG9ic2VydmVyID0+IHtcclxuICAgICAgdGhpcy5jb21tYW5kZVNlcnZpY2UuY3JlZXJDb21tYW5kZURlcHVpc1BhbmllcigpLnN1YnNjcmliZSh7XHJcbiAgICAgICAgbmV4dDogKGNvbW1hbmRlKSA9PiB7XHJcbiAgICAgICAgICB0aGlzLm5vdGlmaWNhdGlvblNlcnZpY2Uuc3VjY2VzcyhgQ29tbWFuZGUgJHtjb21tYW5kZS5yZWZlcmVuY2V9IGNyw6nDqWUgYXZlYyBzdWNjw6hzIWApO1xyXG4gICAgICAgICAgdGhpcy52aWRlclBhbmllcigpOyAvLyBWaWRlciBsZSBwYW5pZXIgYXByw6hzIGNvbW1hbmRlIHLDqXVzc2llXHJcbiAgICAgICAgICBvYnNlcnZlci5uZXh0KGNvbW1hbmRlKTtcclxuICAgICAgICAgIG9ic2VydmVyLmNvbXBsZXRlKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjogKGVycikgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcignRXJyZXVyIGxvcnMgZGUgbGEgY3LDqWF0aW9uIGRlIGxhIGNvbW1hbmRlOicsIGVycik7XHJcbiAgICAgICAgICB0aGlzLm5vdGlmaWNhdGlvblNlcnZpY2UuZXJyb3IoJ0VycmV1ciBsb3JzIGRlIGxhIGNyw6lhdGlvbiBkZSBsYSBjb21tYW5kZScpO1xyXG4gICAgICAgICAgb2JzZXJ2ZXIuZXJyb3IoZXJyKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59IiwiaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5pbXBvcnQgeyBIdHRwQ2xpZW50IH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uL2h0dHAnO1xyXG5pbXBvcnQgeyBPYnNlcnZhYmxlIH0gZnJvbSAncnhqcyc7XHJcbmltcG9ydCB7IENvbW1hbmRlIH0gZnJvbSAnLi4vLi4vbW9kZWxzL2NvbW1hbmRlLm1vZGVsJztcclxuaW1wb3J0IHsgUGFuaWVySXRlbSB9IGZyb20gJy4uLy4uL21vZGVscy9wYW5pZXIubW9kZWwnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kZVVwZGF0ZSB7XHJcbiAgc3RhdHV0OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZGVJdGVtIHtcclxuICBwcm9kdWl0OiBudW1iZXI7XHJcbiAgcXVhbnRpdGU6IG51bWJlcjtcclxuICBwcml4X3VuaXRhaXJlOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlQ29tbWFuZGVSZXF1ZXN0IHtcclxuICBpdGVtczogQ29tbWFuZGVJdGVtW107XHJcbiAgY2xpZW50PzogbnVtYmVyO1xyXG59XHJcblxyXG5ASW5qZWN0YWJsZSh7XHJcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXHJcbn0pXHJcbmV4cG9ydCBjbGFzcyBDb21tYW5kZVNlcnZpY2Uge1xyXG5cclxuICBwcml2YXRlIGFwaVVybCA9ICdodHRwOi8vMTI3LjAuMC4xOjgwMDAvYXBpJztcclxuXHJcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBodHRwOiBIdHRwQ2xpZW50KSB7IH1cclxuXHJcbiAgLy8gUsOpY3Vww6lyZXIgdG91dGVzIGxlcyBjb21tYW5kZXMgZHUgY2xpZW50XHJcbiAgZ2V0Q29tbWFuZGVzKCk6IE9ic2VydmFibGU8Q29tbWFuZGVbXT4ge1xyXG4gICAgcmV0dXJuIHRoaXMuaHR0cC5nZXQ8Q29tbWFuZGVbXT4oYCR7dGhpcy5hcGlVcmx9L2NvbW1hbmRlcy9gKTtcclxuICB9XHJcblxyXG4gIC8vIFLDqWN1cMOpcmVyIHVuZSBjb21tYW5kZVxyXG4gIGdldENvbW1hbmRlKGlkOiBudW1iZXIpOiBPYnNlcnZhYmxlPENvbW1hbmRlPiB7XHJcbiAgICByZXR1cm4gdGhpcy5odHRwLmdldDxDb21tYW5kZT4oYCR7dGhpcy5hcGlVcmx9L2NvbW1hbmRlcy8ke2lkfS9gKTtcclxuICB9XHJcblxyXG4gIC8vIENyw6llciB1bmUgY29tbWFuZGUgZGVwdWlzIGxlIHBhbmllclxyXG4gIGNyZWVyQ29tbWFuZGVEZXB1aXNQYW5pZXIoKTogT2JzZXJ2YWJsZTxDb21tYW5kZT4ge1xyXG4gICAgcmV0dXJuIHRoaXMuaHR0cC5wb3N0PENvbW1hbmRlPihgJHt0aGlzLmFwaVVybH0vY29tbWFuZGUvcGFuaWVyL2AsIHt9KTtcclxuICB9XHJcblxyXG4gIC8vIENyw6llciB1bmUgY29tbWFuZGUgYXZlYyBkZXMgaXRlbXMgcGVyc29ubmFsaXPDqXNcclxuICBjcmVhdGVDb21tYW5kZShkYXRhOiBDcmVhdGVDb21tYW5kZVJlcXVlc3QpOiBPYnNlcnZhYmxlPENvbW1hbmRlPiB7XHJcbiAgICByZXR1cm4gdGhpcy5odHRwLnBvc3Q8Q29tbWFuZGU+KGAke3RoaXMuYXBpVXJsfS9jb21tYW5kZXMvY3JlYXRlL2AsIGRhdGEpO1xyXG4gIH1cclxuXHJcbiAgLy8gTWV0dHJlIMOgIGpvdXIgdW5lIGNvbW1hbmRlIChzdGF0dXQpXHJcbiAgdXBkYXRlQ29tbWFuZGUoaWQ6IG51bWJlciwgZGF0YTogQ29tbWFuZGVVcGRhdGUpOiBPYnNlcnZhYmxlPENvbW1hbmRlPiB7XHJcbiAgICByZXR1cm4gdGhpcy5odHRwLnB1dDxDb21tYW5kZT4oYCR7dGhpcy5hcGlVcmx9L2NvbW1hbmRlcy8ke2lkfS9gLCBkYXRhKTtcclxuICB9XHJcblxyXG4gIC8vIFN1cHByaW1lciB1bmUgY29tbWFuZGVcclxuICBkZWxldGVDb21tYW5kZShpZDogbnVtYmVyKTogT2JzZXJ2YWJsZTx2b2lkPiB7XHJcbiAgICByZXR1cm4gdGhpcy5odHRwLmRlbGV0ZTx2b2lkPihgJHt0aGlzLmFwaVVybH0vY29tbWFuZGVzLyR7aWR9L2ApO1xyXG4gIH1cclxuXHJcbiAgLy8gQ29udmVydGlyIGxlcyBpdGVtcyBkdSBwYW5pZXIgZW4gZm9ybWF0IGNvbW1hbmRlXHJcbiAgY29udmVydGlyUGFuaWVyRW5Db21tYW5kZUl0ZW1zKHBhbmllckl0ZW1zOiBQYW5pZXJJdGVtW10pOiBDb21tYW5kZUl0ZW1bXSB7XHJcbiAgICByZXR1cm4gcGFuaWVySXRlbXMubWFwKGl0ZW0gPT4gKHtcclxuICAgICAgcHJvZHVpdDogaXRlbS5wcm9kdWl0LmlkLFxyXG4gICAgICBxdWFudGl0ZTogaXRlbS5xdWFudGl0ZSxcclxuICAgICAgcHJpeF91bml0YWlyZTogaXRlbS5wcml4XHJcbiAgICB9KSk7XHJcbiAgfVxyXG5cclxufSIsImltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuaW1wb3J0IHsgQmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlIH0gZnJvbSAncnhqcyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE5vdGlmaWNhdGlvbiB7XHJcbiAgaWQ6IHN0cmluZztcclxuICB0eXBlOiAnc3VjY2VzcycgfCAnZXJyb3InIHwgJ3dhcm5pbmcnIHwgJ2luZm8nO1xyXG4gIHRpdGxlOiBzdHJpbmc7XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG4gIGR1cmF0aW9uPzogbnVtYmVyO1xyXG4gIHRpbWVzdGFtcDogbnVtYmVyO1xyXG59XHJcblxyXG5ASW5qZWN0YWJsZSh7XHJcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXHJcbn0pXHJcbmV4cG9ydCBjbGFzcyBOb3RpZmljYXRpb25TZXJ2aWNlIHtcclxuXHJcbiAgcHJpdmF0ZSBub3RpZmljYXRpb25zU3ViamVjdCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8Tm90aWZpY2F0aW9uW10+KFtdKTtcclxuICBwdWJsaWMgbm90aWZpY2F0aW9ucyQgPSB0aGlzLm5vdGlmaWNhdGlvbnNTdWJqZWN0LmFzT2JzZXJ2YWJsZSgpO1xyXG5cclxuICBwcml2YXRlIG5vdGlmaWNhdGlvbnM6IE5vdGlmaWNhdGlvbltdID0gW107XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkgeyB9XHJcblxyXG4gIC8vIEFqb3V0ZXIgdW5lIG5vdGlmaWNhdGlvblxyXG4gIHNob3cobm90aWZpY2F0aW9uOiBPbWl0PE5vdGlmaWNhdGlvbiwgJ2lkJyB8ICd0aW1lc3RhbXAnPik6IHZvaWQge1xyXG4gICAgY29uc3QgbmV3Tm90aWZpY2F0aW9uOiBOb3RpZmljYXRpb24gPSB7XHJcbiAgICAgIC4uLm5vdGlmaWNhdGlvbixcclxuICAgICAgaWQ6IHRoaXMuZ2VuZXJhdGVJZCgpLFxyXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICAgIGR1cmF0aW9uOiBub3RpZmljYXRpb24uZHVyYXRpb24gfHwgNDAwMFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLm5vdGlmaWNhdGlvbnMucHVzaChuZXdOb3RpZmljYXRpb24pO1xyXG4gICAgdGhpcy51cGRhdGVOb3RpZmljYXRpb25zKCk7XHJcblxyXG4gICAgLy8gQXV0by1zdXBwcmVzc2lvbiBhcHLDqHMgbGEgZHVyw6llXHJcbiAgICBpZiAobmV3Tm90aWZpY2F0aW9uLmR1cmF0aW9uICYmIG5ld05vdGlmaWNhdGlvbi5kdXJhdGlvbiA+IDApIHtcclxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5yZW1vdmUobmV3Tm90aWZpY2F0aW9uLmlkKTtcclxuICAgICAgfSwgbmV3Tm90aWZpY2F0aW9uLmR1cmF0aW9uKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIE3DqXRob2RlcyByYWNjb3VyY2llc1xyXG4gIHN1Y2Nlc3MobWVzc2FnZTogc3RyaW5nLCB0aXRsZTogc3RyaW5nID0gJ1N1Y2PDqHMnKTogdm9pZCB7XHJcbiAgICB0aGlzLnNob3coe1xyXG4gICAgICB0eXBlOiAnc3VjY2VzcycsXHJcbiAgICAgIHRpdGxlLFxyXG4gICAgICBtZXNzYWdlLFxyXG4gICAgICBkdXJhdGlvbjogMzAwMFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcgPSAnRXJyZXVyJyk6IHZvaWQge1xyXG4gICAgdGhpcy5zaG93KHtcclxuICAgICAgdHlwZTogJ2Vycm9yJyxcclxuICAgICAgdGl0bGUsXHJcbiAgICAgIG1lc3NhZ2UsXHJcbiAgICAgIGR1cmF0aW9uOiA1MDAwXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHdhcm5pbmcobWVzc2FnZTogc3RyaW5nLCB0aXRsZTogc3RyaW5nID0gJ0F0dGVudGlvbicpOiB2b2lkIHtcclxuICAgIHRoaXMuc2hvdyh7XHJcbiAgICAgIHR5cGU6ICd3YXJuaW5nJyxcclxuICAgICAgdGl0bGUsXHJcbiAgICAgIG1lc3NhZ2UsXHJcbiAgICAgIGR1cmF0aW9uOiA0MDAwXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGluZm8obWVzc2FnZTogc3RyaW5nLCB0aXRsZTogc3RyaW5nID0gJ0luZm9ybWF0aW9uJyk6IHZvaWQge1xyXG4gICAgdGhpcy5zaG93KHtcclxuICAgICAgdHlwZTogJ2luZm8nLFxyXG4gICAgICB0aXRsZSxcclxuICAgICAgbWVzc2FnZSxcclxuICAgICAgZHVyYXRpb246IDMwMDBcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gU3VwcHJpbWVyIHVuZSBub3RpZmljYXRpb24gc3DDqWNpZmlxdWVcclxuICByZW1vdmUoaWQ6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgdGhpcy5ub3RpZmljYXRpb25zID0gdGhpcy5ub3RpZmljYXRpb25zLmZpbHRlcihuID0+IG4uaWQgIT09IGlkKTtcclxuICAgIHRoaXMudXBkYXRlTm90aWZpY2F0aW9ucygpO1xyXG4gIH1cclxuXHJcbiAgLy8gVmlkZXIgdG91dGVzIGxlcyBub3RpZmljYXRpb25zXHJcbiAgY2xlYXIoKTogdm9pZCB7XHJcbiAgICB0aGlzLm5vdGlmaWNhdGlvbnMgPSBbXTtcclxuICAgIHRoaXMudXBkYXRlTm90aWZpY2F0aW9ucygpO1xyXG4gIH1cclxuXHJcbiAgLy8gTWV0dHJlIMOgIGpvdXIgbGUgQmVoYXZpb3JTdWJqZWN0XHJcbiAgcHJpdmF0ZSB1cGRhdGVOb3RpZmljYXRpb25zKCk6IHZvaWQge1xyXG4gICAgdGhpcy5ub3RpZmljYXRpb25zU3ViamVjdC5uZXh0KFsuLi50aGlzLm5vdGlmaWNhdGlvbnNdKTtcclxuICB9XHJcblxyXG4gIC8vIEfDqW7DqXJlciB1biBJRCB1bmlxdWVcclxuICBwcml2YXRlIGdlbmVyYXRlSWQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgbm90aWZpY2F0aW9uLSR7RGF0ZS5ub3coKX0tJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSl9YDtcclxuICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5pbXBvcnQgeyBIdHRwQ2xpZW50LCBIdHRwSGVhZGVycyB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi9odHRwJztcclxuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgQmVoYXZpb3JTdWJqZWN0LCBvZiB9IGZyb20gJ3J4anMnO1xyXG5pbXBvcnQgeyB0YXAsIGNhdGNoRXJyb3IsIG1hcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcclxuaW1wb3J0IHsgQXV0aFNlcnZpY2UgfSBmcm9tICcuL2F1dGguc2VydmljZSc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENsaWVudEluZm8ge1xyXG4gIGlkOiBudW1iZXI7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBub206IHN0cmluZztcclxuICBwcmVub206IHN0cmluZztcclxuICB0ZWxlcGhvbmU/OiBzdHJpbmc7XHJcbiAgYWRyZXNzZT86IHN0cmluZztcclxuICByb2xlOiBzdHJpbmc7XHJcbiAgZGF0ZV9pbnNjcmlwdGlvbjogc3RyaW5nO1xyXG4gIHBvaW50X2ZpZGVsaXRlOiBudW1iZXI7XHJcbiAgbW9kZV9wYWllbWVudF9mYXZvcmlzPzogc3RyaW5nO1xyXG4gIGlzX2FjdGl2ZTogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMaWduZUNvbW1hbmRlIHtcclxuICBwcm9kdWl0X25vbTogc3RyaW5nO1xyXG4gIHF1YW50aXRlOiBudW1iZXI7XHJcbiAgcHJpeF91bml0YWlyZTogbnVtYmVyO1xyXG4gIHNvdXNfdG90YWw6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kZSB7XHJcbiAgaWQ6IG51bWJlcjtcclxuICByZWZlcmVuY2U6IHN0cmluZztcclxuICBkYXRlX2NvbW1hbmRlOiBzdHJpbmc7XHJcbiAgbW9udGFudF90b3RhbDogbnVtYmVyO1xyXG4gIHN0YXR1dDogJ2VuX2F0dGVudGUnIHwgJ2VuX2NvdXJzJyB8ICdwYXllJyB8ICdsaXZyZSc7XHJcbiAgbm9tYnJlX3Byb2R1aXRzOiBudW1iZXI7XHJcbiAgbGlnbmVzOiBMaWduZUNvbW1hbmRlW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZGVzUmVzcG9uc2Uge1xyXG4gIGNvbW1hbmRlczogQ29tbWFuZGVbXTtcclxuICB0b3RhbDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZhdm9yaSB7XHJcbiAgaWQ6IG51bWJlcjtcclxuICBwcm9kdWl0X2lkOiBudW1iZXI7XHJcbiAgcHJvZHVpdF9ub206IHN0cmluZztcclxuICBwcml4OiBudW1iZXI7XHJcbiAgaW1hZ2U6IHN0cmluZztcclxuICBkYXRlX2Fqb3V0OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmF2b3Jpc1Jlc3BvbnNlIHtcclxuICBmYXZvcmlzOiBGYXZvcmlbXTtcclxuICB0b3RhbDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBhbmllckl0ZW0ge1xyXG4gIGlkOiBudW1iZXI7XHJcbiAgcHJvZHVpdF9pZDogbnVtYmVyO1xyXG4gIHByb2R1aXRfbm9tOiBzdHJpbmc7XHJcbiAgcHJpeDogbnVtYmVyO1xyXG4gIGltYWdlOiBzdHJpbmc7XHJcbiAgcXVhbnRpdGU6IG51bWJlcjtcclxuICBzb3VzX3RvdGFsOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGFuaWVyUmVzcG9uc2Uge1xyXG4gIGl0ZW1zOiBQYW5pZXJJdGVtW107XHJcbiAgdG90YWw6IG51bWJlcjtcclxuICBub21icmVfaXRlbXM6IG51bWJlcjtcclxufVxyXG5cclxuQEluamVjdGFibGUoe1xyXG4gIHByb3ZpZGVkSW46ICdyb290J1xyXG59KVxyXG5leHBvcnQgY2xhc3MgTW9uQ29tcHRlU2VydmljZSB7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBBUElfVVJMID0gJ2h0dHA6Ly8xMjcuMC4wLjE6ODAwMC9hY2NvdW50JztcclxuICBcclxuICAvLyBCZWhhdmlvclN1YmplY3RzIHBvdXIgbGEgbWlzZSDDoCBqb3VyIGF1dG9tYXRpcXVlXHJcbiAgcHJpdmF0ZSBjbGllbnRJbmZvU3ViamVjdCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8Q2xpZW50SW5mbyB8IG51bGw+KG51bGwpO1xyXG4gIHByaXZhdGUgY29tbWFuZGVzU3ViamVjdCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8Q29tbWFuZGVzUmVzcG9uc2UgfCBudWxsPihudWxsKTtcclxuICBwcml2YXRlIGZhdm9yaXNTdWJqZWN0ID0gbmV3IEJlaGF2aW9yU3ViamVjdDxGYXZvcmlzUmVzcG9uc2UgfCBudWxsPihudWxsKTtcclxuICBwcml2YXRlIHBhbmllclN1YmplY3QgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFBhbmllclJlc3BvbnNlIHwgbnVsbD4obnVsbCk7XHJcbiAgXHJcbiAgLy8gT2JzZXJ2YWJsZXMgcHVibGljc1xyXG4gIGNsaWVudEluZm8kID0gdGhpcy5jbGllbnRJbmZvU3ViamVjdC5hc09ic2VydmFibGUoKTtcclxuICBjb21tYW5kZXMkID0gdGhpcy5jb21tYW5kZXNTdWJqZWN0LmFzT2JzZXJ2YWJsZSgpO1xyXG4gIGZhdm9yaXMkID0gdGhpcy5mYXZvcmlzU3ViamVjdC5hc09ic2VydmFibGUoKTtcclxuICBwYW5pZXIkID0gdGhpcy5wYW5pZXJTdWJqZWN0LmFzT2JzZXJ2YWJsZSgpO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHByaXZhdGUgaHR0cDogSHR0cENsaWVudCxcclxuICAgIHByaXZhdGUgYXV0aFNlcnZpY2U6IEF1dGhTZXJ2aWNlXHJcbiAgKSB7fVxyXG5cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBJTkZPUk1BVElPTlMgVVRJTElTQVRFVVJcclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICBcclxuICBnZXRDbGllbnRJbmZvKCk6IE9ic2VydmFibGU8Q2xpZW50SW5mbz4ge1xyXG4gICAgY29uc3QgaGVhZGVycyA9IHRoaXMuZ2V0QXV0aEhlYWRlcnMoKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHRoaXMuaHR0cC5nZXQ8Q2xpZW50SW5mbz4oYCR7dGhpcy5BUElfVVJMfS9tZS9gLCB7IGhlYWRlcnMgfSkucGlwZShcclxuICAgICAgdGFwKGNsaWVudEluZm8gPT4ge1xyXG4gICAgICAgIHRoaXMuY2xpZW50SW5mb1N1YmplY3QubmV4dChjbGllbnRJbmZvKTtcclxuICAgICAgfSksXHJcbiAgICAgIGNhdGNoRXJyb3IoZXJyb3IgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VycmV1ciBsb3JzIGRlIGxhIHLDqWN1cMOpcmF0aW9uIGRlcyBpbmZvcyBjbGllbnQ6JywgZXJyb3IpO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZUNsaWVudEluZm8oY2xpZW50SW5mbzogUGFydGlhbDxDbGllbnRJbmZvPik6IE9ic2VydmFibGU8Q2xpZW50SW5mbz4ge1xyXG4gICAgY29uc3QgaGVhZGVycyA9IHRoaXMuZ2V0QXV0aEhlYWRlcnMoKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHRoaXMuaHR0cC5wdXQ8Q2xpZW50SW5mbz4oYCR7dGhpcy5BUElfVVJMfS9tZS9gLCBjbGllbnRJbmZvLCB7IGhlYWRlcnMgfSkucGlwZShcclxuICAgICAgdGFwKHVwZGF0ZWRJbmZvID0+IHtcclxuICAgICAgICB0aGlzLmNsaWVudEluZm9TdWJqZWN0Lm5leHQodXBkYXRlZEluZm8pO1xyXG4gICAgICB9KSxcclxuICAgICAgY2F0Y2hFcnJvcihlcnJvciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyZXVyIGxvcnMgZGUgbGEgbWlzZSDDoCBqb3VyIGRlcyBpbmZvcyBjbGllbnQ6JywgZXJyb3IpO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIC8vIENPTU1BTkRFU1xyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIFxyXG4gIGdldE1lc0NvbW1hbmRlcygpOiBPYnNlcnZhYmxlPENvbW1hbmRlc1Jlc3BvbnNlPiB7XHJcbiAgICBjb25zdCBoZWFkZXJzID0gdGhpcy5nZXRBdXRoSGVhZGVycygpO1xyXG4gICAgY29uc29sZS5sb2coJ/Cfk6EgR0VUIC9tZXMtY29tbWFuZGVzLyAtIEhlYWRlcnM6JywgaGVhZGVycyk7XHJcbiAgICBcclxuICAgIHJldHVybiB0aGlzLmh0dHAuZ2V0PENvbW1hbmRlc1Jlc3BvbnNlPihgJHt0aGlzLkFQSV9VUkx9L21lcy1jb21tYW5kZXMvYCwgeyBoZWFkZXJzIH0pLnBpcGUoXHJcbiAgICAgIHRhcChjb21tYW5kZXMgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5OmIENPTU1BTkRFUyBBUEkgUkVTUE9OU0U6JywgY29tbWFuZGVzKTtcclxuICAgICAgICB0aGlzLmNvbW1hbmRlc1N1YmplY3QubmV4dChjb21tYW5kZXMpO1xyXG4gICAgICB9KSxcclxuICAgICAgY2F0Y2hFcnJvcihlcnJvciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEVycmV1ciBsb3JzIGRlIGxhIHLDqWN1cMOpcmF0aW9uIGRlcyBjb21tYW5kZXM6JywgZXJyb3IpO1xyXG4gICAgICAgIC8vIFJldG91cm5lciB1bmUgcsOpcG9uc2UgdmlkZSBlbiBjYXMgZCdlcnJldXJcclxuICAgICAgICBjb25zdCBlbXB0eVJlc3BvbnNlOiBDb21tYW5kZXNSZXNwb25zZSA9IHsgY29tbWFuZGVzOiBbXSwgdG90YWw6IDAgfTtcclxuICAgICAgICB0aGlzLmNvbW1hbmRlc1N1YmplY3QubmV4dChlbXB0eVJlc3BvbnNlKTtcclxuICAgICAgICByZXR1cm4gb2YoZW1wdHlSZXNwb25zZSk7XHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gRkFWT1JJU1xyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIFxyXG4gIGdldEZhdm9yaXMoKTogT2JzZXJ2YWJsZTxGYXZvcmlzUmVzcG9uc2U+IHtcclxuICAgIGNvbnN0IGhlYWRlcnMgPSB0aGlzLmdldEF1dGhIZWFkZXJzKCk7XHJcbiAgICBjb25zb2xlLmxvZygn8J+ToSBHRVQgL2Zhdm9yaXMvIC0gSGVhZGVyczonLCBoZWFkZXJzKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHRoaXMuaHR0cC5nZXQ8RmF2b3Jpc1Jlc3BvbnNlPihgJHt0aGlzLkFQSV9VUkx9L2Zhdm9yaXMvYCwgeyBoZWFkZXJzIH0pLnBpcGUoXHJcbiAgICAgIHRhcChmYXZvcmlzID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZygn4p2k77iPIEZBVk9SSVMgQVBJIFJBVyBSRVNQT05TRTonLCBmYXZvcmlzKTtcclxuICAgICAgICBjb25zb2xlLmxvZygn4p2k77iPIEZBVk9SSVMgQVJSQVk6JywgZmF2b3Jpcy5mYXZvcmlzKTtcclxuICAgICAgICBjb25zb2xlLmxvZygn4p2k77iPIEZBVk9SSVMgVE9UQUw6JywgZmF2b3Jpcy50b3RhbCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ+KdpO+4jyBGQVZPUklTIExFTkdUSDonLCBmYXZvcmlzLmZhdm9yaXM/Lmxlbmd0aCB8fCAwKTtcclxuICAgICAgICB0aGlzLmZhdm9yaXNTdWJqZWN0Lm5leHQoZmF2b3Jpcyk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ+KdpO+4jyBGQVZPUklTIFNVQkpFQ1QgVVBEQVRFRCcpO1xyXG4gICAgICB9KSxcclxuICAgICAgY2F0Y2hFcnJvcihlcnJvciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEVycmV1ciBsb3JzIGRlIGxhIHLDqWN1cMOpcmF0aW9uIGRlcyBmYXZvcmlzOicsIGVycm9yKTtcclxuICAgICAgICAvLyBSZXRvdXJuZXIgdW5lIHLDqXBvbnNlIHZpZGUgZW4gY2FzIGQnZXJyZXVyXHJcbiAgICAgICAgY29uc3QgZW1wdHlSZXNwb25zZTogRmF2b3Jpc1Jlc3BvbnNlID0geyBmYXZvcmlzOiBbXSwgdG90YWw6IDAgfTtcclxuICAgICAgICB0aGlzLmZhdm9yaXNTdWJqZWN0Lm5leHQoZW1wdHlSZXNwb25zZSk7XHJcbiAgICAgICAgcmV0dXJuIG9mKGVtcHR5UmVzcG9uc2UpO1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIGFqb3V0ZXJGYXZvcmkocHJvZHVpdElkOiBudW1iZXIpOiBPYnNlcnZhYmxlPGFueT4ge1xyXG4gICAgY29uc3QgaGVhZGVycyA9IHRoaXMuZ2V0QXV0aEhlYWRlcnMoKTtcclxuICAgIGNvbnNvbGUubG9nKCfwn5OhIFBPU1QgL2Zhdm9yaXMvIC0gcHJvZHVpdF9pZDonLCBwcm9kdWl0SWQpO1xyXG4gICAgY29uc29sZS5sb2coJ/Cfk6EgUE9TVCAvZmF2b3Jpcy8gLSBIZWFkZXJzOicsIGhlYWRlcnMpO1xyXG4gICAgXHJcbiAgICByZXR1cm4gdGhpcy5odHRwLnBvc3QoYCR7dGhpcy5BUElfVVJMfS9mYXZvcmlzL2AsIHsgcHJvZHVpdF9pZDogcHJvZHVpdElkIH0sIHsgaGVhZGVycyB9KS5waXBlKFxyXG4gICAgICB0YXAocmVzcG9uc2UgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgRkFWT1JJIFBPU1QgUkVTUE9OU0U6JywgcmVzcG9uc2UpO1xyXG4gICAgICAgIC8vIFJhZnJhw65jaGlyIGxhIGxpc3RlIGRlcyBmYXZvcmlzIGFwcsOocyBham91dFxyXG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIFJlZnJlc2hpbmcgZmF2b3JpcyBhZnRlciBhZGQuLi4nKTtcclxuICAgICAgICB0aGlzLmdldEZhdm9yaXMoKS5zdWJzY3JpYmUoe1xyXG4gICAgICAgICAgbmV4dDogKGRhdGEpID0+IGNvbnNvbGUubG9nKCfinIUgRmF2b3JpcyByZWZyZXNoZWQgYWZ0ZXIgYWRkOicsIGRhdGEpLFxyXG4gICAgICAgICAgZXJyb3I6IChlcnIpID0+IGNvbnNvbGUuZXJyb3IoJ+KdjCBFcnJvciByZWZyZXNoaW5nIGZhdm9yaXM6JywgZXJyKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KSxcclxuICAgICAgY2F0Y2hFcnJvcihlcnJvciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEVycmV1ciBsb3JzIGRlIGxcXCdham91dCBhdXggZmF2b3JpczonLCBlcnJvcik7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEVycm9yIGRldGFpbHM6JywgZXJyb3IuZXJyb3IpO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHJldGlyZXJGYXZvcmkocHJvZHVpdElkOiBudW1iZXIpOiBPYnNlcnZhYmxlPGFueT4ge1xyXG4gICAgY29uc3QgaGVhZGVycyA9IHRoaXMuZ2V0QXV0aEhlYWRlcnMoKTtcclxuICAgIGNvbnNvbGUubG9nKCfwn5OhIERFTEVURSAvZmF2b3Jpcy8gLSBwcm9kdWl0X2lkOicsIHByb2R1aXRJZCk7XHJcbiAgICBjb25zb2xlLmxvZygn8J+ToSBERUxFVEUgL2Zhdm9yaXMvIC0gSGVhZGVyczonLCBoZWFkZXJzKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy5odHRwLmRlbGV0ZShgJHt0aGlzLkFQSV9VUkx9L2Zhdm9yaXMvYCwge1xyXG4gICAgICBoZWFkZXJzLFxyXG4gICAgICBib2R5OiB7IHByb2R1aXRfaWQ6IHByb2R1aXRJZCB9XHJcbiAgICB9KS5waXBlKFxyXG4gICAgICB0YXAocmVzcG9uc2UgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgRkFWT1JJIERFTEVURSBSRVNQT05TRTonLCByZXNwb25zZSk7XHJcbiAgICAgICAgLy8gUmFmcmHDrmNoaXIgbGEgbGlzdGUgZGVzIGZhdm9yaXMgYXByw6hzIHN1cHByZXNzaW9uXHJcbiAgICAgICAgY29uc29sZS5sb2coJ/CflIQgUmVmcmVzaGluZyBmYXZvcmlzIGFmdGVyIHJlbW92ZS4uLicpO1xyXG4gICAgICAgIHRoaXMuZ2V0RmF2b3JpcygpLnN1YnNjcmliZSh7XHJcbiAgICAgICAgICBuZXh0OiAoZGF0YSkgPT4gY29uc29sZS5sb2coJ+KchSBGYXZvcmlzIHJlZnJlc2hlZCBhZnRlciByZW1vdmU6JywgZGF0YSksXHJcbiAgICAgICAgICBlcnJvcjogKGVycikgPT4gY29uc29sZS5lcnJvcign4p2MIEVycm9yIHJlZnJlc2hpbmcgZmF2b3JpczonLCBlcnIpXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pLFxyXG4gICAgICBjYXRjaEVycm9yKGVycm9yID0+IHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRXJyZXVyIGxvcnMgZHUgcmV0cmFpdCBkZXMgZmF2b3JpczonLCBlcnJvcik7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEVycm9yIGRldGFpbHM6JywgZXJyb3IuZXJyb3IpO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIC8vIFBBTklFUlxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIFxyXG4gIGdldFBhbmllcigpOiBPYnNlcnZhYmxlPFBhbmllclJlc3BvbnNlPiB7XHJcbiAgICBjb25zdCBoZWFkZXJzID0gdGhpcy5nZXRBdXRoSGVhZGVycygpO1xyXG4gICAgY29uc29sZS5sb2coJ/Cfk6EgR0VUIC9wYW5pZXIvIC0gSGVhZGVyczonLCBoZWFkZXJzKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHRoaXMuaHR0cC5nZXQ8UGFuaWVyUmVzcG9uc2U+KGAke3RoaXMuQVBJX1VSTH0vcGFuaWVyL2AsIHsgaGVhZGVycyB9KS5waXBlKFxyXG4gICAgICB0YXAocGFuaWVyID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+bkiBQQU5JRVIgQVBJIFJFU1BPTlNFOicsIHBhbmllcik7XHJcbiAgICAgICAgdGhpcy5wYW5pZXJTdWJqZWN0Lm5leHQocGFuaWVyKTtcclxuICAgICAgfSksXHJcbiAgICAgIGNhdGNoRXJyb3IoZXJyb3IgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBFcnJldXIgbG9ycyBkZSBsYSByw6ljdXDDqXJhdGlvbiBkdSBwYW5pZXI6JywgZXJyb3IpO1xyXG4gICAgICAgIC8vIFJldG91cm5lciB1bmUgcsOpcG9uc2UgdmlkZSBlbiBjYXMgZCdlcnJldXJcclxuICAgICAgICBjb25zdCBlbXB0eVJlc3BvbnNlOiBQYW5pZXJSZXNwb25zZSA9IHsgaXRlbXM6IFtdLCB0b3RhbDogMCwgbm9tYnJlX2l0ZW1zOiAwIH07XHJcbiAgICAgICAgdGhpcy5wYW5pZXJTdWJqZWN0Lm5leHQoZW1wdHlSZXNwb25zZSk7XHJcbiAgICAgICAgcmV0dXJuIG9mKGVtcHR5UmVzcG9uc2UpO1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHN1cHByaW1lckR1UGFuaWVyKGl0ZW1JZDogbnVtYmVyKTogT2JzZXJ2YWJsZTxhbnk+IHtcclxuICAgIGNvbnN0IGhlYWRlcnMgPSB0aGlzLmdldEF1dGhIZWFkZXJzKCk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuaHR0cC5kZWxldGUoYCR7dGhpcy5BUElfVVJMfS9wYW5pZXIvZGVsZXRlLyR7aXRlbUlkfS9gLCB7IGhlYWRlcnMgfSkucGlwZShcclxuICAgICAgdGFwKCgpID0+IHtcclxuICAgICAgICAvLyBSYWZyYcOuY2hpciBsZSBwYW5pZXIgYXByw6hzIHN1cHByZXNzaW9uXHJcbiAgICAgICAgdGhpcy5nZXRQYW5pZXIoKS5zdWJzY3JpYmUoKTtcclxuICAgICAgfSksXHJcbiAgICAgIGNhdGNoRXJyb3IoZXJyb3IgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VycmV1ciBsb3JzIGRlIGxhIHN1cHByZXNzaW9uIGR1IHBhbmllcjonLCBlcnJvcik7XHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgbWV0dHJlQUpvdXJRdWFudGl0ZShpdGVtSWQ6IG51bWJlciwgcXVhbnRpdGU6IG51bWJlcik6IE9ic2VydmFibGU8YW55PiB7XHJcbiAgICBjb25zdCBoZWFkZXJzID0gdGhpcy5nZXRBdXRoSGVhZGVycygpO1xyXG5cclxuICAgIHJldHVybiB0aGlzLmh0dHAucGF0Y2goYCR7dGhpcy5BUElfVVJMfS9wYW5pZXIvdXBkYXRlLyR7aXRlbUlkfS9gLCB7IHF1YW50aXRlIH0sIHsgaGVhZGVycyB9KS5waXBlKFxyXG4gICAgICB0YXAoKCkgPT4ge1xyXG4gICAgICAgIC8vIFJhZnJhw65jaGlyIGxlIHBhbmllciBhcHLDqHMgbWlzZSDDoCBqb3VyXHJcbiAgICAgICAgdGhpcy5nZXRQYW5pZXIoKS5zdWJzY3JpYmUoKTtcclxuICAgICAgfSksXHJcbiAgICAgIGNhdGNoRXJyb3IoZXJyb3IgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VycmV1ciBsb3JzIGRlIGxhIG1pc2Ugw6Agam91ciBkZSBsYSBxdWFudGl0w6k6JywgZXJyb3IpO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIC8vIFVUSUxJVEFJUkVTXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgXHJcbiAgcHJpdmF0ZSBnZXRBdXRoSGVhZGVycygpOiBIdHRwSGVhZGVycyB7XHJcbiAgICBjb25zdCB0b2tlbiA9IHRoaXMuYXV0aFNlcnZpY2UuZ2V0VG9rZW4oKTtcclxuICAgIGNvbnNvbGUubG9nKCfwn5SRIFRPS0VOOicsIHRva2VuID8gJ1BSw4lTRU5UJyA6ICdBQlNFTlQnKTtcclxuICAgIGNvbnN0IGhlYWRlcnMgPSBuZXcgSHR0cEhlYWRlcnMoe1xyXG4gICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHt0b2tlbn1gLFxyXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICB9KTtcclxuICAgIGNvbnNvbGUubG9nKCfwn5OLIEhFQURFUlM6JywgaGVhZGVycyk7XHJcbiAgICByZXR1cm4gaGVhZGVycztcclxuICB9XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIC8vIE1JU0Ugw4AgSk9VUiBBVVRPTUFUSVFVRVxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIFxyXG4gIHJlZnJlc2hBbGxEYXRhKCk6IHZvaWQge1xyXG4gICAgY29uc29sZS5sb2coJ/CflIQgUkVGUkVTSCBBTEwgREFUQSBBUFBFTEUnKTtcclxuICAgIHRoaXMuZ2V0Q2xpZW50SW5mbygpLnN1YnNjcmliZSh7XHJcbiAgICAgIG5leHQ6IChkYXRhKSA9PiBjb25zb2xlLmxvZygn4pyFIENsaWVudCBpbmZvIGNoYXJnw6llOicsIGRhdGEpLFxyXG4gICAgICBlcnJvcjogKGVycikgPT4gY29uc29sZS5lcnJvcign4p2MIEVycmV1ciBjbGllbnQgaW5mbzonLCBlcnIpXHJcbiAgICB9KTtcclxuICAgIHRoaXMuZ2V0TWVzQ29tbWFuZGVzKCkuc3Vic2NyaWJlKHtcclxuICAgICAgbmV4dDogKGRhdGEpID0+IGNvbnNvbGUubG9nKCfinIUgQ29tbWFuZGVzIGNoYXJnw6llczonLCBkYXRhKSxcclxuICAgICAgZXJyb3I6IChlcnIpID0+IGNvbnNvbGUuZXJyb3IoJ+KdjCBFcnJldXIgY29tbWFuZGVzOicsIGVycilcclxuICAgIH0pO1xyXG4gICAgdGhpcy5nZXRGYXZvcmlzKCkuc3Vic2NyaWJlKHtcclxuICAgICAgbmV4dDogKGRhdGEpID0+IGNvbnNvbGUubG9nKCfinIUgRmF2b3JpcyBjaGFyZ8OpczonLCBkYXRhKSxcclxuICAgICAgZXJyb3I6IChlcnIpID0+IGNvbnNvbGUuZXJyb3IoJ+KdjCBFcnJldXIgZmF2b3JpczonLCBlcnIpXHJcbiAgICB9KTtcclxuICAgIHRoaXMuZ2V0UGFuaWVyKCkuc3Vic2NyaWJlKHtcclxuICAgICAgbmV4dDogKGRhdGEpID0+IGNvbnNvbGUubG9nKCfinIUgUGFuaWVyIGNoYXJnw6k6JywgZGF0YSksXHJcbiAgICAgIGVycm9yOiAoZXJyKSA9PiBjb25zb2xlLmVycm9yKCfinYwgRXJyZXVyIHBhbmllcjonLCBlcnIpXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIE3DqXRob2RlcyB1dGlsaXRhaXJlcyBwb3VyIGxlcyBzdGF0dXRzXHJcbiAgZ2V0U3RhdHV0Q2xhc3Moc3RhdHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgc3dpdGNoIChzdGF0dXQpIHtcclxuICAgICAgY2FzZSAnZW5fYXR0ZW50ZSc6IHJldHVybiAnc3RhdHV0LWF0dGVudGUnO1xyXG4gICAgICBjYXNlICdlbl9jb3Vycyc6IHJldHVybiAnc3RhdHV0LWNvdXJzJztcclxuICAgICAgY2FzZSAncGF5ZSc6IHJldHVybiAnc3RhdHV0LXBheWUnO1xyXG4gICAgICBjYXNlICdsaXZyZSc6IHJldHVybiAnc3RhdHV0LWxpdnJlJztcclxuICAgICAgZGVmYXVsdDogcmV0dXJuICdzdGF0dXQtZGVmYXVsdCc7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXRTdGF0dXRMYWJlbChzdGF0dXQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBzd2l0Y2ggKHN0YXR1dCkge1xyXG4gICAgICBjYXNlICdlbl9hdHRlbnRlJzogcmV0dXJuICdFbiBhdHRlbnRlJztcclxuICAgICAgY2FzZSAnZW5fY291cnMnOiByZXR1cm4gJ0VuIGNvdXJzJztcclxuICAgICAgY2FzZSAncGF5ZSc6IHJldHVybiAnUGF5w6llJztcclxuICAgICAgY2FzZSAnbGl2cmUnOiByZXR1cm4gJ0xpdnLDqWUnO1xyXG4gICAgICBkZWZhdWx0OiByZXR1cm4gc3RhdHV0O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZm9ybWF0RGF0ZShkYXRlU3RyaW5nOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGRhdGVTdHJpbmcpO1xyXG4gICAgcmV0dXJuIGRhdGUudG9Mb2NhbGVEYXRlU3RyaW5nKCdmci1GUicsIHtcclxuICAgICAgZGF5OiAnbnVtZXJpYycsXHJcbiAgICAgIG1vbnRoOiAnbG9uZycsXHJcbiAgICAgIHllYXI6ICdudW1lcmljJ1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBmb3JtYXRQcml4KHByaXg6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gbmV3IEludGwuTnVtYmVyRm9ybWF0KCdmci1GUicsIHtcclxuICAgICAgc3R5bGU6ICdjdXJyZW5jeScsXHJcbiAgICAgIGN1cnJlbmN5OiAnWE9GJyxcclxuICAgICAgbWluaW11bUZyYWN0aW9uRGlnaXRzOiAwXHJcbiAgICB9KS5mb3JtYXQocHJpeCk7XHJcbiAgfVxyXG59XHJcbiIsImltcG9ydCB7IGluamVjdCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5pbXBvcnQgeyBDYW5BY3RpdmF0ZUZuLCBSb3V0ZXIgfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xyXG5pbXBvcnQgeyBBdXRoU2VydmljZSB9IGZyb20gJy4uL3NlcnZpY2VzL2F1dGguc2VydmljZSc7XHJcbmltcG9ydCB7IFVzZXJSb2xlIH0gZnJvbSAnLi4vbW9kZWxzL2F1dGgtdXNlci5tb2RlbCc7XHJcblxyXG5leHBvcnQgY29uc3Qgcm9sZUd1YXJkOiBDYW5BY3RpdmF0ZUZuID0gKHJvdXRlKSA9PiB7XHJcbiAgY29uc3QgYXV0aCAgID0gaW5qZWN0KEF1dGhTZXJ2aWNlKTtcclxuICBjb25zdCByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcclxuXHJcbiAgY29uc3QgZXhwZWN0ZWRSb2xlID0gcm91dGUuZGF0YVsncm9sZSddIGFzIFVzZXJSb2xlIHwgdW5kZWZpbmVkO1xyXG5cclxuICAvLyDilIDilIAgTm9uIGF1dGhlbnRpZmnDqSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuICBpZiAoIWF1dGguaXNBdXRoZW50aWNhdGVkKCkpIHtcclxuICAgIC8vIOKchSBSZWRpcmlnZSB2ZXJzIGxhIGJvbm5lIHBhZ2UgbG9naW4gc2Vsb24gbGUgcsO0bGUgYXR0ZW5kdVxyXG4gICAgbGV0IGxvZ2luVXJsID0gJy9hZG1pbi9sb2dpbic7XHJcbiAgICBpZiAoZXhwZWN0ZWRSb2xlID09PSAnZm91cm5pc3NldXInKSB7XHJcbiAgICAgIGxvZ2luVXJsID0gJy9mb3Vybmlzc2V1ci9sb2dpbic7XHJcbiAgICB9IGVsc2UgaWYgKGV4cGVjdGVkUm9sZSA9PT0gJ2NsaWVudCcpIHtcclxuICAgICAgbG9naW5VcmwgPSAnL2xvZ2luJztcclxuICAgIH1cclxuICAgIHJldHVybiByb3V0ZXIucGFyc2VVcmwobG9naW5VcmwpO1xyXG4gIH1cclxuXHJcbiAgLy8g4pSA4pSAIE1hdXZhaXMgcsO0bGUg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgaWYgKGV4cGVjdGVkUm9sZSAmJiAhYXV0aC5oYXNSb2xlKGV4cGVjdGVkUm9sZSkpIHtcclxuICAgIC8vIOKchSBSZWRpcmlnZSB2ZXJzIHNvbiBwcm9wcmUgZXNwYWNlIOKAlCBwYXMgZGUgYm91Y2xlXHJcbiAgICByZXR1cm4gcm91dGVyLnBhcnNlVXJsKGF1dGguaG9tZVJvdXRlKCkpO1xyXG4gIH1cclxuXHJcbiAgLy8g4pSA4pSAIEZvdXJuaXNzZXVyIG5vbiB2YWxpZMOpIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG4gIGlmIChleHBlY3RlZFJvbGUgPT09ICdmb3Vybmlzc2V1cicgJiYgIWF1dGguaXNGb3Vybmlzc2V1clZhbGlkYXRlZCgpKSB7XHJcbiAgICByZXR1cm4gcm91dGVyLnBhcnNlVXJsKCcvZm91cm5pc3NldXIvZW4tYXR0ZW50ZScpO1xyXG4gIH1cclxuXHJcbiAgLy8g4pSA4pSAIEFjY8OocyBhdXRvcmlzw6kg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbiAgcmV0dXJuIHRydWU7XHJcbn07IiwiaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgSHR0cENsaWVudCwgSHR0cEhlYWRlcnMgfSBmcm9tICdAYW5ndWxhci9jb21tb24vaHR0cCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCB0YXAgfSBmcm9tICdyeGpzJztcblxuZXhwb3J0IGludGVyZmFjZSBTZWN1cml0eU92ZXJ2aWV3IHtcbiAgdHdvX2ZhY3Rvcl9lbmFibGVkOiBib29sZWFuO1xuICBlbWFpbF9hbGVydHNfZW5hYmxlZDogYm9vbGVhbjtcbiAgcGFzc3dvcmRfY2hhbmdlZF9hdDogc3RyaW5nIHwgbnVsbDtcbiAgbGFzdF9sb2dpbjogc3RyaW5nIHwgbnVsbDtcbiAgYWN0aXZlX3Nlc3Npb25zX2NvdW50OiBudW1iZXI7XG4gIGFwaV90b2tlbnNfY291bnQ6IG51bWJlcjtcbiAgcmVjZW50X2FsZXJ0czogU2VjdXJpdHlBY3Rpdml0eVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNlY3VyaXR5QWN0aXZpdHkge1xuICBpZD86IG51bWJlcjtcbiAgYWN0aW9uOiBzdHJpbmc7XG4gIGFjdGlvbl9jb2RlPzogc3RyaW5nO1xuICBzdGF0dXM6ICdzdWNjZXNzJyB8ICdmYWlsdXJlJyB8ICdpbmZvJyB8ICd3YXJuaW5nJztcbiAgaXBfYWRkcmVzcz86IHN0cmluZztcbiAgdGltZXN0YW1wOiBzdHJpbmc7XG4gIG1ldGFkYXRhPzogYW55O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFVzZXJTZXNzaW9uIHtcbiAgaWQ6IG51bWJlcjtcbiAgc2Vzc2lvbl9rZXk6IHN0cmluZztcbiAgZGV2aWNlX25hbWU6IHN0cmluZztcbiAgdXNlcl9hZ2VudDogc3RyaW5nO1xuICBpcF9hZGRyZXNzOiBzdHJpbmc7XG4gIGxvY2F0aW9uOiBzdHJpbmc7XG4gIGNyZWF0ZWRfYXQ6IHN0cmluZztcbiAgbGFzdF9hY3RpdmVfYXQ6IHN0cmluZztcbiAgaXNfY3VycmVudDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBUElUb2tlbiB7XG4gIGlkOiBudW1iZXI7XG4gIG5hbWU6IHN0cmluZztcbiAga2V5OiBzdHJpbmc7XG4gIGNyZWF0ZWRfYXQ6IHN0cmluZztcbiAgbGFzdF91c2VkX2F0OiBzdHJpbmcgfCBudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFR3b0ZhY3RvclJlc3BvbnNlIHtcbiAgZW5hYmxlZDogYm9vbGVhbjtcbiAgc2VjcmV0OiBzdHJpbmcgfCBudWxsO1xuICBvdHBhdXRoX3VybDogc3RyaW5nIHwgbnVsbDtcbiAgYmFja3VwX2NvZGVzOiBzdHJpbmdbXTtcbiAgZW1haWxfYWxlcnRzX2VuYWJsZWQ6IGJvb2xlYW47XG59XG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0IGNsYXNzIFNlY3VyaXR5U2VydmljZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgYXBpVXJsID0gJ2h0dHA6Ly8xMjcuMC4wLjE6ODAwMC9hY2NvdW50L3NlY3VyaXR5JztcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGh0dHA6IEh0dHBDbGllbnQpIHt9XG5cbiAgcHJpdmF0ZSBnZXRTZXNzaW9uS2V5KCk6IHN0cmluZyB7XG4gICAgbGV0IGtleSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdzZWN1cml0eV9zZXNzaW9uX2tleScpO1xuICAgIGlmICgha2V5KSB7XG4gICAgICBrZXkgPSB0aGlzLmdlbmVyYXRlU2Vzc2lvbktleSgpO1xuICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3NlY3VyaXR5X3Nlc3Npb25fa2V5Jywga2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGdlbmVyYXRlU2Vzc2lvbktleSgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoMzIpO1xuICAgIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMoYXJyYXkpO1xuICAgIHJldHVybiBidG9hKFN0cmluZy5mcm9tQ2hhckNvZGUoLi4uYXJyYXkpKTtcbiAgfVxuXG4gIHByaXZhdGUgc2Vzc2lvbkhlYWRlcnMoKTogeyBoZWFkZXJzOiBIdHRwSGVhZGVycyB9IHtcbiAgICByZXR1cm4geyBoZWFkZXJzOiBuZXcgSHR0cEhlYWRlcnMoeyAnWC1TZXNzaW9uLUtleSc6IHRoaXMuZ2V0U2Vzc2lvbktleSgpIH0pIH07XG4gIH1cblxuICBnZXRPdmVydmlldygpOiBPYnNlcnZhYmxlPFNlY3VyaXR5T3ZlcnZpZXc+IHtcbiAgICByZXR1cm4gdGhpcy5odHRwLmdldDxTZWN1cml0eU92ZXJ2aWV3PihgJHt0aGlzLmFwaVVybH0vb3ZlcnZpZXcvYCk7XG4gIH1cblxuICBjaGFuZ2VQYXNzd29yZChjdXJyZW50UGFzc3dvcmQ6IHN0cmluZywgbmV3UGFzc3dvcmQ6IHN0cmluZyk6IE9ic2VydmFibGU8eyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgIHJldHVybiB0aGlzLmh0dHAucG9zdDx7IG1lc3NhZ2U6IHN0cmluZyB9PihcbiAgICAgIGAke3RoaXMuYXBpVXJsfS9jaGFuZ2UtcGFzc3dvcmQvYCxcbiAgICAgIHsgY3VycmVudF9wYXNzd29yZDogY3VycmVudFBhc3N3b3JkLCBuZXdfcGFzc3dvcmQ6IG5ld1Bhc3N3b3JkIH1cbiAgICApO1xuICB9XG5cbiAgZ2V0VHdvRmFjdG9yKCk6IE9ic2VydmFibGU8eyBlbmFibGVkOiBib29sZWFuOyBlbWFpbF9hbGVydHNfZW5hYmxlZDogYm9vbGVhbiB9PiB7XG4gICAgcmV0dXJuIHRoaXMuaHR0cC5nZXQ8eyBlbmFibGVkOiBib29sZWFuOyBlbWFpbF9hbGVydHNfZW5hYmxlZDogYm9vbGVhbiB9PihgJHt0aGlzLmFwaVVybH0vdHdvLWZhY3Rvci9gKTtcbiAgfVxuXG4gIHNldFR3b0ZhY3RvcihlbmFibGVkOiBib29sZWFuLCBlbWFpbEFsZXJ0c0VuYWJsZWQ6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFR3b0ZhY3RvclJlc3BvbnNlPiB7XG4gICAgcmV0dXJuIHRoaXMuaHR0cC5wb3N0PFR3b0ZhY3RvclJlc3BvbnNlPihcbiAgICAgIGAke3RoaXMuYXBpVXJsfS90d28tZmFjdG9yL2AsXG4gICAgICB7IGVuYWJsZWQsIGVtYWlsX2FsZXJ0c19lbmFibGVkOiBlbWFpbEFsZXJ0c0VuYWJsZWQgfVxuICAgICk7XG4gIH1cblxuICBnZXRBY3Rpdml0eSgpOiBPYnNlcnZhYmxlPFNlY3VyaXR5QWN0aXZpdHlbXT4ge1xuICAgIHJldHVybiB0aGlzLmh0dHAuZ2V0PFNlY3VyaXR5QWN0aXZpdHlbXT4oYCR7dGhpcy5hcGlVcmx9L2FjdGl2aXR5L2ApO1xuICB9XG5cbiAgZ2V0U2Vzc2lvbnMoKTogT2JzZXJ2YWJsZTxVc2VyU2Vzc2lvbltdPiB7XG4gICAgcmV0dXJuIHRoaXMuaHR0cC5nZXQ8VXNlclNlc3Npb25bXT4oYCR7dGhpcy5hcGlVcmx9L3Nlc3Npb25zL2AsIHRoaXMuc2Vzc2lvbkhlYWRlcnMoKSk7XG4gIH1cblxuICByZWdpc3RlclNlc3Npb24oZGV2aWNlTmFtZT86IHN0cmluZyk6IE9ic2VydmFibGU8eyBtZXNzYWdlOiBzdHJpbmc7IHNlc3Npb25fa2V5OiBzdHJpbmcgfT4ge1xuICAgIGNvbnN0IGJvZHkgPSB7XG4gICAgICBzZXNzaW9uX2tleTogdGhpcy5nZXRTZXNzaW9uS2V5KCksXG4gICAgICBkZXZpY2VfbmFtZTogZGV2aWNlTmFtZSB8fCB0aGlzLmd1ZXNzRGV2aWNlTmFtZSgpXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5odHRwLnBvc3Q8eyBtZXNzYWdlOiBzdHJpbmc7IHNlc3Npb25fa2V5OiBzdHJpbmcgfT4oXG4gICAgICBgJHt0aGlzLmFwaVVybH0vc2Vzc2lvbnMvcmVnaXN0ZXIvYCxcbiAgICAgIGJvZHksXG4gICAgICB0aGlzLnNlc3Npb25IZWFkZXJzKClcbiAgICApLnBpcGUodGFwKCgpID0+IHt9KSk7XG4gIH1cblxuICByZXZva2VTZXNzaW9uKHNlc3Npb25LZXk6IHN0cmluZyk6IE9ic2VydmFibGU8eyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgIHJldHVybiB0aGlzLmh0dHAucG9zdDx7IG1lc3NhZ2U6IHN0cmluZyB9PihcbiAgICAgIGAke3RoaXMuYXBpVXJsfS9zZXNzaW9ucy8ke3Nlc3Npb25LZXl9L3Jldm9rZS9gLFxuICAgICAge30sXG4gICAgICB0aGlzLnNlc3Npb25IZWFkZXJzKClcbiAgICApO1xuICB9XG5cbiAgcmV2b2tlT3RoZXJTZXNzaW9ucygpOiBPYnNlcnZhYmxlPHsgbWVzc2FnZTogc3RyaW5nIH0+IHtcbiAgICByZXR1cm4gdGhpcy5odHRwLnBvc3Q8eyBtZXNzYWdlOiBzdHJpbmcgfT4oXG4gICAgICBgJHt0aGlzLmFwaVVybH0vc2Vzc2lvbnMvcmV2b2tlLW90aGVycy9gLFxuICAgICAge30sXG4gICAgICB0aGlzLnNlc3Npb25IZWFkZXJzKClcbiAgICApO1xuICB9XG5cbiAgZ2V0VG9rZW5zKCk6IE9ic2VydmFibGU8QVBJVG9rZW5bXT4ge1xuICAgIHJldHVybiB0aGlzLmh0dHAuZ2V0PEFQSVRva2VuW10+KGAke3RoaXMuYXBpVXJsfS90b2tlbnMvYCk7XG4gIH1cblxuICBjcmVhdGVUb2tlbihuYW1lOiBzdHJpbmcpOiBPYnNlcnZhYmxlPEFQSVRva2VuPiB7XG4gICAgcmV0dXJuIHRoaXMuaHR0cC5wb3N0PEFQSVRva2VuPihgJHt0aGlzLmFwaVVybH0vdG9rZW5zL2AsIHsgbmFtZSB9KTtcbiAgfVxuXG4gIHJldm9rZVRva2VuKHRva2VuSWQ6IG51bWJlcik6IE9ic2VydmFibGU8eyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgIHJldHVybiB0aGlzLmh0dHAuZGVsZXRlPHsgbWVzc2FnZTogc3RyaW5nIH0+KGAke3RoaXMuYXBpVXJsfS90b2tlbnMvJHt0b2tlbklkfS9gKTtcbiAgfVxuXG4gIGxvZ291dEFsbCgpOiBPYnNlcnZhYmxlPHsgbWVzc2FnZTogc3RyaW5nIH0+IHtcbiAgICByZXR1cm4gdGhpcy5odHRwLnBvc3Q8eyBtZXNzYWdlOiBzdHJpbmcgfT4oYCR7dGhpcy5hcGlVcmx9L2xvZ291dC1hbGwvYCwge30sIHRoaXMuc2Vzc2lvbkhlYWRlcnMoKSk7XG4gIH1cblxuICBkZWFjdGl2YXRlQWNjb3VudChwYXNzd29yZDogc3RyaW5nKTogT2JzZXJ2YWJsZTx7IG1lc3NhZ2U6IHN0cmluZyB9PiB7XG4gICAgcmV0dXJuIHRoaXMuaHR0cC5wb3N0PHsgbWVzc2FnZTogc3RyaW5nIH0+KGAke3RoaXMuYXBpVXJsfS9kZWFjdGl2YXRlL2AsIHsgcGFzc3dvcmQgfSk7XG4gIH1cblxuICBwcml2YXRlIGd1ZXNzRGV2aWNlTmFtZSgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudDtcbiAgICBpZiAoL01vYml8QW5kcm9pZC9pLnRlc3QodWEpKSByZXR1cm4gJ01vYmlsZSc7XG4gICAgaWYgKC9pUGFkfFRhYmxldC9pLnRlc3QodWEpKSByZXR1cm4gJ1RhYmxldHRlJztcbiAgICBpZiAoL1dpbmRvd3MvaS50ZXN0KHVhKSkgcmV0dXJuICdXaW5kb3dzJztcbiAgICBpZiAoL01hYy9pLnRlc3QodWEpKSByZXR1cm4gJ01hYyc7XG4gICAgaWYgKC9MaW51eC9pLnRlc3QodWEpKSByZXR1cm4gJ0xpbnV4JztcbiAgICByZXR1cm4gJ0FwcGFyZWlsIGluY29ubnUnO1xuICB9XG59XG4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7OztTQUFTLGNBQUFBLGFBQVksUUFBUSxrQkFBa0I7QUFFL0MsU0FBUyxtQkFBQUMsa0JBQTZCLE9BQUFDLFlBQVc7OztBQ0ZqRDs7OztTQUFTLGNBQUFDLG1CQUFrQjtBQUUzQixTQUFTLG1CQUFBQyxrQkFBaUIsa0JBQXNCO0FBQ2hELFNBQVMsT0FBQUMsWUFBVzs7Ozs7QUNIcEI7Ozs7U0FBUyxrQkFBa0I7OztBQXdCckIsSUFBTyxrQkFBUCxNQUFPLGlCQUFlO0VBSU47RUFGWixTQUFTO0VBRWpCLFlBQW9CLE1BQWdCO0FBQWhCLFNBQUEsT0FBQTtFQUFvQjs7RUFHeEMsZUFBWTtBQUNWLFdBQU8sS0FBSyxLQUFLLElBQWdCLEdBQUcsS0FBSyxNQUFNLGFBQWE7RUFDOUQ7O0VBR0EsWUFBWSxJQUFVO0FBQ3BCLFdBQU8sS0FBSyxLQUFLLElBQWMsR0FBRyxLQUFLLE1BQU0sY0FBYyxFQUFFLEdBQUc7RUFDbEU7O0VB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TUFBTSxnQkFBZ0IsQ0FBQSxHQUFJLEtBQUssZUFBYyxDQUFFO0VBQ3BHO0VBRUEsa0JBQWtCLFVBQWdCO0FBQ2hDLFdBQU8sS0FBSyxLQUFLLEtBQTBCLEdBQUcsS0FBSyxNQUFNLGdCQUFnQixFQUFFLFNBQVEsQ0FBRTtFQUN2RjtFQUVRLGtCQUFlO0FBQ3JCLFVBQU0sS0FBSyxVQUFVO0FBQ3JCLFFBQUksZ0JBQWdCLEtBQUssRUFBRTtBQUFHLGFBQU87QUFDckMsUUFBSSxlQUFlLEtBQUssRUFBRTtBQUFHLGFBQU87QUFDcEMsUUFBSSxXQUFXLEtBQUssRUFBRTtBQUFHLGFBQU87QUFDaEMsUUFBSSxPQUFPLEtBQUssRUFBRTtBQUFHLGFBQU87QUFDNUIsUUFBSSxTQUFTLEtBQUssRUFBRTtBQUFHLGFBQU87QUFDOUIsV0FBTztFQUNUOztxQ0E5R1csa0JBQWUsdUJBQUEsY0FBQSxDQUFBO0VBQUE7Z0ZBQWYsa0JBQWUsU0FBZixpQkFBZSxXQUFBLFlBRmQsT0FBTSxDQUFBOzs7Z0ZBRVAsaUJBQWUsQ0FBQTtVQUgzQkY7V0FBVztNQUNWLFlBQVk7S0FDYjs7OyIsIm5hbWVzIjpbIkluamVjdGFibGUiLCJCZWhhdmlvclN1YmplY3QiLCJ0YXAiLCJJbmplY3RhYmxlIiwiQmVoYXZpb3JTdWJqZWN0IiwidGFwIiwiSW5qZWN0YWJsZSIsIkluamVjdGFibGUiLCJJbmplY3RhYmxlIiwiQmVoYXZpb3JTdWJqZWN0IiwiQmVoYXZpb3JTdWJqZWN0IiwiSW5qZWN0YWJsZSIsIkJlaGF2aW9yU3ViamVjdCIsInRhcCIsIkluamVjdGFibGUiLCJCZWhhdmlvclN1YmplY3QiLCJ0YXAiLCJJbmplY3RhYmxlIiwiaW5qZWN0IiwiaW5qZWN0IiwiSW5qZWN0YWJsZSIsIkh0dHBIZWFkZXJzIiwidGFwIl19
