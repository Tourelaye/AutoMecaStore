import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { AdminMotDePasseOublieComponent } from './mot-de-passe-oublie/mot-de-passe-oublie.component';
import { AdminLayoutComponent } from './layouts/admin-layout.component';
import { AdminDashboardComponent } from './component/dashboard/dashboard.component';
import { ProduitComponent } from './component/produit/produit.component';
import { LivraisonComponent } from './component/livraison/livraison.component';
import { ParametresComponent } from './component/parametre/parametre.component';
import { CommandeAdminComponent } from './component/commande/commande-admin.component';
import { UtilisateurAdminComponent } from './component/utilisateur/utilisateur-admin.component';
import { ReclamationComponent } from './component/reclamation/reclamation.component';
import { CategorieComponent } from './component/categorie/categorie.component';
import { MarqueComponent } from './component/marque/marque.component';
import { adminGuard } from '../core/guards/admin.guard';
import { FournisseurComponent } from './component/fournisseur/fournisseur.component';
import { PaiementComponent } from './component/paiement/paiement.component';
import { AdminDemandesComponent } from './component/demandes/admin-demandes.component';
import { JournalComponent } from './component/journal/journal.component';
import { ApprobationProduitComponent } from './component/approbation-produit/approbation-produit.component';
import { NotificationsComponent } from './component/notifications/notifications.component';
import { SecuriteComponent } from './component/securite/securite.component';
import { ProfilComponent } from './component/profil/profil.component';
import { AnalyseComponent } from './component/analyse/analyse.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'mot-de-passe-oublie', component: AdminMotDePasseOublieComponent },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'fournisseurs', component: FournisseurComponent },
      { path: 'clients', redirectTo: 'utilisateurs', pathMatch: 'full' },
      { path: 'produits', component: ProduitComponent },
      { path: 'categories', component: CategorieComponent },
      { path: 'marques', component: MarqueComponent },
      { path: 'commandes', component: CommandeAdminComponent },
      { path: 'utilisateurs', component: UtilisateurAdminComponent },
      { path: 'paiements', component: PaiementComponent },
      { path: 'livraisons', component: LivraisonComponent },
      { path: 'reclamations', component: ReclamationComponent },
      { path: 'demandes', component: AdminDemandesComponent },
      { path: 'journal', component: JournalComponent },
      { path: 'parametres', component: ParametresComponent },
      { path: 'approbation-produits', component: ApprobationProduitComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'securite', component: SecuriteComponent },
      { path: 'profil', component: ProfilComponent },
      { path: 'analyse', component: AnalyseComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes), LoginComponent],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
