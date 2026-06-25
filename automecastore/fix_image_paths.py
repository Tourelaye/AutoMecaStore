import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automecastore.settings')
django.setup()

from catalog.models import Produit

# Update image paths from just filename to /media/produits/filename
produits = Produit.objects.filter(image__isnull=False)
count = 0

for produit in produits:
    if produit.image and produit.image.name and not produit.image.name.startswith('/'):
        # Image is stored as just filename, needs to be updated to /media/produits/filename
        old_path = produit.image.name
        new_path = f"/media/produits/{old_path}"
        produit.image.name = new_path
        produit.save()
        count += 1
        print(f"Updated produit {produit.id}: {old_path} -> {new_path}")

print(f"\nTotal updated: {count} products")
