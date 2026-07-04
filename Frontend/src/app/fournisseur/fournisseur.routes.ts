import { Routes } from '@angular/router';
import { FournisseurLayoutComponent } from './layout/fournisseur-layout/fournisseur-layout.component';
import { DashboardFournisseurComponent } from './dashboard/dashboard-fournisseur/dashboard-fournisseur.component';
// import { ModifierProduitComponent } from './produits/list-produit/list-produit.component';
import { ProduitComponent } from './produits/list-produit/list-produit.component';
import { ListeCommandesComponent } from './commandes/liste-commandes/liste-commandes.component';
import { ListeLivraisonsComponent } from './livraisons/liste-livraisons/liste-livraisons.component';
import { ListeAvisComponent } from './avis/liste-avis/liste-avis.component';
import { MessagerieComponent } from './messages/messagerie/messagerie.component';
import { StatistiquesFournisseurComponent } from './statistiques/statistiques-fournisseur/statistiques-fournisseur.component';
import { MonProfilComponent } from './profil/mon-profil/mon-profil.component';
import { ParametresFournisseurComponent } from './parametres/parametres-fournisseur/parametres-fournisseur.component';
import { roleGuard } from '../core/guards/role.guard';

export const fournisseurRoutes: Routes = [
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
        path: 'commandes',
        component: ListeCommandesComponent
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
        path: 'parametres',
        component: ParametresFournisseurComponent
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
