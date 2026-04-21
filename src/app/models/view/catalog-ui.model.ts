export class UiCatalogProduct {
  constructor(
    public id: number,
    public nom: string,
    public marque: string,
    public description: string,
    public image: string | null,
    public prixNouveau: number,
    public prixAncien: number | null,
    public discount: number | null,
    public note: number,
    public avis: number,
    public stock: number,
    public livraison: boolean,
    public isFavori: boolean,
    public isNew: boolean,
    public categorie: string
  ) {}
}

export class UiOffreProduct {
  constructor(
    public id: number,
    public nom: string,
    public marque: string,
    public image: string | null,
    public prixNouveau: number,
    public prixAncien: number | null,
    public discount: number | null,
    public note: number,
    public avis: number,
    public livraison: boolean,
    public stock: number,
    public badge: { label: string; type: 'orange' | 'green' | 'blue' } | null
  ) {}
}

export class UiPromoProduct {
  constructor(
    public id: number,
    public nom: string,
    public image: string | null,
    public prixAncien: number,
    public prixNouveau: number,
    public discount: number,
    public stock: number,
    public stockRestant: number,
    public expirationDate: Date,
    public categorie: string
  ) {}
}

