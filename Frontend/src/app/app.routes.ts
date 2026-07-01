import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProduitsComponent } from './client/pages/produits/produits.component';
import { LoginComponent } from './client/pages/login/login.component';
import { RegisterComponent } from './client/pages/register/register.component';
import { AutoListComponent } from './client/pages/catalog/auto/auto-list/auto-list.component';
import { MotoListComponent } from './client/pages/catalog/moto/moto-list/moto-list.component';
import { PoidLourdsListComponent } from './client/pages/catalog/poidLourds/poid-lourds-list/poid-lourds-list.component';
import { VeloListComponent } from './client/pages/catalog/velo/velo-list/velo-list.component';
import { AideComponent } from './client/pages/aide/aide.component';
import { FaqComponent } from './client/pages/faq/faq.component';
import { PanierComponent } from './client/pages/panier/panier.component';
import { MonCompteComponent } from './client/pages/mon-compte/mon-compte.component';
import { fournisseurRoutes } from './fournisseur/fournisseur.routes'; 

export const routes: Routes = [
  { path: '',             component: HomeComponent },
  { path: 'catalog/auto',        component: AutoListComponent },
  { path: 'catalog/moto',        component: MotoListComponent },
  { path: 'catalog/poidLourds',  component: PoidLourdsListComponent },
  { path: 'catalog/velo',        component: VeloListComponent },
  { path: 'login',               component: LoginComponent },
  { path: 'register',            component: RegisterComponent },
  { path: 'aide',                component: AideComponent },
  { path: 'faq',                 component: FaqComponent },
  { path: 'panier',              component: PanierComponent },
  { path: 'produits',            component: ProduitsComponent },

  // ===== ESPACE CLIENT =====
  { path: 'mon-compte',                  component: MonCompteComponent },
  { path: 'mon-compte/securite',         component: MonCompteComponent },
  { path: 'mon-compte/confidentialite',  component: MonCompteComponent },
  { path: 'mes-commandes',               component: MonCompteComponent },
  { path: 'mes-favoris',                 component: MonCompteComponent },

  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  },

  // ===== ESPACE FOURNISSEUR =====
  {
    path: 'fournisseur',
    children: fournisseurRoutes
  },

  { path: '**', redirectTo: '' }
];