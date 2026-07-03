import { Routes } from '@angular/router';
import { FournisseurLayoutComponent } from './layout/fournisseur-layout/fournisseur-layout.component';
import { DashboardFournisseurComponent } from './dashboard/dashboard-fournisseur/dashboard-fournisseur.component';
import { ListeProduitsComponent } from './produits/liste-produits/liste-produits.component';
import { AjouterProduitComponent } from './produits/ajouter-produit/ajouter-produit.component';
import { ModifierProduitComponent } from './produits/modifier-produit/modifier-produit.component';
import { DetailsProduitComponent } from './produits/details-produit/details-produit.component';
import { ListeCommandesComponent } from './commandes/liste-commandes/liste-commandes.component';
import { DetailsCommandeComponent } from './commandes/details-commande/details-commande.component';
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
        path: 'produits',
        component: ListeProduitsComponent
      },
      {
        path: 'produits/ajouter',
        component: AjouterProduitComponent
      },
      {
        path: 'produits/modifier/:id',
        component: ModifierProduitComponent
      },
      {
        path: 'produits/:id',
        component: DetailsProduitComponent
      },
      {
        path: 'commandes',
        component: ListeCommandesComponent
      },
      {
        path: 'commandes/:id',
        component: DetailsCommandeComponent
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
