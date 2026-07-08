# Generated manually for fournisseur module

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('account', '0008_auto_20260708_1952'),
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('montant_brut', models.DecimalField(decimal_places=2, max_digits=10)),
                ('commission', models.DecimalField(decimal_places=2, max_digits=10)),
                ('revenu_net', models.DecimalField(decimal_places=2, max_digits=10)),
                ('statut_reversement', models.CharField(choices=[('paye', 'Payé'), ('en_cours', 'En cours'), ('attente', 'En attente')], default='attente', max_length=20)),
                ('date_transaction', models.DateTimeField(auto_now_add=True)),
                ('date_versement', models.DateTimeField(blank=True, null=True)),
                ('reference_virement', models.CharField(blank=True, max_length=100, null=True)),
                ('commande', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='orders.commande')),
                ('fournisseur', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='account.fournisseur')),
            ],
        ),
        migrations.CreateModel(
            name='HistoriqueActivite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('produit', 'Produit'), ('commande', 'Commande'), ('stock', 'Stock'), ('promotion', 'Promotion'), ('profil', 'Profil')], max_length=20)),
                ('titre', models.CharField(max_length=200)),
                ('detail', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('fournisseur', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='historiques', to='account.fournisseur')),
            ],
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('destinataire_id', models.IntegerField()),
                ('destinataire_type', models.CharField(choices=[('fournisseur', 'Fournisseur'), ('admin', 'Admin')], max_length=20)),
                ('type', models.CharField(choices=[('commande', 'Nouvelle commande'), ('stock', 'Alerte stock'), ('promotion', 'Promotion'), ('avis', 'Nouvel avis'), ('systeme', 'Système')], max_length=20)),
                ('message', models.TextField()),
                ('lu', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
