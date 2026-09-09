"""
Logique de déduplication des produits AutoMecaStore.

Un PRODUIT est une pièce physique identifiable dans le catalogue global.
Une OFFRE (FournisseurProduit) est la proposition commerciale d'un fournisseur.

Ce module fournit :
- normalize_product_text() : normalisation des chaînes pour comparaison
- normalize_oem()          : normalisation des références OEM
- compute_match_score()    : score de correspondance entre deux produits
- find_matching_product()  : recherche d'un produit existant par score
- detect_all_duplicates()  : scan complet du catalogue pour doublons potentiels

IMPORTANT : Produit.reference est un SKU interne fournisseur.
Il n'est JAMAIS utilisé comme identité globale du produit.
"""

import unicodedata
import re
from decimal import Decimal
from typing import Optional, Dict, Any, List, Tuple, Set

from django.db import models
from django.db.models import Q


# ──────────────────────────────────────────────
# Normalisation
# ──────────────────────────────────────────────

def normalize_product_text(text: str) -> str:
    """
    Normalise une chaîne pour comparaison de produits.

    - minuscules
    - suppression des accents
    - suppression des espaces multiples
    - suppression des tirets inutiles
    - trim
    """
    if not text:
        return ''
    text = text.lower().strip()
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r'[^a-z0-9]+', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def normalize_oem(text: str) -> str:
    """
    Normalise une référence OEM pour comparaison.

    Gère les variantes d'écriture :
      04465-0K340  →  044650k340
      04465 0K340  →  044650k340
      04465/0K340  →  044650k340
      OEM-04465-0K340 → 044650k340  (préfixe OEM supprimé)

    Retourne une chaîne alphanumérique sans séparateurs.
    """
    if not text:
        return ''
    text = text.strip().lower()
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    # Supprimer le préfixe "oem" courant
    text = re.sub(r'^oem[\s\-_/]*', '', text)
    # Garder uniquement alphanumérique
    text = re.sub(r'[^a-z0-9]', '', text)
    return text


def normalize_marque(text: str) -> str:
    """Normalise un nom de marque (casse, accents, espaces)."""
    return normalize_product_text(text)


# ──────────────────────────────────────────────
# Score de matching
# ──────────────────────────────────────────────

# Seuils
SCORE_CONFIRMED = 90
SCORE_POSSIBLE = 70

# Poids des critères
W_OEM = 40
W_NOM = 25
W_MARQUE = 15
W_TYPE = 10
W_COMPAT = 10
W_FABRICANT = 5
W_DIMENSIONS = 5
W_POIDS = 3
W_MATIERE = 3
W_COULEUR = 2
W_ETAT = 2
W_ANNEES = 3

# Classifications
MATCH_CONFIRMED = 'MATCH_CONFIRMED'
MATCH_POSSIBLE = 'MATCH_POSSIBLE'
NO_MATCH = 'NO_MATCH'

# OEM: pénalité quand différent mais forte concordance hors OEM
OEM_DIFF_PENALTY = 15
OEM_DIFF_THRESHOLD = 70  # score_hors_oem >= ce seuil → OEM diff = warning, pas blocage


def _safe_decimal_eq(a, b, tolerance=Decimal('0.5')) -> bool:
    """Compare deux Decimal avec tolérance."""
    if a is None or b is None:
        return False
    try:
        return abs(Decimal(a) - Decimal(b)) <= tolerance
    except Exception:
        return False


