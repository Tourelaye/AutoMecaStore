"""
Commande Django pour détecter les doublons potentiels dans le catalogue.

Usage:
    python manage.py detect_duplicates
    python manage.py detect_duplicates --min-score 80
    python manage.py detect_duplicates --active-only

NE fusionne PAS automatiquement les doublons.
Génère uniquement un rapport read-only.
"""
from django.core.management.base import BaseCommand
from catalog.product_matching import (
    detect_all_duplicates,
    SCORE_CONFIRMED, SCORE_POSSIBLE,
    MATCH_CONFIRMED, MATCH_POSSIBLE, NO_MATCH,
)
from catalog.models import Produit, FournisseurProduit


class Command(BaseCommand):
    help = "Détecte les produits potentiellement dupliqués dans le catalogue."

    def add_arguments(self, parser):
        parser.add_argument(
            '--min-score',
            type=int,
            default=SCORE_POSSIBLE,
            help=f'Score minimum pour considérer une paire comme doublon (défaut: {SCORE_POSSIBLE})',
        )
        parser.add_argument(
            '--active-only',
            action='store_true',
            default=False,
            help='Ne scanner que les produits actifs (exclut les soft-deleted)',
        )

    def handle(self, *args, **options):
        min_score = options['min_score']
        active_only = options['active_only']

        self.stdout.write("=" * 100)
        self.stdout.write("DÉTECTION DE DOUBLONS — AutoMecaStore")
        self.stdout.write("=" * 100)

        if active_only:
            total = Produit.objects.count()
        else:
            total = Produit.all_objects.count()

        self.stdout.write(f"\n  Produits à analyser       : {total}")
        self.stdout.write(f"  Score minimum             : {min_score}")
        self.stdout.write(f"  Inclure produits inactifs : {'Non' if active_only else 'Oui'}")
        self.stdout.write("")

        # Récupérer les doublons
        duplicates = detect_all_duplicates(min_score=min_score, active_only=active_only)

        high_conf = [d for d in duplicates if d['classification'] == MATCH_CONFIRMED]
        medium_conf = [d for d in duplicates if d['classification'] == MATCH_POSSIBLE]

        self.stdout.write("=" * 100)
        self.stdout.write("RAPPORT DE DÉTECTION")
        self.stdout.write("=" * 100)
        self.stdout.write(f"\n  Produits analysés        : {total}")
        self.stdout.write(f"  Correspondances fortes   : {len(high_conf)}")
        self.stdout.write(f"  Correspondances possibles : {len(medium_conf)}")
        self.stdout.write(f"  Total doublons détectés   : {len(duplicates)}")
        self.stdout.write("")

        if not duplicates:
            self.stdout.write("  ✅ Aucun doublon détecté.")
            self.stdout.write("\n" + "=" * 100)
            self.stdout.write("⚠️  Aucune fusion n'a été effectuée. Ce rapport est read-only.\n")
            return

        # Afficher les correspondances fortes
        if high_conf:
            self.stdout.write("\n" + "─" * 100)
            self.stdout.write("CORRESPONDANCES FORTES (MATCH_CONFIRMED)")
            self.stdout.write("─" * 100)
            for d in high_conf:
                self._print_duplicate(d)

        # Afficher les correspondances possibles
        if medium_conf:
            self.stdout.write("\n" + "─" * 100)
            self.stdout.write("CORRESPONDANCES POSSIBLES (MATCH_POSSIBLE)")
            self.stdout.write("─" * 100)
            for d in medium_conf:
                self._print_duplicate(d)

        self.stdout.write("\n" + "=" * 100)
        self.stdout.write("FIN DU RAPPORT")
        self.stdout.write("=" * 100)
        self.stdout.write("\n⚠️  Aucune fusion n'a été effectuée. Ce rapport est read-only.")
        self.stdout.write("   Pour fusionner, utilisez l'API ou le script de fusion avec validation manuelle.\n")

    def _print_duplicate(self, d):
        pa = d['product_a']
        pb = d['product_b']
        self.stdout.write(f"\n  P#{pa.id} ↔ P#{pb.id}")
        self.stdout.write(f"    Score             : {d['score']}")
        self.stdout.write(f"    Score hors OEM    : {d.get('score_hors_oem', 'N/A')}")
        self.stdout.write(f"    Classification    : {d['classification']}")
        offres_a = FournisseurProduit.objects.filter(produit_id=pa.id).count()
        offres_b = FournisseurProduit.objects.filter(produit_id=pb.id).count()
        self.stdout.write(f"    P#{pa.id}: {pa.nom}")
        self.stdout.write(f"      marque={pa.marque} | OEM={pa.reference_oem} | type={pa.type_piece_id} | actif={pa.is_active} | offres={offres_a}")
        self.stdout.write(f"    P#{pb.id}: {pb.nom}")
        self.stdout.write(f"      marque={pb.marque} | OEM={pb.reference_oem} | type={pb.type_piece_id} | actif={pb.is_active} | offres={offres_b}")
        self.stdout.write(f"    Raisons match:")
        for r in d['reasons_match']:
            self.stdout.write(f"      ✓ {r}")
        if d.get('warnings'):
            self.stdout.write(f"    Avertissements:")
            for r in d['warnings']:
                self.stdout.write(f"      ⚠ {r}")
        if d['reasons_block']:
            self.stdout.write(f"    Blocages:")
            for r in d['reasons_block']:
                self.stdout.write(f"      ✗ {r}")
