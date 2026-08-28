from django.db import migrations


def normalize_statuts(apps, schema_editor):
    Fournisseur = apps.get_model('account', 'Fournisseur')
    Fournisseur.objects.filter(statut='valide').update(statut='actif')
    Fournisseur.objects.filter(statut='refuse').update(statut='desactive')


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('account', '0015_vehiculeclient'),
    ]

    operations = [
        migrations.RunPython(normalize_statuts, noop),
    ]
