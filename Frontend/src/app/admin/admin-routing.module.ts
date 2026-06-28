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

const routes: Routes = [
  { 
    path: '', 
    component: AdminLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'produits', component: ProduitComponent },
      { path: 'categories', component: CategorieComponent },
      { path: 'commandes', component: CommandeComponent },
      { path: 'clients', component: ClientComponent },
      { path: 'livraisons', component: LivraisonComponent },
      { path: 'avis', component: AvisReclamationComponent },
      { path: 'promotions', component: PromotionComponent },
      { path: 'parametres', component: ParametreComponent },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