def compute_match_score(
    p1_nom: str = '',
    p1_marque: str = '',
    p1_reference_oem: str = '',
    p1_fabricant: str = '',
    p1_type_piece_id: Optional[int] = None,
    p1_modeles_compatibles: Optional[List[str]] = None,
    p1_annee_debut: Optional[int] = None,
    p1_annee_fin: Optional[int] = None,
    p1_poids: Any = None,
    p1_longueur: Any = None,
    p1_largeur: Any = None,
    p1_hauteur: Any = None,
    p1_matiere: str = '',
    p1_couleur: str = '',
    p1_etat: str = '',
    # p2
    p2_nom: str = '',
    p2_marque: str = '',
    p2_reference_oem: str = '',
    p2_fabricant: str = '',
    p2_type_piece_id: Optional[int] = None,
    p2_modeles_compatibles: Optional[List[str]] = None,
    p2_annee_debut: Optional[int] = None,
    p2_annee_fin: Optional[int] = None,
    p2_poids: Any = None,
    p2_longueur: Any = None,
    p2_largeur: Any = None,
    p2_hauteur: Any = None,
    p2_matiere: str = '',
    p2_couleur: str = '',
    p2_etat: str = '',
) -> Dict[str, Any]:
    """
    Calcule un score de correspondance entre deux produits.

    Retourne un dict :
    {
        'score': int,               # score final (après pénalités)
        'score_hors_oem': int,      # score sans le critère OEM
        'score_oem': int,           # contribution OEM (0 ou W_OEM)
        'reasons_match': List[str],
        'reasons_block': List[str], # blocages critiques absolus
        'warnings': List[str],      # signaux d'alerte non bloquants
        'classification': str,      # 'MATCH_CONFIRMED' | 'MATCH_POSSIBLE' | 'NO_MATCH'
    }

    Classification :
    - MATCH_CONFIRMED : score >= 90, aucune contradiction critique
    - MATCH_POSSIBLE  : score >= 50 sans blocage, ou score_hors_oem >= 80
                        avec OEM différent mais marque+type+compat concordants
    - NO_MATCH        : score < 50 ou blocage critique absolu
    """
    score_hors_oem = 0
    score_oem = 0
    reasons_match = []
    reasons_block = []
    warnings = []

    marque_identique = False
    type_identique = False
    compat_forte = False

    # ── OEM ──
    oem1 = normalize_oem(p1_reference_oem)
    oem2 = normalize_oem(p2_reference_oem)
    oem_different = False
    if oem1 and oem2:
        if oem1 == oem2:
            score_oem = W_OEM
            reasons_match.append('OEM identique')
        else:
            oem_different = True

    # ── Marque ──
    mar1 = normalize_marque(p1_marque)
    mar2 = normalize_marque(p2_marque)
    if mar1 and mar2:
        if mar1 == mar2:
            score_hors_oem += W_MARQUE
            reasons_match.append('marque identique')
            marque_identique = True
        else:
            reasons_block.append('marque différente')

    # ── Type de pièce ──
    if p1_type_piece_id and p2_type_piece_id:
        if p1_type_piece_id == p2_type_piece_id:
            score_hors_oem += W_TYPE
            reasons_match.append('type de pièce identique')
            type_identique = True
        else:
            reasons_block.append('type de pièce différent')

    # ── Nom normalisé ──
    nom1 = normalize_product_text(p1_nom)
    nom2 = normalize_product_text(p2_nom)
    if nom1 and nom2:
        if nom1 == nom2:
            score_hors_oem += W_NOM
            reasons_match.append('nom normalisé identique')
        elif _text_similarity(nom1, nom2) >= 0.85:
            score_hors_oem += int(W_NOM * 0.7)
            reasons_match.append('nom très similaire')

    # ── Fabricant ──
    fab1 = normalize_product_text(p1_fabricant)
    fab2 = normalize_product_text(p2_fabricant)
    if fab1 and fab2:
        if fab1 == fab2:
            score_hors_oem += W_FABRICANT
            reasons_match.append('fabricant identique')
        elif _text_similarity(fab1, fab2) >= 0.80:
            score_hors_oem += int(W_FABRICANT * 0.5)
            reasons_match.append('fabricant similaire')

    # ── Compatibilité véhicule ──
    mod1 = set(normalize_product_text(m) for m in (p1_modeles_compatibles or []) if m)
    mod2 = set(normalize_product_text(m) for m in (p2_modeles_compatibles or []) if m)
    if mod1 and mod2:
        common = mod1 & mod2
        if common:
            overlap = len(common) / min(len(mod1), len(mod2))
            score_hors_oem += int(W_COMPAT * overlap)
            reasons_match.append(f'compatibilité véhicule commune ({len(common)} modèle(s))')
            if overlap >= 0.5:
                compat_forte = True
        else:
            if len(mod1) >= 2 and len(mod2) >= 2:
                reasons_block.append('aucune compatibilité véhicule commune')

    # ── Années de compatibilité ──
    if p1_annee_debut and p2_annee_debut and p1_annee_fin and p2_annee_fin:
        if p1_annee_debut == p2_annee_debut and p1_annee_fin == p2_annee_fin:
            score_hors_oem += W_ANNEES
            reasons_match.append('années de compatibilité identiques')
        elif p1_annee_debut <= p2_annee_fin and p2_annee_debut <= p1_annee_fin:
            score_hors_oem += int(W_ANNEES * 0.5)
            reasons_match.append('années de compatibilité chevauchantes')

    # ── Dimensions ──
    dim_match = 0
    dim_total = 0
    for d1, d2 in [(p1_longueur, p2_longueur), (p1_largeur, p2_largeur), (p1_hauteur, p2_hauteur)]:
        if d1 is not None and d2 is not None:
            dim_total += 1
            if _safe_decimal_eq(d1, d2, tolerance=Decimal('1.0')):
                dim_match += 1
    if dim_total > 0:
        ratio = dim_match / dim_total
        score_hors_oem += int(W_DIMENSIONS * ratio)
        if dim_match == dim_total:
            reasons_match.append('dimensions identiques')

    # ── Poids ──
    if p1_poids is not None and p2_poids is not None:
        if _safe_decimal_eq(p1_poids, p2_poids, tolerance=Decimal('0.5')):
            score_hors_oem += W_POIDS
            reasons_match.append('poids identique')

    # ── Matière ──
    mat1 = normalize_product_text(p1_matiere)
    mat2 = normalize_product_text(p2_matiere)
    if mat1 and mat2:
        if mat1 == mat2:
            score_hors_oem += W_MATIERE
            reasons_match.append('matière identique')

    # ── Couleur ──
    col1 = normalize_product_text(p1_couleur)
    col2 = normalize_product_text(p2_couleur)
    if col1 and col2:
        if col1 == col2:
            score_hors_oem += W_COULEUR
            reasons_match.append('couleur identique')

    # ── État ──
    if p1_etat and p2_etat:
        if p1_etat == p2_etat:
            score_hors_oem += W_ETAT
            reasons_match.append('état identique')

    # ── Calcul du score final ──
    score = score_hors_oem + score_oem

    # Blocages critiques absolus (marque, type, compatibilité)
    critical_blocks = [b for b in reasons_block if b in (
        'type de pièce différent',
        'marque différente',
        'aucune compatibilité véhicule commune',
    )]

    if critical_blocks:
        score = min(score, 25)
        classification = NO_MATCH
    elif oem_different:
        # OEM différent — analyse graduée
        if score_hors_oem >= OEM_DIFF_THRESHOLD:
            # Forte concordance hors OEM → signal d'alerte, pas un blocage
            warnings.append('OEM différent malgré une forte concordance des caractéristiques')
            score = score_hors_oem - OEM_DIFF_PENALTY
            # Classification spéciale : score_hors_oem très élevé + caractéristiques
            # critiques concordantes → MATCH_POSSIBLE même si score final < 70
            if score_hors_oem >= 80 and marque_identique and type_identique and compat_forte:
                classification = MATCH_POSSIBLE
            elif score >= SCORE_POSSIBLE:
                classification = MATCH_POSSIBLE
            else:
                classification = NO_MATCH
        else:
            # Faible concordance + OEM différent → conflit fort
            reasons_block.append('OEM différent')
            score = min(score, 25)
            classification = NO_MATCH
    else:
        # OEM identique ou absent
        if score >= SCORE_CONFIRMED:
            classification = MATCH_CONFIRMED
        elif score >= SCORE_POSSIBLE:
            classification = MATCH_POSSIBLE
        else:
            classification = NO_MATCH

    score = max(0, min(score, 100))

    return {
        'score': score,
        'score_hors_oem': score_hors_oem,
        'score_oem': score_oem,
        'reasons_match': reasons_match,
        'reasons_block': reasons_block,
        'warnings': warnings,
        'classification': classification,
    }


