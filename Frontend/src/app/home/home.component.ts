import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { VehiculeFinderComponent } from './vehicule-finder/vehicule-finder.component';
import { CommentCaMarcheComponent } from './comment-ca-marche/comment-ca-marche.component';
import { ScrollRevealDirective } from '../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    SlideComponent,
    VehiculeFinderComponent,
    ServicesBarComponent,
    PromoBannerComponent,
    CategorieComponent,
    OffreComponent,
    PromotionComponent,
    VenteEclairComponent,
    PlusVendusComponent,
    VogueComponent,
    NouveauteComponent,
    VedetteComponent,
    RecommandeComponent,
    CommentCaMarcheComponent,
    ChooceComponent,
    AvisClientComponent,
    PartenaireComponent,
    RechercheComponent,
    NewsletterComponent,
    FaqsComponent,
    ScrollRevealDirective
  ],
  template: `
    <!-- Accroche -->
    <app-slide></app-slide>
    <app-vehicule-finder appScrollReveal></app-vehicule-finder>
    <app-services-bar appScrollReveal></app-services-bar>

    <!-- Catalogues & catégories -->
    <app-promo-banner appScrollReveal></app-promo-banner>
    <app-categorie appScrollReveal></app-categorie>

    <!-- Offres (masquées automatiquement si aucune donnée) -->
    <app-offre appScrollReveal></app-offre>
    <app-promotion appScrollReveal></app-promotion>
    <app-vente-eclair appScrollReveal></app-vente-eclair>

    <!-- Produits -->
    <app-plus-vendus appScrollReveal></app-plus-vendus>
    <app-vogue appScrollReveal></app-vogue>
    <app-nouveaute appScrollReveal></app-nouveaute>
    <app-vedette appScrollReveal></app-vedette>
    <app-recommande appScrollReveal></app-recommande>

    <!-- Confiance -->
    <app-comment-ca-marche appScrollReveal></app-comment-ca-marche>
    <app-chooce appScrollReveal></app-chooce>
    <app-avis-client appScrollReveal></app-avis-client>
    <app-partenaire appScrollReveal></app-partenaire>

    <!-- Engagement -->
    <app-recherche appScrollReveal></app-recherche>
    <app-newsletter appScrollReveal></app-newsletter>
    <app-faqs appScrollReveal></app-faqs>

    <button
      type="button"
      class="back-to-top"
      [class.visible]="showBackToTop"
      (click)="scrollToTop()"
      aria-label="Revenir en haut de la page"
    >
      <i class="bi bi-arrow-up"></i>
    </button>
  `,
  styles: [`
    .back-to-top {
      position: fixed;
      right: 22px;
      bottom: 26px;
      z-index: 900;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #fa5807, #f97316);
      color: #fff;
      font-size: 20px;
      display: grid;
      place-items: center;
      cursor: pointer;
      box-shadow: 0 14px 30px rgba(250, 88, 7, .38);
      opacity: 0;
      visibility: hidden;
      transform: translateY(14px);
      transition: opacity .25s ease, transform .25s ease, visibility .25s;
    }
    .back-to-top.visible { opacity: 1; visibility: visible; transform: translateY(0); }
    .back-to-top:hover { transform: translateY(-3px); }
    @media (max-width: 576px) {
      .back-to-top { right: 14px; bottom: 16px; width: 42px; height: 42px; }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {

  showBackToTop = false;

  // Le défilement se fait sur <body> (overflow: auto) et non sur window :
  // on écoute donc le scroll en phase de capture au niveau du document.
  private readonly onScroll = () => {
    const visible = this.scrollPosition() > 700;
    if (visible !== this.showBackToTop) {
      this.showBackToTop = visible;
      this.cdr.markForCheck();
    }
  };

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    document.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.onScroll, { capture: true });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private scrollPosition(): number {
    return Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop);
  }
}
