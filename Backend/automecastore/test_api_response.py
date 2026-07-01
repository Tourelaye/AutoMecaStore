import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automecastore.settings')
django.setup()

from catalog.serializers import ProduitSerializer
from catalog.models import Produit

# Get a product and serialize it
product = Produit.objects.first()
serializer = ProduitSerializer(product)

print("=== API Response Structure ===")
print(json.dumps(serializer.data, indent=2, ensure_ascii=False))

print("\n=== Verification ===")
print(f"Has type_piece field: {'type_piece' in serializer.data}")
print(f"Has type_piece_nom field: {'type_piece_nom' in serializer.data}")
print(f"type_piece value: {serializer.data.get('type_piece')}")
print(f"type_piece_nom value: {serializer.data.get('type_piece_nom')}")
