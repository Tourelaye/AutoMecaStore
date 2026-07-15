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
import { roleGuard } from '../core/guards/role.guard';
import { ModifierProfilComponent } from './profil/modifier-profil/modifier-profil.component';
import { HistoriquesComponent } from './historiques/historiques.component';
import { FournisseurLoginComponent } from './auth/login/fournisseur-login.component';
import { FournisseurRegisterComponent } from './auth/register/fournisseur-register.component';
import { FournisseurEnAttenteComponent } from './auth/en-attente/fournisseur-en-attente.component';

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
    path: '',
    component: FournisseurLayoutComponent,
    canActivate: [roleGuard],
    canActivateChild: [roleGuard],
    data: { role: 'fournisseur' },
    children: [
      {
        path: 'dashboard',
        component: DashboardFournisseurComponent
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
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
