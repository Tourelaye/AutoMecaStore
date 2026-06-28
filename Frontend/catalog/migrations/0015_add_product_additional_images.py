# Generated migration for adding additional image fields to Produit model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0014_alter_produit_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='produit',
            name='image_2',
            field=models.ImageField(blank=True, null=True, upload_to='products/'),
        ),
        migrations.AddField(
            model_name='produit',
            name='image_3',
            field=models.ImageField(blank=True, null=True, upload_to='products/'),
        ),
        migrations.AddField(
            model_name='produit',
            name='image_4',
            field=models.ImageField(blank=True, null=True, upload_to='products/'),
        ),
    ]
