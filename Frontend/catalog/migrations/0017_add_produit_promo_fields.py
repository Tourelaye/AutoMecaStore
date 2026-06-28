# Generated manually for AutoMecaStore

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0016_livraison'),
    ]

    operations = [
        migrations.AddField(
            model_name='produit',
            name='date_debut_promo',
            field=models.DateTimeField(blank=True, help_text='Date de début de la promotion', null=True),
        ),
        migrations.AddField(
            model_name='produit',
            name='est_bestseller',
            field=models.BooleanField(default=False, help_text='Bestseller'),
        ),
        migrations.AddField(
            model_name='produit',
            name='est_recommande',
            field=models.BooleanField(default=False, help_text='Produit recommandé'),
        ),
        migrations.AddField(
            model_name='produit',
            name='est_tendance',
            field=models.BooleanField(default=False, help_text='Produit tendance'),
        ),
        migrations.AddField(
            model_name='produit',
            name='est_vedette',
            field=models.BooleanField(default=False, help_text='Produit vedette'),
        ),
        migrations.AddField(
            model_name='produit',
            name='heure_debut_eclair',
            field=models.TimeField(blank=True, help_text='Heure de début de la vente éclair', null=True),
        ),
        migrations.AddField(
            model_name='produit',
            name='heure_fin_eclair',
            field=models.TimeField(blank=True, help_text='Heure de fin de la vente éclair', null=True),
        ),
        migrations.AddField(
            model_name='produit',
            name='nombre_favoris',
            field=models.PositiveIntegerField(default=0, help_text="Nombre d'ajouts aux favoris"),
        ),
        migrations.AddField(
            model_name='produit',
            name='nombre_ventes',
            field=models.PositiveIntegerField(default=0, help_text='Nombre de ventes totales'),
        ),
        migrations.AddField(
            model_name='produit',
            name='nombre_vues',
            field=models.PositiveIntegerField(default=0, help_text='Nombre de vues du produit'),
        ),
        migrations.AddField(
            model_name='produit',
            name='pourcentage_reduction',
            field=models.PositiveIntegerField(blank=True, help_text='Pourcentage de réduction (ex: 20 pour 20%)', null=True),
        ),
        migrations.AddField(
            model_name='produit',
            name='vente_eclair',
            field=models.BooleanField(default=False, help_text='Produit en vente éclair'),
        ),
        migrations.AlterField(
            model_name='produit',
            name='date_fin_promo',
            field=models.DateTimeField(blank=True, help_text='Date de fin de la promotion', null=True),
        ),
    ]
