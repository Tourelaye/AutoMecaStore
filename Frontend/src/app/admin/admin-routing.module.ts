import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { AdminLayoutComponent } from './layouts/admin-layout.component';
import { DashboardComponent } from './component/dashboard/dashboard.component';
import { ProduitComponent } from './component/produit/produit.component';
import { ClientComponent } from './component/client/client.component';
import { LivraisonComponent } from './component/livraison/livraison.component';
import { AvisReclamationComponent } from './component/avis-reclamation/avis-reclamation.component';
import { PromotionComponent } from './component/promotion/promotion.component';
import { ParametreComponent } from './component/parametre/parametre.component';
import { CommandeComponent } from './component/commande/commande.component';
import { CategorieComponent } from './component/categorie/categorie.component';
import { roleGuard } from '../core/guards/role.guard';
import { FournisseurComponent } from './component/fournisseur/fournisseur.component';
import { PaiementComponent } from './component/paiement/paiement.component';
const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [roleGuard],
    canActivateChild: [roleGuard],
    data: { role: 'admin' },
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'fournisseurs', component: FournisseurComponent },
      { path: 'clients', component: ClientComponent },
      { path: 'produits', component: ProduitComponent },
      { path: 'categories', component: CategorieComponent },
      { path: 'commandes', component: CommandeComponent },
      { path: 'paiements', component: PaiementComponent },
      { path: 'livraisons', component: LivraisonComponent },
      { path: 'avis', component: AvisReclamationComponent },
      { path: 'promotions', component: PromotionComponent },
      { path: 'parametres', component: ParametreComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
