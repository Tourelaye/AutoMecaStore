import { Component } from '@angular/core';
import { PromotionComponent } from './promotion/promotion.component';
import { CategorieComponent } from './categorie/categorie.component';
import { OffreComponent } from './offre/offre.component';
import { ChooceComponent } from './chooce/chooce.component';
import { PlusVendusComponent } from './plus-vendus/plus-vendus.component';
import { VogueComponent } from './vogue/vogue.component';
import { AvisClientComponent } from './avis-client/avis-client.component';
import { VenteEclairComponent } from './vente-eclair/vente-eclair.component';
import { PartenaireComponent } from './partenaire/partenaire.component';
import { RechercheComponent } from './recherche/recherche.component';
import { FooterComponent } from '../shared/components/footer/footer.component';
import { FaqsComponent } from './faqs/faqs.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PromotionComponent, CategorieComponent, OffreComponent,PlusVendusComponent,VogueComponent,AvisClientComponent, VenteEclairComponent
  , PartenaireComponent, ChooceComponent, RechercheComponent,FaqsComponent,FooterComponent],
  template: `
    <app-promotion></app-promotion>
    <app-categorie></app-categorie>
    <app-offre></app-offre>
    <app-plus-vendus></app-plus-vendus>
    <app-vogue></app-vogue>
    <app-avis-client></app-avis-client>
    <app-vente-eclair></app-vente-eclair>
    <app-partenaire></app-partenaire>  
    <app-chooce></app-chooce>
    <app-recherche></app-recherche>
    <app-faqs></app-faqs>
    <app-footer></app-footer>
  `
})
export class HomeComponent {}

