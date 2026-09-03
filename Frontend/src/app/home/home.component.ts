import { Component } from '@angular/core';
import { PromotionComponent } from './promotion/promotion.component';
import { CategorieComponent } from './categorie/categorie.component';
import { OffreComponent } from './offre/offre.component';
import { ChooceComponent } from './chooce/chooce.component';
import { PlusVendusComponent } from './plus-vendus/plus-vendus.component';
import { VogueComponent } from './vogue/vogue.component';
import { AvisClientComponent } from './avis-client/avis-client.component';
import { VenteEclairComponent } from './vente-eclair/vente-eclair.component';
import { VedetteComponent } from './vedette/vedette.component';
import { RecommandeComponent } from './recommande/recommande.component';
import { NouveauteComponent } from './nouveaute/nouveaute.component';
import { PartenaireComponent } from './partenaire/partenaire.component';
import { RechercheComponent } from './recherche/recherche.component';
import { FaqsComponent } from './faqs/faqs.component';
import { SlideComponent } from './slide/slide.component';
import { ServicesBarComponent } from './services-bar/services-bar.component';
import { PromoBannerComponent } from './promo-banner/promo-banner.component';
import { NewsletterComponent } from './newsletter/newsletter.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    SlideComponent,
    ServicesBarComponent,
    CategorieComponent,
    PromoBannerComponent,
    OffreComponent,
    PromotionComponent,
    PlusVendusComponent,
    VogueComponent,
    VedetteComponent,
    RecommandeComponent,
    NouveauteComponent,
    VenteEclairComponent,
    AvisClientComponent,
    PartenaireComponent,
    ChooceComponent,
    NewsletterComponent,
    RechercheComponent,
    FaqsComponent
  ],
  template: `
    <app-slide></app-slide>
    <app-services-bar></app-services-bar>
    <app-categorie></app-categorie>
    <app-promo-banner></app-promo-banner>
    <app-offre></app-offre>
    <app-promotion></app-promotion>
    <app-plus-vendus></app-plus-vendus>
    <app-vogue></app-vogue>
    <app-recommande></app-recommande>
    <app-vedette></app-vedette>
    <app-nouveaute></app-nouveaute>
    <app-vente-eclair></app-vente-eclair>
    <app-avis-client></app-avis-client>
    <app-partenaire></app-partenaire>
    <app-chooce></app-chooce>
    <app-newsletter></app-newsletter>
    <app-recherche></app-recherche>
    <app-faqs></app-faqs>
  `
})
export class HomeComponent {}

