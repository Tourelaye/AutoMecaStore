# Generated manually to add TypePiece model and type_piece field to Produit

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0012_alter_categorie_id_alter_entrepot_id_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='TypePiece',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('datecreation', models.DateTimeField(auto_now_add=True)),
                ('datemodification', models.DateTimeField(auto_now=True)),
                ('etat', models.BooleanField(default=True)),
                ('categorie', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='types_pieces', to='catalog.categorie')),
            ],
        ),
        migrations.AddField(
            model_name='produit',
            name='type_piece',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='produits', to='catalog.typepiece'),
        ),
    ]
