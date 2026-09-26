from django.db import migrations


def sync_owner_offres(apps, schema_editor):
    """Resynchronise prix_vente/stock_disponible des offres FournisseurProduit
    appartenant au propriétaire du produit.

    Quand un fournisseur modifie le prix de son produit, l'offre
    (onglet « offres ») gardait l'ancien prix figé à la création.
    """
    Produit = apps.get_model('catalog', 'Produit')
    FournisseurProduit = apps.get_model('catalog', 'FournisseurProduit')

    for fp in FournisseurProduit.objects.select_related(
        'produit', 'fournisseur', 'fournisseur__administrateur'
    ).exclude(produit__isnull=True):
        p = fp.produit
        f = fp.fournisseur
        if not f or not f.administrateur_id or not p.fournisseur_id:
            continue
        # Offre du propriétaire du produit uniquement
        if p.fournisseur.user_id != f.administrateur_id:
            continue
        changed = []
        if fp.prix_vente != p.prix:
            fp.prix_vente = p.prix
            changed.append('prix_vente')
        if fp.stock_disponible != p.stock:
            fp.stock_disponible = p.stock
            changed.append('stock_disponible')
        if changed:
            fp.save(update_fields=changed)


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0040_transmission_automobile'),
    ]

    operations = [
        migrations.RunPython(sync_owner_offres, migrations.RunPython.noop),
    ]
