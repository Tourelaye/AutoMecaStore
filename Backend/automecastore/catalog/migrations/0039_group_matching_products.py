from django.db import migrations


def group_products(apps, schema_editor):
    """Lie rétroactivement les produits identiques à un ProduitGroup.

    Les produits créés alors qu'un jumeau était en attente d'approbation
    (is_active=False → invisible pour le matching à la création) n'ont
    jamais été regroupés — d'où « vendu par 1 magasin » sur des pièces
    vendues par plusieurs magasins.
    """
    from catalog.models import Produit
    from catalog.product_matching import link_product_to_group

    for produit in Produit.all_objects.filter(
        produit_group__isnull=True,
        date_suppression__isnull=True,
    ).order_by('id'):
        try:
            link_product_to_group(produit)
        except Exception:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0038_add_produit_group'),
    ]

    operations = [
        migrations.RunPython(group_products, migrations.RunPython.noop),
    ]
