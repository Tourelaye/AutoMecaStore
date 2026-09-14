"""
Commande Django pour détecter et fusionner automatiquement les doublons.

Usage:
    python manage.py auto_merge_duplicates                # Fusionne les MATCH_CONFIRMED
    python manage.py auto_merge_duplicates --min-score 70  # Inclut les MATCH_POSSIBLE
    python manage.py auto_merge_duplicates --dry-run       # Simulation sans modification
    python manage.py auto_merge_duplicates --active-only   # Seulement les produits actifs

Logique:
1. Détecte tous les doublons avec detect_all_duplicates()
2. Groupe les paires en clusters (produits transitivement liés)
3. Pour chaque cluster, choisit le produit cible (le plus d'offres, sinon le plus ancien)
4. Fusionne tous les autres vers la cible avec fusionner_produits()
"""

from django.core.management.base import BaseCommand
from catalog.product_matching import (
    detect_all_duplicates,
    SCORE_CONFIRMED, SCORE_POSSIBLE,
    MATCH_CONFIRMED, MATCH_POSSIBLE,
)
from catalog.fusion import fusionner_produits
from catalog.models import Produit, FournisseurProduit


class Command(BaseCommand):
    help = "Détecte et fusionne automatiquement les produits dupliqués du catalogue."

    def add_arguments(self, parser):
        parser.add_argument(
            '--min-score',
            type=int,
            default=SCORE_CONFIRMED,
            help=f'Score minimum pour fusionner (défaut: {SCORE_CONFIRMED} = MATCH_CONFIRMED)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='Simulation : affiche ce qui serait fusionné sans modifier la DB',
        )
        parser.add_argument(
            '--active-only',
            action='store_true',
            default=False,
            help='Ne scanner que les produits actifs',
        )

    def handle(self, *args, **options):
        min_score = options['min_score']
        dry_run = options['dry_run']
        active_only = options['active_only']

        self.stdout.write("=" * 100)
        self.stdout.write("FUSION AUTOMATIQUE DE DOUBLONS — AutoMecaStore")
        self.stdout.write("=" * 100)

        if active_only:
            total = Produit.objects.count()
        else:
            total = Produit.all_objects.count()

        self.stdout.write(f"\n  Produits à analyser       : {total}")
        self.stdout.write(f"  Score minimum             : {min_score}")
        self.stdout.write(f"  Mode simulation           : {'Oui' if dry_run else 'Non'}")
        self.stdout.write(f"  Inclure produits inactifs : {'Non' if active_only else 'Oui'}")
        self.stdout.write("")

        # Étape 1 : Détecter les doublons
        duplicates = detect_all_duplicates(min_score=min_score, active_only=active_only)

        if not duplicates:
            self.stdout.write("  ✅ Aucun doublon détecté. Rien à fusionner.")
            self.stdout.write("\n" + "=" * 100)
            return

        high_conf = [d for d in duplicates if d['classification'] == MATCH_CONFIRMED]
        medium_conf = [d for d in duplicates if d['classification'] == MATCH_POSSIBLE]

        self.stdout.write(f"  Correspondances fortes    : {len(high_conf)}")
        self.stdout.write(f"  Correspondances possibles : {len(medium_conf)}")
        self.stdout.write(f"  Total paires détectées    : {len(duplicates)}")
        self.stdout.write("")

        # Étape 2 : Grouper les paires en clusters
        clusters = self._build_clusters(duplicates)

        self.stdout.write(f"  Clusters de fusion        : {len(clusters)}")
        self.stdout.write("")

        # Étape 3 : Pour chaque cluster, choisir la cible et fusionner
        total_merged = 0
        total_sources = 0
        errors = []

        for i, cluster in enumerate(clusters, 1):
            cluster_ids = sorted(cluster)
            self.stdout.write("\n" + "─" * 100)
            self.stdout.write(f"  CLUSTER {i}/{len(clusters)} — {len(cluster_ids)} produits: {cluster_ids}")

            # Afficher les produits du cluster
            for pid in cluster_ids:
                try:
                    p = Produit.all_objects.get(pk=pid)
                    offres = FournisseurProduit.objects.filter(produit_id=pid).count()
                    self.stdout.write(
                        f"    P#{pid}: {p.nom} | marque={p.marque} | OEM={p.reference_oem or 'N/A'} "
                        f"| actif={p.is_active} | offres={offres}"
                    )
                except Produit.DoesNotExist:
                    self.stdout.write(f"    P#{pid}: introuvable")

            # Choisir la cible : le produit avec le plus d'offres, sinon le plus petit ID
            target_id = self._choose_target(cluster_ids)
            source_ids = [pid for pid in cluster_ids if pid != target_id]

            self.stdout.write(f"    → Cible: P#{target_id}")
            self.stdout.write(f"    → Sources à fusionner: {source_ids}")

            if dry_run:
                self.stdout.write("    [SIMULATION] Aucune modification effectuée.")
                continue

            # Fusionner
            try:
                result = fusionner_produits(
                    source_ids=source_ids,
                    target_id=target_id,
                    enrichir_oem=True,
                )
                total_merged += 1
                total_sources += len(source_ids)

                migrated = result['migrated']
                self.stdout.write(
                    f"    ✅ Fusion réussie — "
                    f"FP={migrated['fournisseur_produits']}, "
                    f"LC={migrated['ligne_commandes']}, "
                    f"PI={migrated['panier_items']}, "
                    f"fav={migrated['produit_favoris']}, "
                    f"stock={migrated['stocks']}, "
                    f"promo={migrated['promotions']}, "
                    f"avis={migrated['avis']}"
                )
                if result['enriched_oem']:
                    self.stdout.write(f"    ✨ OEM enrichi sur la cible")
                if result['errors']:
                    for e in result['errors']:
                        self.stdout.write(f"    ⚠ {e}")
                        errors.append(e)
            except Exception as e:
                self.stdout.write(f"    ❌ Erreur: {e}")
                errors.append(str(e))

        # Résumé
        self.stdout.write("\n" + "=" * 100)
        self.stdout.write("RÉSUMÉ")
        self.stdout.write("=" * 100)
        self.stdout.write(f"  Clusters traités  : {len(clusters)}")
        self.stdout.write(f"  Fusions réussies  : {total_merged}")
        self.stdout.write(f"  Produits sources  : {total_sources} (soft-deleted)")
        if errors:
            self.stdout.write(f"  Erreurs           : {len(errors)}")
            for e in errors:
                self.stdout.write(f"    ⚠ {e}")
        else:
            self.stdout.write(f"  Erreurs           : 0")
        self.stdout.write("")

    def _build_clusters(self, duplicates):
        """
        Groupe les paires de doublons en clusters transitifs.
        Si A~B et B~C, alors {A, B, C} forment un cluster.
        """
        # Union-Find
        parent = {}

        def find(x):
            if x not in parent:
                parent[x] = x
            if parent[x] != x:
                parent[x] = find(parent[x])
            return parent[x]

        def union(x, y):
            rx, ry = find(x), find(y)
            if rx != ry:
                parent[rx] = ry

        for d in duplicates:
            union(d['product_a_id'], d['product_b_id'])

        # Grouper par racine
        clusters_map = {}
        for node in parent:
            root = find(node)
            if root not in clusters_map:
                clusters_map[root] = set()
            clusters_map[root].add(node)

        # Ne garder que les clusters avec au moins 2 produits
        clusters = [list(s) for s in clusters_map.values() if len(s) >= 2]
        return clusters

    def _choose_target(self, cluster_ids):
        """
        Choisit le produit cible dans un cluster.
        Critères (par ordre de priorité):
        1. Le produit avec le plus d'offres FournisseurProduit
        2. Le produit avec le plus de vues (nombre_vues)
        3. Le plus petit ID (plus ancien)
        """
        best_id = None
        best_score = None

        for pid in cluster_ids:
            offres = FournisseurProduit.objects.filter(produit_id=pid).count()
            try:
                p = Produit.all_objects.get(pk=pid)
                vues = p.nombre_vues or 0
            except Produit.DoesNotExist:
                vues = 0

            # Score: (offres, vues, -id) — on veut max offres, puis max vues, puis min id
            score = (offres, vues, -pid)

            if best_score is None or score > best_score:
                best_score = score
                best_id = pid

        return best_id
