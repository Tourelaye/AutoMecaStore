"""
Commande Django pour un AUDIT COMPLET des doublons dans le catalogue.

Usage:
    python manage.py audit_duplicates --min-score 50

NE fusionne PAS, NE modifie PAS, NE supprime PAS.
Génère uniquement un rapport read-only avec regroupement, dépendances et proposition de cible.
"""
from django.core.management.base import BaseCommand
from collections import defaultdict
from django.db.models import Count, Q

from catalog.product_matching import (
    detect_all_duplicates,
    SCORE_CONFIRMED, SCORE_POSSIBLE,
    MATCH_CONFIRMED, MATCH_POSSIBLE, NO_MATCH,
)
from catalog.models import (
    Produit, FournisseurProduit, MouvementStock, Promotion, ProduitFavoris,
)
from orders.models import LigneCommande, PanierItem
from account.models import Favori


class Command(BaseCommand):
    help = "Audit complet read-only des doublons potentiels dans le catalogue."

    def add_arguments(self, parser):
        parser.add_argument(
            '--min-score',
            type=int,
            default=50,
            help='Score minimum pour considérer une paire (défaut: 50)',
        )

    def handle(self, *args, **options):
        min_score = options['min_score']

        # ── Comptages globaux ──
        total_active = Produit.objects.count()
        total_inactive = Produit.all_objects.exclude(
            Q(is_active=True) | Q(is_active__isnull=True)
        ).count()
        total_all = Produit.all_objects.count()

        self.stdout.write("=" * 100)
        self.stdout.write("AUDIT DOUBLONS AUTOMECASTORE")
        self.stdout.write("=" * 100)
        self.stdout.write(f"\n  Produits actifs analysés   : {total_active}")
        self.stdout.write(f"  Produits inactifs analysés  : {total_inactive}")
        self.stdout.write(f"  Total produits              : {total_all}")
        self.stdout.write(f"  Score minimum               : {min_score}")
        self.stdout.write("")

        # ── Analyse A : Actifs ↔ Actifs ──
        self.stdout.write("\n" + "─" * 100)
        self.stdout.write("ANALYSE A : Produits ACTIFS ↔ ACTIFS")
        self.stdout.write("─" * 100)
        dups_active = detect_all_duplicates(min_score=min_score, active_only=True)
        groups_active = self._build_groups(dups_active)
        self._print_groups(groups_active, section_label="A")

        # ── Analyse B+C : Tous produits (inclut inactifs) ──
        self.stdout.write("\n" + "─" * 100)
        self.stdout.write("ANALYSE B+C : Tous produits (actifs + inactifs)")
        self.stdout.write("─" * 100)
        dups_all = detect_all_duplicates(min_score=min_score, active_only=False)
        # Séparer en B (inactif↔actif) et C (inactif↔inactif)
        dups_b = []
        dups_c = []
        for d in dups_all:
            pa = d['product_a']
            pb = d['product_b']
            a_active = pa.is_active or pa.is_active is None
            b_active = pb.is_active or pb.is_active is None
            if not a_active and b_active:
                dups_b.append(d)
            elif not b_active and a_active:
                dups_b.append(d)
            elif not a_active and not b_active:
                dups_c.append(d)

        groups_b = self._build_groups(dups_b)
        self.stdout.write("\n" + "─" * 100)
        self.stdout.write("ANALYSE B : Inactifs ↔ Actifs")
        self.stdout.write("─" * 100)
        self._print_groups(groups_b, section_label="B")

        groups_c = self._build_groups(dups_c)
        self.stdout.write("\n" + "─" * 100)
        self.stdout.write("ANALYSE C : Inactifs ↔ Inactifs")
        self.stdout.write("─" * 100)
        self._print_groups(groups_c, section_label="C")

        # ── Statistiques globales ──
        all_dups = dups_active + dups_b + dups_c
        self._print_statistics(all_dups, total_active, total_inactive, total_all,
                               len(groups_active), len(groups_b), len(groups_c))

        self.stdout.write("\n" + "=" * 100)
        self.stdout.write("FIN DE L'AUDIT")
        self.stdout.write("=" * 100)
        self.stdout.write("\n⚠️  AUCUNE modification n'a été effectuée en base de données.")
        self.stdout.write("   Cet audit est 100% READ-ONLY.")
        self.stdout.write("   Pour fusionner, utilisez l'API de fusion avec validation manuelle.\n")

    # ──────────────────────────────────────────────────────
    # Regroupement (transitive closure)
    # ──────────────────────────────────────────────────────
    def _build_groups(self, duplicates):
        """Regroupe les paires en groupes par fermeture transitive (Union-Find)."""
        parent = {}

        def find(x):
            while parent.get(x, x) != x:
                parent[x] = parent.get(parent[x], parent[x])
                x = parent[x]
            return x

        def union(a, b):
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[ra] = rb

        pair_scores = {}
        pair_info = {}
        for d in duplicates:
            a, b = d['product_a'].id, d['product_b'].id
            union(a, b)
            key = (min(a, b), max(a, b))
            pair_scores[key] = d
            pair_info[key] = d

        # Construire les groupes
        group_map = defaultdict(list)
        all_ids = set()
        for d in duplicates:
            all_ids.add(d['product_a'].id)
            all_ids.add(d['product_b'].id)
        for pid in all_ids:
            group_map[find(pid)].append(pid)

        groups = []
        for root, member_ids in group_map.items():
            if len(member_ids) < 2:
                continue
            # Récupérer les paires dans ce groupe
            group_pairs = []
            for i in range(len(member_ids)):
                for j in range(i + 1, len(member_ids)):
                    a, b = member_ids[i], member_ids[j]
                    key = (min(a, b), max(a, b))
                    if key in pair_info:
                        group_pairs.append(pair_info[key])

            # Déterminer la classification du groupe (la meilleure)
            best_class = NO_MATCH
            for p in group_pairs:
                if p['classification'] == MATCH_CONFIRMED:
                    best_class = MATCH_CONFIRMED
                    break
                elif p['classification'] == MATCH_POSSIBLE:
                    best_class = MATCH_POSSIBLE

            groups.append({
                'members': sorted(member_ids),
                'pairs': group_pairs,
                'best_class': best_class,
            })

        # Trier : MATCH_CONFIRMED d'abord, puis MATCH_POSSIBLE
        groups.sort(key=lambda g: (0 if g['best_class'] == MATCH_CONFIRMED else 1, g['members']))
        return groups

    # ──────────────────────────────────────────────────────
    # Affichage des groupes
    # ──────────────────────────────────────────────────────
    def _print_groups(self, groups, section_label=""):
        if not groups:
            self.stdout.write("\n  ✅ Aucun doublon détecté dans cette section.\n")
            return

        confirmed = [g for g in groups if g['best_class'] == MATCH_CONFIRMED]
        possible = [g for g in groups if g['best_class'] == MATCH_POSSIBLE]

        self.stdout.write(f"\n  Groupes à forte confiance (MATCH_CONFIRMED) : {len(confirmed)}")
        self.stdout.write(f"  Groupes à vérifier (MATCH_POSSIBLE)        : {len(possible)}")
        self.stdout.write(f"  Total groupes                               : {len(groups)}\n")

        if confirmed:
            self.stdout.write("\n" + "─" * 100)
            self.stdout.write(f"GROUPES À FORTE CONFIANCE [{section_label}]")
            self.stdout.write("─" * 100)
            for i, g in enumerate(confirmed, 1):
                self._print_group(g, i, section_label)

        if possible:
            self.stdout.write("\n" + "─" * 100)
            self.stdout.write(f"GROUPES À VÉRIFIER MANUELLEMENT [{section_label}]")
            self.stdout.write("─" * 100)
            for i, g in enumerate(possible, len(confirmed) + 1):
                self._print_group(g, i, section_label)

    def _print_group(self, group, group_num, section_label):
        members = group['members']
        pairs = group['pairs']
        best_class = group['best_class']

        self.stdout.write(f"\n  GROUPE #{group_num} [{section_label}] — {best_class}")
        self.stdout.write(f"  Membres : {', '.join(f'P#{m}' for m in members)}")
        self.stdout.write("")

        # Charger les produits
        products = {}
        for pid in members:
            p = Produit.all_objects.get(pk=pid)
            products[pid] = p
            self._print_product_detail(p)

        # Afficher les scores entre paires
        self.stdout.write(f"\n    Scores entre paires :")
        for d in pairs:
            pa = d['product_a']
            pb = d['product_b']
            self.stdout.write(
                f"      P#{pa.id} ↔ P#{pb.id} : score={d['score']} | "
                f"score_hors_oem={d.get('score_hors_oem', 'N/A')} | "
                f"classification={d['classification']}"
            )

        # Afficher les raisons du match (de la meilleure paire)
        if pairs:
            best_pair = max(pairs, key=lambda x: x['score'])
            self.stdout.write(f"\n    Raisons du match (meilleure paire P#{best_pair['product_a'].id} ↔ P#{best_pair['product_b'].id}) :")
            for r in best_pair.get('reasons_match', []):
                self.stdout.write(f"      ✓ {r}")
            if best_pair.get('warnings'):
                self.stdout.write(f"    Avertissements :")
                for w in best_pair['warnings']:
                    self.stdout.write(f"      ⚠ {w}")
            if best_pair.get('reasons_block'):
                self.stdout.write(f"    Conflits :")
                for b in best_pair['reasons_block']:
                    self.stdout.write(f"      ✗ {b}")

        # Proposition de produit cible
        target = self._propose_target(products)
        self.stdout.write(f"\n    → Produit cible recommandé : P#{target.id} ({target.nom})")
        self.stdout.write(f"      Critères : {self._target_reasons(products, target)}")
        self.stdout.write("")

    def _print_product_detail(self, p):
        """Affiche les détails d'un produit avec ses dépendances."""
        offres = FournisseurProduit.objects.filter(produit_id=p.id).count()
        commandes = LigneCommande.objects.filter(produit_id=p.id).count()
        paniers = PanierItem.objects.filter(produit_id=p.id).count()
        favoris_cat = ProduitFavoris.objects.filter(produit_id=p.id).count()
        favoris_acc = Favori.objects.filter(produit_id=p.id).count()
        favoris_total = favoris_cat + favoris_acc
        promos = Promotion.objects.filter(produit_id=p.id).count()
        mvt_stock = MouvementStock.objects.filter(produit_id=p.id).count()
        has_image = bool(p.image or p.image_2 or p.image_3 or p.image_4)
        has_oem = bool(p.reference_oem and p.reference_oem.strip())

        self.stdout.write(f"\n    P#{p.id} : {p.nom}")
        self.stdout.write(f"      Marque            : {p.marque or '—'}")
        self.stdout.write(f"      Type              : {p.type_piece_id or '—'}")
        self.stdout.write(f"      OEM               : {p.reference_oem or '—'}")
        self.stdout.write(f"      Référence/SKU     : {p.reference or '—'}")
        self.stdout.write(f"      Fabricant         : {p.fabricant or '—'}")
        self.stdout.write(f"      Compatibilité     : {p.modeles_compatibles or '—'}")
        self.stdout.write(f"      Actif             : {p.is_active}")
        self.stdout.write(f"      Stock             : {p.stock}")
        self.stdout.write(f"      Image             : {'Oui' if has_image else 'Non'}")
        self.stdout.write(f"      OEM renseigné      : {'Oui' if has_oem else 'Non'}")
        self.stdout.write(f"      Offres fournisseurs : {offres}")
        self.stdout.write(f"      Commandes liées     : {commandes}")
        self.stdout.write(f"      Éléments panier     : {paniers}")
        self.stdout.write(f"      Favoris            : {favoris_total}")
        self.stdout.write(f"      Promotions         : {promos}")
        self.stdout.write(f"      Mouvements stock   : {mvt_stock}")

    # ──────────────────────────────────────────────────────
    # Proposition de produit cible
    # ──────────────────────────────────────────────────────
    def _propose_target(self, products):
        """Propose le produit cible le plus pertinent pour une future fusion."""
        best = None
        best_score = -1
        for pid, p in products.items():
            score = 0
            # Actif
            if p.is_active or p.is_active is None:
                score += 100
            # Offres fournisseurs
            score += FournisseurProduit.objects.filter(produit_id=pid).count() * 10
            # Commandes
            score += LigneCommande.objects.filter(produit_id=pid).count() * 5
            # Paniers
            score += PanierItem.objects.filter(produit_id=pid).count() * 3
            # OEM renseigné
            if p.reference_oem and p.reference_oem.strip():
                score += 5
            # Image
            if p.image or p.image_2 or p.image_3 or p.image_4:
                score += 3
            # Richesse des informations (description, fabricant, matiere, etc.)
            info_fields = [p.description, p.fabricant, p.matiere, p.couleur,
                          p.description_courte, p.description_detaillee]
            score += sum(1 for f in info_fields if f and str(f).strip())
            # Favoris
            score += ProduitFavoris.objects.filter(produit_id=pid).count() * 2
            score += Favori.objects.filter(produit_id=pid).count() * 2
            # Promotions
            score += Promotion.objects.filter(produit_id=pid).count() * 2

            if score > best_score:
                best_score = score
                best = p
        return best

    def _target_reasons(self, products, target):
        """Retourne les raisons du choix de cible."""
        reasons = []
        if target.is_active or target.is_active is None:
            reasons.append("actif")
        offres = FournisseurProduit.objects.filter(produit_id=target.id).count()
        if offres:
            reasons.append(f"{offres} offre(s) fournisseur(s)")
        commandes = LigneCommande.objects.filter(produit_id=target.id).count()
        if commandes:
            reasons.append(f"{commandes} commande(s)")
        paniers = PanierItem.objects.filter(produit_id=target.id).count()
        if paniers:
            reasons.append(f"{paniers} panier(s)")
        if target.reference_oem and target.reference_oem.strip():
            reasons.append("OEM renseigné")
        if target.image or target.image_2 or target.image_3 or target.image_4:
            reasons.append("image présente")
        info_count = sum(1 for f in [target.description, target.fabricant, target.matiere,
                         target.couleur, target.description_detaillee] if f and str(f).strip())
        if info_count:
            reasons.append(f"{info_count} champ(s) info renseigné(s)")
        return " | ".join(reasons) if reasons else "—"

    # ──────────────────────────────────────────────────────
    # Statistiques
    # ──────────────────────────────────────────────────────
    def _print_statistics(self, all_dups, total_active, total_inactive, total_all,
                          n_groups_a, n_groups_b, n_groups_c):
        # Compter les types de matchs/blocks
        oem_identique = 0
        oem_diff_concordant = 0
        sku_differents = 0
        marques_block = 0
        types_block = 0
        compat_block = 0

        for d in all_dups:
            reasons_match = d.get('reasons_match', [])
            reasons_block = d.get('reasons_block', [])
            warnings = d.get('warnings', [])

            if any('OEM identique' in r for r in reasons_match):
                oem_identique += 1
            if any('OEM différent' in w for w in warnings):
                oem_diff_concordant += 1
            # SKU différents : on ne peut pas le savoir directement, on approxime
            # en comptant les paires où les références diffèrent
            pa = d['product_a']
            pb = d['product_b']
            if pa.reference and pb.reference and pa.reference != pb.reference:
                sku_differents += 1
            if any('marque différente' in r for r in reasons_block):
                marques_block += 1
            if any('type de pièce différent' in r for r in reasons_block):
                types_block += 1
            if any('compatibilité' in r for r in reasons_block):
                compat_block += 1

        # Compter les paires uniques
        unique_pairs = set()
        for d in all_dups:
            a, b = d['product_a'].id, d['product_b'].id
            unique_pairs.add((min(a, b), max(a, b)))

        confirmed_count = sum(1 for d in all_dups if d['classification'] == MATCH_CONFIRMED)
        possible_count = sum(1 for d in all_dups if d['classification'] == MATCH_POSSIBLE)

        self.stdout.write("\n" + "=" * 100)
        self.stdout.write("STATISTIQUES")
        self.stdout.write("=" * 100)
        self.stdout.write(f"\n  Produits actifs analysés    : {total_active}")
        self.stdout.write(f"  Produits inactifs analysés  : {total_inactive}")
        self.stdout.write(f"  Total produits              : {total_all}")
        self.stdout.write(f"  Paires comparées (doublons)  : {len(unique_pairs)}")
        self.stdout.write("")
        self.stdout.write(f"  MATCH_CONFIRMED             : {confirmed_count}")
        self.stdout.write(f"  MATCH_POSSIBLE              : {possible_count}")
        self.stdout.write("")
        self.stdout.write(f"  Groupes [A] Actifs↔Actifs    : {n_groups_a}")
        self.stdout.write(f"  Groupes [B] Inactifs↔Actifs  : {n_groups_b}")
        self.stdout.write(f"  Groupes [C] Inactifs↔Inactifs: {n_groups_c}")
        self.stdout.write("")
        self.stdout.write(f"  OEM identique               : {oem_identique}")
        self.stdout.write(f"  OEM différent mais concordant: {oem_diff_concordant}")
        self.stdout.write(f"  SKU différents              : {sku_differents}")
        self.stdout.write(f"  Marques différentes bloquées : {marques_block}")
        self.stdout.write(f"  Types différents bloqués     : {types_block}")
        self.stdout.write(f"  Compatibilités bloquées     : {compat_block}")
