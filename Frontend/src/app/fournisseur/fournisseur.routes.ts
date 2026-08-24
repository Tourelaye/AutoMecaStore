import { Routes } from '@angular/router';
import { FournisseurLayoutComponent } from './layout/fournisseur-layout/fournisseur-layout.component';
import { DashboardFournisseurComponent } from './dashboard/dashboard-fournisseur/dashboard-fournisseur.component';
// import { ModifierProduitComponent } from './produits/list-produit/list-produit.component';
import { ProduitComponent } from './produits/list-produit/list-produit.component';
import { ListeCommandesComponent } from './commandes/liste-commandes/liste-commandes.component';
import { ListeLivraisonsComponent } from './livraisons/liste-livraisons/liste-livraisons.component';
import { ListeAvisComponent } from './avis/liste-avis/liste-avis.component';
import { VentesComponent } from './ventes/ventes.component';
import { StockComponent } from './stocks/stocks.component';
import { AjouterProduitComponent } from './ajouter-produit/ajouter-produit.component';
import { PromotionsComponent } from './promotions/promotions.component';
import { MessagerieComponent } from './messages/messagerie/messagerie.component';
import { StatistiquesFournisseurComponent } from './statistiques/statistiques-fournisseur/statistiques-fournisseur.component';
import { MonProfilComponent } from './profil/mon-profil/mon-profil.component';
import { ParametresComponent } from './parametres/parametres-fournisseur/parametres-fournisseur.component';
import { supplierGuard } from '../core/guards/supplier.guard';
import { ModifierProfilComponent } from './profil/modifier-profil/modifier-profil.component';
import { HistoriquesComponent } from './historiques/historiques.component';
import { FournisseurDemandesComponent } from './demandes/fournisseur-demandes.component';
import { FournisseurLoginComponent } from './auth/login/fournisseur-login.component';
import { FournisseurRegisterComponent } from './auth/register/fournisseur-register.component';
import { FournisseurEnAttenteComponent } from './auth/en-attente/fournisseur-en-attente.component';
import { FournisseurMotDePasseOublieComponent } from './auth/mot-de-passe-oublie/mot-de-passe-oublie.component';
import { SecuriteComponent } from './securite/securite.component';
import { NotificationsFournisseurComponent } from './notifications/notifications-fournisseur/notifications-fournisseur.component';
import { MonMagasinComponent } from './mon-magasin/mon-magasin.component';

export const fournisseurRoutes: Routes = [
  {
    path: 'login',
    component: FournisseurLoginComponent
  },
  {
    path: 'register',
    component: FournisseurRegisterComponent
  },
  {
    path: 'en-attente',
    component: FournisseurEnAttenteComponent
  },
  {
    path: 'mot-de-passe-oublie',
    component: FournisseurMotDePasseOublieComponent
  },
  {
    path: '',
    component: FournisseurLayoutComponent,
    canActivate: [supplierGuard],
    canActivateChild: [supplierGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardFournisseurComponent
      },
      {
        path: 'mon-magasin',
        component: MonMagasinComponent
      },
   
      {
        path: 'produits/list-produit',
        component: ProduitComponent
      },
      {
        path: 'ajouter-produit',
        component: AjouterProduitComponent
      },
      {
        path: 'modifier-produit/:id',
        component: AjouterProduitComponent
      },

      {
        path: 'commandes',
        component: ListeCommandesComponent
      },
      {
        path: 'ventes',
        component: VentesComponent
      },
      {
        path: 'stocks',
        component: StockComponent
      },
      {
        path: 'demandes',
        component: FournisseurDemandesComponent
      },
      {
        path: 'promotions',
        component: PromotionsComponent
      },
      {
        path: 'livraisons',
        component: ListeLivraisonsComponent
      },
      {
        path: 'avis',
        component: ListeAvisComponent
      },
      {
        path: 'messages',
        component: MessagerieComponent
      },
      {
        path: 'statistiques',
        component: StatistiquesFournisseurComponent
      },
      {
        path: 'profil',
        component: MonProfilComponent
      },
      {
        path: 'profil/modifier',
        component: ModifierProfilComponent
      },
      {
        path: 'parametres',
        component: ParametresComponent
      },
      {
        path: 'historiques',
        component: HistoriquesComponent
      },
      {
        path: 'securite',
        component: SecuriteComponent
      },
      {
        path: 'notifications',
        component: NotificationsFournisseurComponent
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
