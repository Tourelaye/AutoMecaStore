import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export type FournisseurStatus = 'actif' | 'suspendu' | 'requis_validation';

export interface Fournisseur {
  id: string;
  name: string;
  rep: string;
  siret: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
  status: FournisseurStatus;
  productsRef: number;
  revenue: number;
  rating: number | null;
  reviews: number;
}

export interface FournisseurPayload {
  name: string;
  rep: string;
  siret: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
}

const MOCK_FOURNISSEURS: Fournisseur[] = [
  {
    id: 'sup-1', name: 'MecaPart SAS', rep: 'Jean-Pierre Meca', siret: '81234567800011',
    email: 'contact@mecapart.fr', phone: '01 02 03 04 05', address: '14 Rue du Moteur, Paris',
    bio: 'Distributeur de pièces moteur de qualité premium certifié OEM depuis plus de 10 ans.',
    status: 'actif', productsRef: 3, revenue: 145890, rating: 4.8, reviews: 345
  },
  {
    id: 'sup-2', name: 'DistriAuto France', rep: 'Sylvie Marchand', siret: '49283748200022',
    email: 'contact@distriauto.fr', phone: '01 02 03 04 06', address: '8 Avenue du Freinage, Lyon',
    bio: 'Grossiste spécialisé dans le freinage et la suspension toutes marques.',
    status: 'actif', productsRef: 3, revenue: 92450, rating: 4.6, reviews: 218
  },
  {
    id: 'sup-3', name: 'Direct Pièces Discount', rep: 'Alain Robert', siret: '38291049200033',
    email: 'contact@directpieces.fr', phone: '01 02 03 04 07', address: '22 Rue Électrique, Marseille',
    bio: "Le meilleur des composants électriques et pneumatiques à tarif discount compétitif.",
    status: 'actif', productsRef: 3, revenue: 41200, rating: 4.2, reviews: 154
  },
  {
    id: 'sup-4', name: 'CarHacker Paris', rep: 'Marc Lefevre', siret: '51230492800044',
    email: 'contact@carhacker.fr', phone: '01 02 03 04 08', address: '5 Rue de la Carrosserie, Paris',
    bio: "Spécialiste de la pièce de carrosserie et d'éclairage d'occasion ou reconditionnée.",
    status: 'suspendu', productsRef: 1, revenue: 18450, rating: 3.5, reviews: 64
  },
  {
    id: 'sup-5', name: 'ElectroMeca Europe', rep: 'Dimitri Dupuis', siret: '91283741200055',
    email: 'contact@electromeca.eu', phone: '01 02 03 04 09', address: '3 Rue Alternateur, Lille',
    bio: "Importateur d'alternateurs, capteurs électroniques et câblages automobiles haut de gamme.",
    status: 'requis_validation', productsRef: 1, revenue: 0, rating: null, reviews: 0
  }
];

@Injectable({ providedIn: 'root' })
export class FournisseurService {
  // ---------------------------------------------------------------
  // VERSION "HORS-LIGNE" VOLONTAIRE
  // Tant que /api/admin/fournisseurs/ n'existe pas côté Django (et que
  // l'auth/intercepteur n'est pas fiabilisée — cf. le 401 sur
  // /api/notifications/ vu dans ta console), ce service travaille en
  // mémoire pure. Aucune requête HTTP, donc aucun risque de blocage
  // silencieux du composant à cause du réseau ou d'un intercepteur.
  //
  // Pour brancher le vrai backend plus tard, remplace le corps de
  // chaque méthode par les appels HttpClient commentés en bas de fichier.
  // ---------------------------------------------------------------

  private data: Fournisseur[] = [...MOCK_FOURNISSEURS];

  getAll(): Observable<Fournisseur[]> {
    return of([...this.data]).pipe(delay(150));
  }

  create(payload: FournisseurPayload): Observable<Fournisseur> {
    const created: Fournisseur = {
      id: 'sup-' + Math.floor(Math.random() * 9000 + 1000),
      ...payload,
      status: 'requis_validation',
      productsRef: 0,
      revenue: 0,
      rating: null,
      reviews: 0
    };
    this.data = [created, ...this.data];
    return of(created).pipe(delay(150));
  }

  update(id: string, payload: FournisseurPayload): Observable<FournisseurPayload> {
    this.data = this.data.map(f => (f.id === id ? { ...f, ...payload } : f));
    return of(payload).pipe(delay(150));
  }

  delete(id: string): Observable<void> {
    this.data = this.data.filter(f => f.id !== id);
    return of(void 0).pipe(delay(150));
  }
}

/*
  --------------------------------------------------------------------
  EXEMPLE — à utiliser quand ton backend Django est prêt et que l'auth
  fonctionne (token envoyé correctement sur chaque requête) :

  constructor(private http: HttpClient) {}
  private readonly apiUrl = '/api/admin/fournisseurs/';

  getAll(): Observable<Fournisseur[]> {
    return this.http.get<Fournisseur[]>(this.apiUrl);
  }

  create(payload: FournisseurPayload): Observable<Fournisseur> {
    return this.http.post<Fournisseur>(this.apiUrl, payload);
  }

  update(id: string, payload: FournisseurPayload): Observable<Fournisseur> {
    return this.http.put<Fournisseur>(this.apiUrl + id + '/', payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(this.apiUrl + id + '/');
  }
  --------------------------------------------------------------------
*/