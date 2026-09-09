"""
Fusion générique de produits AutoMecaStore.

Permet de fusionner N produits sources vers un produit cible.
Toutes les relations (FournisseurProduit, LigneCommande, PanierItem,
ProduitFavoris, Stock, MouvementStock, Promotion, Reclamation, Avis)
sont migrées vers le produit cible.

Les stocks ne sont PAS additionnés — chaque FournisseurProduit conserve son stock.
Les conditions fournisseur (garantie, retour, etc.) ne sont PAS fusionnées.
Le SKU (Produit.reference) n'est PAS fusionné.

Le produit cible peut être enrichi avec un OEM si celui-ci est vide.
"""

from typing import List, Dict, Any, Optional
from django.db import transaction
from django.utils import timezone


@transaction.atomic
def fusionner_produits(
    source_ids: List[int],
    target_id: int,
    enrichir_oem: bool = True,
    oem_source_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Fusionne N produits sources vers un produit cible.

    Args:
        source_ids: liste des IDs des produits à fusionner (soft-delete après)
        target_id: ID du produit cible
        enrichir_oem: si True, enrichit le produit cible avec un OEM si vide
        oem_source_id: ID du produit source dont l'OEM doit être utilisé
                      (si None, prend le premier source avec un OEM)

    Returns:
        dict avec le détail de la fusion:
        {
            'target_id': int,
            'source_ids': List[int],
            'migrated': {
                'fournisseur_produits': int,
                'ligne_commandes': int,
                'panier_items': int,
                'produit_favoris': int,
                'stocks': int,
                'mouvement_stocks': int,
                'promotions': int,
                'reclamations': int,
                'avis': int,
            },
            'enriched_oem': bool,
            'errors': List[str],
        }

    IMPORTANT:
        - Les stocks ne sont PAS additionnés.
        - Les SKU ne sont PAS fusionnés.
        - Les conditions fournisseur ne sont PAS fusionnées.
        - Les produits sources sont soft-deleted après migration.
        - Tout est dans une transaction atomique (rollback si erreur).
    """
    from catalog.models import (
        Produit, FournisseurProduit, ProduitFavoris,
        Stock, MouvementStock, Promotion,
    )
    from orders.models import LigneCommande, PanierItem
    from support.models import Reclamation, Avis

    now = timezone.now()
    result = {
        'target_id': target_id,
        'source_ids': list(source_ids),
        'migrated': {
            'fournisseur_produits': 0,
            'ligne_commandes': 0,
            'panier_items': 0,
            'produit_favoris': 0,
            'stocks': 0,
            'mouvement_stocks': 0,
            'promotions': 0,
            'reclamations': 0,
            'avis': 0,
        },
        'enriched_oem': False,
        'errors': [],
    }

    # Vérifier que le target existe
    try:
        target = Produit.all_objects.get(pk=target_id)
    except Produit.DoesNotExist:
        result['errors'].append(f"Produit cible #{target_id} introuvable")
        raise ValueError(f"Produit cible #{target_id} introuvable")

    # Vérifier que les sources existent et ne incluent pas le target
    sources = []
    for sid in source_ids:
        if sid == target_id:
            result['errors'].append(f"Source #{sid} est identique au target — ignoré")
            continue
        try:
            p = Produit.all_objects.get(pk=sid)
            sources.append(p)
        except Produit.DoesNotExist:
            result['errors'].append(f"Source #{sid} introuvable — ignoré")

    if not sources:
        raise ValueError("Aucun produit source valide")

    # ── ÉTAPE 1: Enrichir OEM si demandé ──
    if enrichir_oem and not target.reference_oem:
        oem_value = None
        if oem_source_id:
            oem_source = Produit.all_objects.filter(pk=oem_source_id).first()
            if oem_source and oem_source.reference_oem:
                oem_value = oem_source.reference_oem
        else:
            for s in sources:
                if s.reference_oem:
                    oem_value = s.reference_oem
                    break

        if oem_value:
            target.reference_oem = oem_value
            target.save(update_fields=['reference_oem'])
            result['enriched_oem'] = True

    # ── ÉTAPE 2: Migrer FournisseurProduit ──
    for s in sources:
        fps = FournisseurProduit.objects.filter(produit_id=s.id)
        for fp in fps:
            # Vérifier conflit unique_together (produit, fournisseur)
            existing = FournisseurProduit.objects.filter(
                produit_id=target_id, fournisseur_id=fp.fournisseur_id
            ).first()
            if existing:
                # Conflit: ne pas écraser, garder l'existant
                # Le FP source reste orphelin mais ne sera pas perdu (le produit est soft-deleted)
                result['errors'].append(
                    f"Conflit FP#{fp.id} (fournisseur={fp.fournisseur_id}) "
                    f"existe déjà sur P#{target_id} — offre conservée sur source"
                )
                continue
            fp.produit_id = target_id
            fp.save(update_fields=['produit_id'])
            result['migrated']['fournisseur_produits'] += 1

    # ── ÉTAPE 3: Migrer LigneCommande ──
    for s in sources:
        count = LigneCommande.objects.filter(produit_id=s.id).update(produit_id=target_id)
        result['migrated']['ligne_commandes'] += count

    # ── ÉTAPE 4: Migrer PanierItem ──
    for s in sources:
        count = PanierItem.objects.filter(produit_id=s.id).update(produit_id=target_id)
        result['migrated']['panier_items'] += count

    # ── ÉTAPE 5: Migrer ProduitFavoris (gérer conflits unique_together) ──
    for s in sources:
        favs = ProduitFavoris.objects.filter(produit_id=s.id)
        for fav in favs:
            existing = ProduitFavoris.objects.filter(
                produit_id=target_id, client_id=fav.client_id
            ).first()
            if existing:
                # Le client a déjà le target en favori — supprimer le doublon
                fav.delete()
            else:
                fav.produit_id = target_id
                fav.save(update_fields=['produit_id'])
                result['migrated']['produit_favoris'] += 1

    # ── ÉTAPE 6: Migrer Stock ──
    for s in sources:
        count = Stock.objects.filter(produit_id=s.id).update(produit_id=target_id)
        result['migrated']['stocks'] += count

    # ── ÉTAPE 7: Migrer MouvementStock ──
    for s in sources:
        count = MouvementStock.objects.filter(produit_id=s.id).update(produit_id=target_id)
        result['migrated']['mouvement_stocks'] += count

    # ── ÉTAPE 8: Migrer Promotion ──
    for s in sources:
        count = Promotion.objects.filter(produit_id=s.id).update(produit_id=target_id)
        result['migrated']['promotions'] += count

    # ── ÉTAPE 9: Migrer Reclamation ──
    for s in sources:
        count = Reclamation.objects.filter(produit_id=s.id).update(produit_id=target_id)
        result['migrated']['reclamations'] += count

    # ── ÉTAPE 10: Migrer Avis ──
    for s in sources:
        count = Avis.objects.filter(produit_id=s.id).update(produit_id=target_id)
        result['migrated']['avis'] += count

    # ── ÉTAPE 11: Soft-delete les sources ──
    for s in sources:
        s.is_active = False
        s.statut = 'inactif'
        s.date_suppression = now
        s.save(update_fields=['is_active', 'statut', 'date_suppression'])

    return result
