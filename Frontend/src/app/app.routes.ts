import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProduitsComponent } from './client/pages/produits/produits.component';
import { RechercheComponent } from './client/pages/recherche/recherche.component';
import { LoginComponent } from './client/pages/login/login.component';
import { RegisterComponent } from './client/pages/register/register.component';
import { ClientMotDePasseOublieComponent } from './client/pages/mot-de-passe-oublie/mot-de-passe-oublie.component';
import { AutoListComponent } from './client/pages/catalog/auto/auto-list/auto-list.component';
import { MotoListComponent } from './client/pages/catalog/moto/moto-list/moto-list.component';
import { PoidLourdsListComponent } from './client/pages/catalog/poidLourds/poid-lourds-list/poid-lourds-list.component';
import { VeloListComponent } from './client/pages/catalog/velo/velo-list/velo-list.component';
import { AideComponent } from './client/pages/aide/aide.component';
import { FaqComponent } from './client/pages/faq/faq.component';
import { NotificationsPageComponent } from './client/pages/notifications/notifications-page.component';
import { PanierComponent } from './client/pages/panier/panier.component';
import { MagasinDetailComponent } from './client/pages/magasin-detail/magasin-detail.component';
import { MonCompteComponent } from './client/pages/mon-compte/mon-compte.component';
import { MesDemandesComponent } from './client/pages/mes-demandes/mes-demandes.component';
import { MesVehiculesComponent } from './client/pages/mes-vehicules/mes-vehicules.component';
import { fournisseurRoutes } from './fournisseur/fournisseur.routes';
import { clientGuard } from './core/guards/client.guard'; 

export const routes: Routes = [
  { path: '',             component: HomeComponent },
  { path: 'catalog/auto',        component: AutoListComponent },
  { path: 'catalog/moto',        component: MotoListComponent },
  { path: 'catalog/poidLourds',  component: PoidLourdsListComponent },
  { path: 'catalog/velo',        component: VeloListComponent },
  { path: 'login',               component: LoginComponent },
  { path: 'mot-de-passe-oublie', component: ClientMotDePasseOublieComponent },
  { path: 'register',            component: RegisterComponent },
  { path: 'aide',                component: AideComponent },
  { path: 'faq',                 component: FaqComponent },
  { path: 'panier',              component: PanierComponent, canActivate: [clientGuard] },
  { path: 'produits',            component: ProduitsComponent },
  { path: 'recherche',           component: RechercheComponent },
  { path: 'notifications',       component: NotificationsPageComponent },
  { path: 'magasins/:id',        component: MagasinDetailComponent },

  // ===== ESPACE CLIENT =====
  { path: 'mon-compte',                  component: MonCompteComponent, canActivate: [clientGuard] },
  { path: 'mon-compte/securite',         component: MonCompteComponent, canActivate: [clientGuard] },
  { path: 'mon-compte/confidentialite',  component: MonCompteComponent, canActivate: [clientGuard] },
  { path: 'mes-commandes',               component: MonCompteComponent, canActivate: [clientGuard] },
  { path: 'mes-favoris',                 component: MonCompteComponent, canActivate: [clientGuard] },
  { path: 'mes-demandes',                component: MesDemandesComponent, canActivate: [clientGuard] },
  { path: 'mes-vehicules',               component: MesVehiculesComponent, canActivate: [clientGuard] },

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