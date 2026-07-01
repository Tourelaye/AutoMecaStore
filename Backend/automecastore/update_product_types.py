import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automecastore.settings')
django.setup()

from catalog.models import Produit, TypePiece, Categorie

category_type_mapping = {
    'Automobile': ['Freinage', 'Moteur', 'Filtration', 'Suspension', 'Transmission', 'Éclairage'],
    'Moto & Scooter': ['Freinage Moto', 'Kit Chaîne', 'Carénage', 'Échappement'],
    'Poids Lourds': ['Freinage', 'Transmission', 'Pneumatiques', 'Éclairage'],
    'Velo & E-bike': ['Freinage', 'Transmission', 'Roues', 'Éclairage'],
}

products_without_type = Produit.objects.filter(type_piece__isnull=True)
updated = 0

print(f"Found {products_without_type.count()} products without type_piece")

for p in products_without_type:
    cat_nom = p.categorie.nom if p.categorie else None
    if cat_nom and cat_nom in category_type_mapping:
        matching = TypePiece.objects.filter(
            categorie=p.categorie,
            nom__in=category_type_mapping[cat_nom]
        ).first()
        if matching:
            p.type_piece = matching
            p.save()
            updated += 1
            print(f"Updated: {p.nom} -> {matching.nom}")

print(f"Total updated: {updated}/{products_without_type.count()}")