def _text_similarity(s1: str, s2: str) -> float:
    """
    Similarité de Jaccard sur les mots.
    Retourne un float entre 0 et 1.
    """
    if not s1 or not s2:
        return 0.0
    w1 = set(s1.split())
    w2 = set(s2.split())
    if not w1 or not w2:
        return 0.0
    return len(w1 & w2) / len(w1 | w2)


# ──────────────────────────────────────────────
# Recherche de produit correspondant
# ──────────────────────────────────────────────

def find_matching_product(
    nom: str = '',
    marque: str = '',
    reference_oem: str = '',
    fabricant: str = '',
    reference: str = '',
    type_piece_id: Optional[int] = None,
    modeles_compatibles: Optional[List[str]] = None,
    annee_debut: Optional[int] = None,
    annee_fin: Optional[int] = None,
    poids: Any = None,
    longueur: Any = None,
    largeur: Any = None,
    hauteur: Any = None,
    matiere: str = '',
    couleur: str = '',
    etat: str = '',
    exclude_ids: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """
    Recherche un produit existant dans le catalogue par score de correspondance.

    Inclut les produits actifs ET inactifs (soft-deleted).

    Retourne un dict :
    {
        'found': bool,
        'confidence': 'high' | 'medium' | 'low' | None,
        'ambiguous': bool,
        'product': Produit | None,
        'results': List[dict],   # liste de {product, score, reasons}
        'message': str,
    }

    Niveaux de confiance :
    - score >= 80 → 'high'   (MATCH_CONFIRMED)
    - score >= 50 → 'medium' (MATCH_POSSIBLE)
    - score < 50  → None     (NO_MATCH)

    NOTE: Produit.reference (SKU interne) n'est PAS utilisé.
    """
    from catalog.models import Produit

    base_qs = Produit.all_objects.all()

    if exclude_ids:
        base_qs = base_qs.exclude(id__in=exclude_ids)

    # Pré-filtrage DB pour limiter le scan
    # On filtre sur marque ou type_piece ou OEM si disponibles
    oem_norm = normalize_oem(reference_oem)
    mar_norm = normalize_marque(marque)
    nom_norm = normalize_product_text(nom)

    candidates_qs = base_qs
    has_filter = False

    if oem_norm:
        # Chercher par OEM normalisé — on doit scanner en Python car la DB
        # ne peut pas normaliser les OEM (tirets, espaces, etc.)
        oem_candidates = list(base_qs.exclude(reference_oem='').exclude(reference_oem__isnull=True))
        oem_matches = [p for p in oem_candidates if normalize_oem(p.reference_oem) == oem_norm]
        # Toujours inclure les candidats par marque (l'OEM peut être différent)
        mar_candidates = list(base_qs.filter(marque__iexact=marque)) if mar_norm else []
        if oem_matches or mar_candidates:
            candidate_set = {p.id: p for p in oem_matches + mar_candidates}
            candidates_qs = base_qs.filter(id__in=list(candidate_set.keys()))
            has_filter = True

    if not has_filter and mar_norm:
        candidates_qs = candidates_qs.filter(marque__iexact=marque)
        has_filter = True

    if not has_filter and type_piece_id:
        candidates_qs = candidates_qs.filter(type_piece_id=type_piece_id)
        has_filter = True

    if not has_filter and nom_norm:
        # Dernier recours : scanner tous les produits (limité par nom similaire)
        # On ne peut pas normaliser en DB, donc on prend tous et on filtre en Python
        pass

    candidates = list(candidates_qs)

    # Scorer tous les candidats
    scored_list = []
    for p in candidates:
        result = compute_match_score(
            p1_nom=nom, p1_marque=marque, p1_reference_oem=reference_oem,
            p1_fabricant=fabricant, p1_type_piece_id=type_piece_id,
            p1_modeles_compatibles=modeles_compatibles,
            p1_annee_debut=annee_debut, p1_annee_fin=annee_fin,
            p1_poids=poids, p1_longueur=longueur, p1_largeur=largeur, p1_hauteur=hauteur,
            p1_matiere=matiere, p1_couleur=couleur, p1_etat=etat,
            # p2 = produit existant
            p2_nom=p.nom, p2_marque=p.marque, p2_reference_oem=p.reference_oem,
            p2_fabricant=p.fabricant, p2_type_piece_id=p.type_piece_id,
            p2_modeles_compatibles=p.modeles_compatibles,
            p2_annee_debut=p.annee_debut, p2_annee_fin=p.annee_fin,
            p2_poids=p.poids, p2_longueur=p.longueur, p2_largeur=p.largeur, p2_hauteur=p.hauteur,
            p2_matiere=p.matiere, p2_couleur=p.couleur, p2_etat=p.etat,
        )
        if result['classification'] in (MATCH_CONFIRMED, MATCH_POSSIBLE):
            scored_list.append({
                'product': p,
                'score': result['score'],
                'score_hors_oem': result['score_hors_oem'],
                'reasons_match': result['reasons_match'],
                'reasons_block': result['reasons_block'],
                'warnings': result['warnings'],
                'classification': result['classification'],
            })

    # Trier par score décroissant
    scored_list.sort(key=lambda x: x['score'], reverse=True)

    if not scored_list:
        return {
            'found': False,
            'confidence': None,
            'ambiguous': False,
            'product': None,
            'results': [],
            'message': 'Aucun produit correspondant trouvé.',
        }

    best = scored_list[0]

    if best['classification'] == MATCH_CONFIRMED:
        if len(scored_list) == 1 or scored_list[1]['classification'] != MATCH_CONFIRMED:
            return {
                'found': True,
                'confidence': 'high',
                'ambiguous': False,
                'product': best['product'],
                'results': scored_list,
                'message': 'Produit identifié avec haute confiance.',
            }
        else:
            high_conf = [s for s in scored_list if s['classification'] == MATCH_CONFIRMED]
            return {
                'found': True,
                'confidence': 'high',
                'ambiguous': True,
                'product': None,
                'results': high_conf,
                'message': 'Plusieurs produits avec haute confiance. Vérifiez avant de continuer.',
            }

    if best['classification'] == MATCH_POSSIBLE:
        return {
            'found': True,
            'confidence': 'medium',
            'ambiguous': len(scored_list) > 1,
            'product': best['product'] if len(scored_list) == 1 else None,
            'results': scored_list,
            'message': 'Correspondance possible. Confirmation recommandée.',
        }

    return {
        'found': False,
        'confidence': None,
        'ambiguous': False,
        'product': None,
        'results': scored_list,
        'message': 'Aucun produit correspondant trouvé.',
    }


# ──────────────────────────────────────────────
# Détection de doublons sur tout le catalogue
# ──────────────────────────────────────────────

def detect_all_duplicates(min_score: int = SCORE_POSSIBLE, active_only: bool = False) -> List[Dict[str, Any]]:
    """
    Scanne tout le catalogue et détecte les paires de produits potentiellement dupliqués.

    Retourne une liste de dicts :
    {
        'product_a': Produit,
        'product_a_id': int,
        'product_b': Produit,
        'product_b_id': int,
        'score': int,
        'score_hors_oem': int,
        'confidence': 'high' | 'medium',
        'classification': str,
        'reasons_match': List[str],
        'reasons_block': List[str],
        'warnings': List[str],
    }

    Seules les paires avec classification != NO_MATCH et score >= min_score sont retournées.
    Chaque paire n'apparaît qu'une fois (a < b par ID).
    """
    from catalog.models import Produit

    if active_only:
        all_products = list(Produit.objects.all())
    else:
        all_products = list(Produit.all_objects.all())
    duplicates = []
    seen_pairs = set()

    for i, p1 in enumerate(all_products):
        for j in range(i + 1, len(all_products)):
            p2 = all_products[j]

            # Pré-filtre rapide pour performance
            mar1 = normalize_marque(p1.marque or '')
            mar2 = normalize_marque(p2.marque or '')
            nom1 = normalize_product_text(p1.nom or '')
            nom2 = normalize_product_text(p2.nom or '')

            # Skip si marque différente (sauf si nom identique — peut être une erreur de saisie)
            if mar1 and mar2 and mar1 != mar2 and not (nom1 and nom2 and nom1 == nom2):
                continue
            # Skip si type différent
            if p1.type_piece_id and p2.type_piece_id and p1.type_piece_id != p2.type_piece_id:
                continue
            # Skip si nom totalement différent (aucun mot commun)
            if nom1 and nom2 and not (set(nom1.split()) & set(nom2.split())):
                continue

            result = compute_match_score(
                p1_nom=p1.nom, p1_marque=p1.marque, p1_reference_oem=p1.reference_oem,
                p1_fabricant=p1.fabricant, p1_type_piece_id=p1.type_piece_id,
                p1_modeles_compatibles=p1.modeles_compatibles,
                p1_annee_debut=p1.annee_debut, p1_annee_fin=p1.annee_fin,
                p1_poids=p1.poids, p1_longueur=p1.longueur, p1_largeur=p1.largeur, p1_hauteur=p1.hauteur,
                p1_matiere=p1.matiere, p1_couleur=p1.couleur, p1_etat=p1.etat,
                p2_nom=p2.nom, p2_marque=p2.marque, p2_reference_oem=p2.reference_oem,
                p2_fabricant=p2.fabricant, p2_type_piece_id=p2.type_piece_id,
                p2_modeles_compatibles=p2.modeles_compatibles,
                p2_annee_debut=p2.annee_debut, p2_annee_fin=p2.annee_fin,
                p2_poids=p2.poids, p2_longueur=p2.longueur, p2_largeur=p2.largeur, p2_hauteur=p2.hauteur,
                p2_matiere=p2.matiere, p2_couleur=p2.couleur, p2_etat=p2.etat,
            )

            if result['classification'] in (MATCH_CONFIRMED, MATCH_POSSIBLE) and result['score'] >= min_score:
                pair_key = (p1.id, p2.id) if p1.id < p2.id else (p2.id, p1.id)
                if pair_key not in seen_pairs:
                    seen_pairs.add(pair_key)
                    confidence = 'high' if result['classification'] == MATCH_CONFIRMED else 'medium'
                    duplicates.append({
                        'product_a_id': pair_key[0],
                        'product_b_id': pair_key[1],
                        'product_a': p1 if p1.id == pair_key[0] else p2,
                        'product_b': p2 if p2.id == pair_key[1] else p1,
                        'score': result['score'],
                        'score_hors_oem': result['score_hors_oem'],
                        'confidence': confidence,
                        'classification': result['classification'],
                        'reasons_match': result['reasons_match'],
                        'reasons_block': result['reasons_block'],
                        'warnings': result['warnings'],
                    })

    duplicates.sort(key=lambda x: x['score'], reverse=True)
    return duplicates
