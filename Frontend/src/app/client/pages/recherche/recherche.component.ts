import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { Produit, ProduitService, ProduitListResponse, Offre } from '../../../core/services/produit.service';
import { PanierService } from '../../../core/services/panier.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { VehiculeClientService } from '../../../core/services/vehicule-client.service';
import { VehiculeClient } from '../../../models/vehicule-client.model';

@Component({
  selector: 'app-recherche',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './recherche.component.html',
  styleUrls: ['./recherche.component.css']
})
export class RechercheComponent implements OnInit, OnDestroy {

  // Recherche
  searchQuery = '';
  private searchSubject = new Subject<string>();
  private suggestionSubject = new Subject<string>();
  isLoading = false;
  suggestions: string[] = [];
  showSuggestions = false;

  // Résultats
  produits: Produit[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = 12;
  hasNextPage = false;
  hasPreviousPage = false;

  // Filtres
  prixMin: number | null = null;
  prixMax: number | null = null;
  marqueFilter = '';
  etatFilter = '';
  disponibiliteFilter = '';
  livraisonFilter = false;
  retraitFilter = false;
  noteMin = 0;
  magasinFilter = '';
  noteMagasinMin: number | null = null;

  // Tri
  sortActif = 'pertinence';

  // Localisation client
  clientLat: number | null = null;
  clientLng: number | null = null;
  clientAdresse = '';
  showLocationPanel = false;
  locationLoading = false;
  locationError = '';

  // Recherche par véhicule
  showVehicleSearch = false;
  vehMarque = '';
  vehModele = '';
  vehVersion = '';
  vehMotorisation = '';
  vehAnnee = '';
  vehiculeActif?: VehiculeClient;
  vehicules: VehiculeClient[] = [];

  // Marques disponibles (pour le filtre)
  marquesDisponibles: string[] = [];

  // Panier
  produitAjoute: number | null = null;

  // Comparaison offres
  showCompareModal = false;
  selectedProduit: Produit | null = null;

  // Demande de pièce
  showDemandeForm = false;
  demandeSubmitting = false;
  demandeSuccess = false;
  demandeForm = {
    piece_recherchee: '',
    reference_oem: '',
    quantite: 1,
    marque_vehicule: '',
    modele_vehicule: '',
    annee_vehicule: '',
    motorisation: '',
    version: '',
    description: '',
    ville: '',
    quartier: '',
    nom_contact: '',
    email_contact: '',
    telephone_contact: ''
  };
  photoPiece: File | null = null;
  photoVehicule: File | null = null;
  photoPieceErreur = '';
  photoVehiculeErreur = '';
  villeGeoLoc = '';

  // Filtres mobiles
  showFiltersMobile = false;

  private routeSub: Subscription | null = null;

  readonly etats = [
    { value: '', label: 'Tous les états' },
    { value: 'neuf', label: 'Neuf' },
    { value: 'occasion', label: 'Occasion' },
    { value: 'reconditionne', label: 'Reconditionné' }
  ];

  readonly disponibilites = [
    { value: '', label: 'Toutes disponibilités' },
    { value: 'en_stock', label: 'En stock' },
    { value: 'faible_stock', label: 'Faible stock' },
    { value: 'rupture', label: 'Rupture' }
  ];

  readonly sortOptions = [
    { value: 'pertinence', label: 'Pertinence' },
    { value: 'prix_asc', label: 'Prix croissant' },
    { value: 'prix_desc', label: 'Prix décroissant' },
    { value: 'note', label: 'Meilleure note' },
    { value: 'distance', label: 'Plus proche' },
    { value: 'nouveaute', label: 'Nouveauté' },
    { value: 'ventes', label: 'Meilleures ventes' }
  ];

  constructor(
    private produitService: ProduitService,
    private panierService: PanierService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private vehiculeService: VehiculeClientService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStoredLocation();
    this.loadVehicules();

    this.routeSub = this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.searchQuery = params['search'];
      }
      if (params['veh_marque']) {
        this.vehMarque = params['veh_marque'];
        this.showVehicleSearch = true;
      }
      if (params['veh_modele']) {
        this.vehModele = params['veh_modele'];
      }
      this.loadResults();
    });

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadResults();
    });

    this.suggestionSubject.pipe(
      debounceTime(200),
      distinctUntilChanged()
    ).subscribe(q => {
      if (q.length >= 2) {
        this.produitService.getSuggestions(q).subscribe({
          next: (data) => {
            this.suggestions = data;
            this.showSuggestions = data.length > 0;
          },
          error: () => this.suggestions = []
        });
      } else {
        this.suggestions = [];
        this.showSuggestions = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
    this.suggestionSubject.next(this.searchQuery);
  }

  onSearchFocus(): void {
    this.showSuggestions = this.suggestions.length > 0;
  }

  onSearchBlur(): void {
    setTimeout(() => this.showSuggestions = false, 200);
  }

  loadStoredLocation(): void {
    try {
      const saved = localStorage.getItem('amc_client_location');
      if (saved) {
        const data = JSON.parse(saved);
        this.clientLat = data.lat ?? null;
        this.clientLng = data.lng ?? null;
        this.clientAdresse = data.adresse || '';
      }
    } catch { /* ignore */ }
  }

  sauvegarderLocalisation(): void {
    localStorage.setItem('amc_client_location', JSON.stringify({
      lat: this.clientLat,
      lng: this.clientLng,
      adresse: this.clientAdresse
    }));
  }

  utiliserGPS(): void {
    this.locationLoading = true;
    this.locationError = '';
    if (!navigator.geolocation) {
      this.locationError = 'Géolocalisation non supportée par ce navigateur.';
      this.locationLoading = false;
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.clientLat = pos.coords.latitude;
        this.clientLng = pos.coords.longitude;
        this.clientAdresse = 'Ma position actuelle';
        this.sauvegarderLocalisation();
        this.locationLoading = false;
        this.showLocationPanel = false;
        this.loadResults();
      },
      () => {
        this.locationError = 'Impossible d\'obtenir la position. Vérifiez les autorisations.';
        this.locationLoading = false;
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  appliquerAdresseManuelle(): void {
    this.clientLat = null;
    this.clientLng = null;
    this.sauvegarderLocalisation();
    this.showLocationPanel = false;
    this.loadResults();
  }

  reinitialiserLocalisation(): void {
    this.clientLat = null;
    this.clientLng = null;
    this.clientAdresse = '';
    this.showLocationPanel = false;
    localStorage.removeItem('amc_client_location');
    this.loadResults();
  }

  selectSuggestion(s: string): void {
    this.searchQuery = s;
    this.suggestions = [];
    this.showSuggestions = false;
    this.onSearchSubmit();
  }

  onSearchSubmit(): void {
    this.currentPage = 1;
    this.loadResults();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadResults();
  }

  onSortChange(): void {
    this.loadResults();
  }

  toggleVehicleSearch(): void {
    this.showVehicleSearch = !this.showVehicleSearch;
    if (!this.showVehicleSearch) {
      this.vehMarque = '';
      this.vehModele = '';
      this.vehVersion = '';
      this.vehMotorisation = '';
      this.vehAnnee = '';
      this.onFilterChange();
    } else if (this.vehiculeActif) {
      this.appliquerVehiculeActif(this.vehiculeActif);
    }
  }

  private loadVehicules(): void {
    if (!this.authService.isLoggedIn()) return;
    this.vehiculeService.getVehicules().subscribe({
      next: (data) => {
        this.vehicules = data;
        const actif = this.vehiculeService.getVehiculeActif(data);
        if (actif && !this.vehMarque) {
          this.vehiculeActif = actif;
          this.appliquerVehiculeActif(actif);
          this.loadResults();
        }
      }
    });
  }

  private appliquerVehiculeActif(v: VehiculeClient): void {
    this.vehMarque = v.marque;
    this.vehModele = v.modele;
    this.vehAnnee = v.annee ? String(v.annee) : '';
    this.vehMotorisation = v.motorisation || '';
    this.vehVersion = v.version || '';
    this.prefillDemande(v);
  }

  private prefillDemande(v: VehiculeClient): void {
    this.demandeForm.marque_vehicule = v.marque;
    this.demandeForm.modele_vehicule = v.modele;
    this.demandeForm.annee_vehicule = v.annee ? String(v.annee) : '';
    this.demandeForm.motorisation = v.motorisation || '';
    this.demandeForm.version = v.version || '';
  }

  loadResults(): void {
    this.isLoading = true;
    const params: any = {
      page: this.currentPage,
      page_size: this.pageSize
    };

    if (this.searchQuery.trim()) params.search = this.searchQuery.trim();
    if (this.marqueFilter) params.marque = this.marqueFilter;
    if (this.etatFilter) params.etat = this.etatFilter;
    if (this.disponibiliteFilter) params.disponibilite = this.disponibiliteFilter;
    if (this.livraisonFilter) params.livraison = true;
    if (this.retraitFilter) params.retrait = true;
    if (this.noteMin > 0) params.note_min = this.noteMin;
    if (this.prixMin != null) params.prix_min = this.prixMin;
    if (this.prixMax != null) params.prix_max = this.prixMax;
    if (this.sortActif !== 'pertinence') params.sort = this.sortActif;
    if (this.magasinFilter) params.magasin = this.magasinFilter;
    if (this.noteMagasinMin != null) params.note_magasin_min = this.noteMagasinMin;
    if (this.clientLat != null) params.lat = this.clientLat;
    if (this.clientLng != null) params.lng = this.clientLng;

    if (this.vehMarque) params.veh_marque = this.vehMarque;
    if (this.vehModele) params.veh_modele = this.vehModele;
    if (this.vehVersion) params.veh_version = this.vehVersion;
    if (this.vehMotorisation) params.veh_motorisation = this.vehMotorisation;
    if (this.vehAnnee) params.veh_annee = this.vehAnnee;

    // Mettre à jour l'URL sans recharger
    const urlParams: any = {};
    if (this.searchQuery.trim()) urlParams.search = this.searchQuery.trim();
    if (this.marqueFilter) urlParams.marque = this.marqueFilter;
    if (this.etatFilter) urlParams.etat = this.etatFilter;
    if (this.disponibiliteFilter) urlParams.disponibilite = this.disponibiliteFilter;
    if (this.livraisonFilter) urlParams.livraison = 'true';
    if (this.retraitFilter) urlParams.retrait = 'true';
    if (this.noteMin > 0) urlParams.note_min = this.noteMin;
    if (this.prixMin != null) urlParams.prix_min = this.prixMin;
    if (this.prixMax != null) urlParams.prix_max = this.prixMax;
    if (this.sortActif !== 'pertinence') urlParams.sort = this.sortActif;
    if (this.magasinFilter) urlParams.magasin = this.magasinFilter;
    if (this.noteMagasinMin != null) urlParams.note_magasin_min = this.noteMagasinMin;
    if (this.vehMarque) urlParams.veh_marque = this.vehMarque;
    if (this.vehModele) urlParams.veh_modele = this.vehModele;
    if (this.vehVersion) urlParams.veh_version = this.vehVersion;
    if (this.vehMotorisation) urlParams.veh_motorisation = this.vehMotorisation;
    if (this.vehAnnee) urlParams.veh_annee = this.vehAnnee;
    urlParams.page = this.currentPage;
    this.router.navigate([], { relativeTo: this.route, queryParams: urlParams, queryParamsHandling: 'merge', replaceUrl: true });

    this.produitService.getProduits(params).subscribe({
      next: (data: any) => {
        if (data && data.results) {
          this.produits = data.results;
          this.totalCount = data.count;
          this.hasNextPage = !!data.next;
          this.hasPreviousPage = !!data.previous;
        } else if (Array.isArray(data)) {
          this.produits = data;
          this.totalCount = data.length;
          this.hasNextPage = false;
          this.hasPreviousPage = false;
        }

        // Extraire marques uniques
        const marques = new Set<string>();
        this.produits.forEach(p => {
          if (p.marque) marques.add(p.marque);
        });
        this.marquesDisponibles = Array.from(marques).sort();

        this.isLoading = false;
      },
      error: () => {
        this.produits = [];
        this.totalCount = 0;
        this.isLoading = false;
      }
    });
  }

  nextPage(): void {
    if (this.hasNextPage) {
      this.currentPage++;
      this.loadResults();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    if (this.hasPreviousPage) {
      this.currentPage--;
      this.loadResults();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  resetFilters(): void {
    this.prixMin = null;
    this.prixMax = null;
    this.marqueFilter = '';
    this.etatFilter = '';
    this.disponibiliteFilter = '';
    this.livraisonFilter = false;
    this.retraitFilter = false;
    this.noteMin = 0;
    this.magasinFilter = '';
    this.noteMagasinMin = null;
    this.sortActif = 'pertinence';
    this.vehMarque = '';
    this.vehModele = '';
    this.vehVersion = '';
    this.vehMotorisation = '';
    this.vehAnnee = '';
    this.showVehicleSearch = false;
    this.currentPage = 1;
    this.loadResults();
  }

  getNbFiltresActifs(): number {
    let n = 0;
    if (this.prixMin != null) n++;
    if (this.prixMax != null) n++;
    if (this.marqueFilter) n++;
    if (this.etatFilter) n++;
    if (this.disponibiliteFilter) n++;
    if (this.livraisonFilter) n++;
    if (this.retraitFilter) n++;
    if (this.noteMin > 0) n++;
    if (this.magasinFilter) n++;
    if (this.noteMagasinMin != null) n++;
    if (this.vehMarque || this.vehModele) n++;
    return n;
  }

  goToProduit(id: number): void {
    this.router.navigate(['/produits'], { queryParams: { id } });
  }

  ajouterAuPanier(produit: Produit, event: Event): void {
    event.stopPropagation();
    if (produit.stock === 0) {
      this.notificationService.warning('Ce produit est en rupture de stock', 'Stock indisponible');
      return;
    }

    const prix = produit.prix_promo ? parseFloat(produit.prix_promo as any) : produit.prix;

    this.panierService.ajouterAuPanier({
      produit: {
        id: produit.id,
        nom: produit.nom,
        prix: prix,
        image: produit.image_url || produit.image || undefined,
        description: produit.description,
        stock: produit.stock,
        categorie: 0,
        gestionnaire_stock: 0
      } as any,
      nom: produit.nom,
      prix: prix,
      quantite: 1,
      image: produit.image_url || produit.image || undefined,
      fournisseur_id: produit.fournisseur,
      magasin_id: undefined
    });

    this.produitAjoute = produit.id;
    setTimeout(() => {
      if (this.produitAjoute === produit.id) this.produitAjoute = null;
    }, 1500);
  }

  // Étoiles
  getEtoiles(): number[] { return [1, 2, 3, 4, 5]; }
  isPleine(i: number, note: number): boolean { return i <= Math.floor(note); }
  isDemi(i: number, note: number): boolean { return i === Math.ceil(note) && note % 1 >= 0.5; }

  isStockFaible(p: Produit): boolean { return p.stock > 0 && p.stock <= 5; }

  getPrixActuel(p: Produit): number {
    return p.prix_promo ? parseFloat(p.prix_promo as any) : p.prix;
  }

  getDiscount(p: Produit): number | null {
    if (p.prix_promo && p.prix) {
      return Math.round((1 - parseFloat(p.prix_promo as any) / p.prix) * 100);
    }
    return null;
  }

  // Comparaison offres
  ouvrirCompare(produit: Produit, event: Event): void {
    event.stopPropagation();
    this.selectedProduit = produit;
    this.showCompareModal = true;
  }

  fermerCompare(): void {
    this.showCompareModal = false;
    this.selectedProduit = null;
  }

  voirItineraire(offre: Offre, event: Event): void {
    event.stopPropagation();
    if (!offre.magasin) return;
    const m = offre.magasin;
    const hasCoords = m.latitude != null && m.longitude != null;
    const destLabel = (m.adresse ? m.adresse + ' ' : '') + (m.ville || '') + (m.region ? ' ' + m.region : '');

    let url = '';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (hasCoords) {
      const coords = `${m.latitude},${m.longitude}`;
      if (isMobile) {
        url = `geo:${coords}?q=${coords}`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${coords}`;
      }
    } else if (m.adresse || m.ville) {
      const q = encodeURIComponent(destLabel.trim());
      if (isMobile) {
        url = `geo:0,0?q=${q}`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${q}`;
      }
    }

    if (url) {
      window.open(url, '_blank');
    }
  }

  badgeLabel(badge: string): string {
    const labels: { [k: string]: string } = {
      meilleur_prix: 'Meilleur prix',
      plus_proche: 'Plus proche',
      mieux_note: 'Mieux noté',
      principal: 'Principal',
      partenaire: 'Partenaire'
    };
    return labels[badge] || badge;
  }

  // Demande de pièce
  ouvrirDemandeForm(): void {
    this.showDemandeForm = true;
    this.demandeSuccess = false;
    this.photoPieceErreur = '';
    this.photoVehiculeErreur = '';

    // Pré-remplir avec la recherche actuelle
    this.demandeForm.piece_recherchee = this.searchQuery;
    this.demandeForm.marque_vehicule = this.vehMarque;
    this.demandeForm.modele_vehicule = this.vehModele;
    this.demandeForm.annee_vehicule = this.vehAnnee;
    this.demandeForm.motorisation = this.vehMotorisation;
    this.demandeForm.version = this.vehVersion;

    // Pré-remplir les infos client si connecté
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.demandeForm.nom_contact = `${user.prenom || ''} ${user.nom || ''}`.trim();
        this.demandeForm.email_contact = user.email || '';
        this.demandeForm.telephone_contact = (user as any).telephone || '';
      }
    }

    // Géolocalisation optionnelle
    this.demanderGeoLocalisation();
  }

  fermerDemandeForm(): void {
    this.showDemandeForm = false;
    this.photoPiece = null;
    this.photoVehicule = null;
  }

  private demanderGeoLocalisation(): void {
    if (!navigator.geolocation) { return; }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        (this.demandeForm as any).latitude = position.coords.latitude;
        (this.demandeForm as any).longitude = position.coords.longitude;
      },
      () => { /* silencieux : la géoloc reste optionnelle */ }
    );
  }

  onPhotoPieceSelected(event: any): void {
    this.photoPieceErreur = '';
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        this.photoPieceErreur = 'Veuillez choisir une image.';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.photoPieceErreur = 'L\'image ne doit pas dépasser 5 Mo.';
        return;
      }
      this.photoPiece = file;
    }
  }

  onPhotoVehiculeSelected(event: any): void {
    this.photoVehiculeErreur = '';
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        this.photoVehiculeErreur = 'Veuillez choisir une image.';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.photoVehiculeErreur = 'L\'image ne doit pas dépasser 5 Mo.';
        return;
      }
      this.photoVehicule = file;
    }
  }

  supprimerPhotoPiece(): void { this.photoPiece = null; }
  supprimerPhotoVehicule(): void { this.photoVehicule = null; }

  soumettreDemande(): void {
    if (!this.demandeForm.piece_recherchee.trim()) {
      this.notificationService.warning('Veuillez indiquer la pièce recherchée', 'Champ requis');
      return;
    }

    this.demandeSubmitting = true;
    const formData = new FormData();
    Object.keys(this.demandeForm).forEach(key => {
      const value = (this.demandeForm as any)[key];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, typeof value === 'number' ? String(value) : value);
      }
    });
    if (this.photoPiece) {
      formData.append('photo_piece', this.photoPiece);
    }
    if (this.photoVehicule) {
      formData.append('photo_vehicule', this.photoVehicule);
    }

    this.produitService.createDemandePiece(formData).subscribe({
      next: (res: any) => {
        this.demandeSubmitting = false;
        this.demandeSuccess = true;
        this.notificationService.success(
          `Votre demande ${res.reference || ''} a été enregistrée. Les magasins partenaires seront notifiés.`,
          'Demande envoyée'
        );
        this.demandeForm = {
          piece_recherchee: '', reference_oem: '', quantite: 1,
          marque_vehicule: '', modele_vehicule: '', annee_vehicule: '',
          motorisation: '', version: '', description: '',
          ville: '', quartier: '',
          nom_contact: '', email_contact: '', telephone_contact: ''
        };
        this.photoPiece = null;
        this.photoVehicule = null;
        setTimeout(() => {
          this.showDemandeForm = false;
          this.demandeSuccess = false;
        }, 4000);
      },
      error: (err: any) => {
        this.demandeSubmitting = false;
        const detail = err?.error?.detail || err?.error?.error || 'Erreur lors de l\'envoi de la demande';
        this.notificationService.error(detail, 'Erreur');
      }
    });
  }

  toggleFiltersMobile(): void {
    this.showFiltersMobile = !this.showFiltersMobile;
  }
}
