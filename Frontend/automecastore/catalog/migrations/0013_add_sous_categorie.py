# Generated migration for SousCategorie model and sous_categorie field in Produit

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0012_alter_categorie_id_alter_entrepot_id_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='SousCategorie',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('datecreation', models.DateTimeField(auto_now_add=True)),
                ('datemodification', models.DateTimeField(auto_now=True)),
                ('etat', models.BooleanField(default=True)),
                ('categorie', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sous_categories', to='catalog.categorie')),
            ],
            options={
                'verbose_name': 'Sous-catégorie',
                'verbose_name_plural': 'Sous-catégories',
                'ordering': ['categorie', 'nom'],
            },
        ),
        migrations.AddField(
            model_name='produit',
            name='sous_categorie',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='produits', to='catalog.souscategorie'),
        ),
    ]
