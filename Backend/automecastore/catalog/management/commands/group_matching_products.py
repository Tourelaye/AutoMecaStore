from django.core.management.base import BaseCommand

from catalog.models import Produit
from catalog.product_matching import link_product_to_group


class Command(BaseCommand):
    """Regroupe rétroactivement les produits identiques non liés.

    Les produits créés alors qu'un jumeau était encore en attente
    d'approbation (is_active=False → invisible pour le matching à la
    création) n'ont jamais été liés à un ProduitGroup. Cette commande
    refait le matching sur les produits non supprimés sans groupe.
    """

    help = 'Lie les produits identiques à un ProduitGroup (matches confirmés).'

    def handle(self, *args, **options):
        linked = 0
        qs = Produit.all_objects.filter(
            produit_group__isnull=True,
            date_suppression__isnull=True,
        ).order_by('id')
        total = qs.count()
        self.stdout.write(f'{total} produit(s) sans groupe à analyser…')
        for produit in qs:
            if link_product_to_group(produit):
                linked += 1
                self.stdout.write(f'  lié : #{produit.id} {produit.nom}')
        self.stdout.write(
            self.style.SUCCESS(f'{linked} produit(s) lié(s) à un groupe.')
        )
