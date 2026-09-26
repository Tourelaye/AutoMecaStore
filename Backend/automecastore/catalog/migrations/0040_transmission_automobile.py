from django.db import migrations


def add_transmission(apps, schema_editor):
    """Ajoute le type de pièce « Transmission » à la catégorie Automobile."""
    Categorie = apps.get_model('catalog', 'Categorie')
    TypePiece = apps.get_model('catalog', 'TypePiece')

    try:
        auto = Categorie.objects.get(nom__iexact='Automobile')
    except Categorie.DoesNotExist:
        return

    TypePiece.objects.get_or_create(
        nom='Transmission',
        categorie=auto,
        defaults={'description': 'Boîte de vitesses, embrayage, cardans et pièces de transmission'},
    )


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0039_group_matching_products'),
    ]

    operations = [
        migrations.RunPython(add_transmission, migrations.RunPython.noop),
    ]
