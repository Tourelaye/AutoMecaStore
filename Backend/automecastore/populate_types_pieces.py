import os
import django

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automecastore.settings')
django.setup()

from catalog.models import Categorie, TypePiece

# Get all categories
categories = Categorie.objects.all()
print(f"Found {categories.count()} categories:")
for cat in categories:
    print(f"  - {cat.id}: {cat.nom}")

# Sample types of pieces data
types_pieces_data = {
    'Automobile': ['Freinage', 'Éclairage', 'Moteur', 'Suspension', 'Transmission', 'Pneumatiques', 'Carénage', 'Roues'],
    'Scooter': ['Freinage', 'Éclairage', 'Carénage', 'Roues'],
    'Poids lourds': ['Freinage', 'Transmission', 'Pneumatiques', 'Suspension'],
    'Velo': ['Freinage', 'Transmission', 'Roues']
}

# Create TypePiece entries
for category_name, types_names in types_pieces_data.items():
    try:
        category = Categorie.objects.get(nom__icontains=category_name)
        print(f"\nProcessing category: {category.nom}")
        
        for type_name in types_names:
            # Check if TypePiece already exists
            if not TypePiece.objects.filter(nom=type_name, categorie=category).exists():
                TypePiece.objects.create(
                    nom=type_name,
                    categorie=category,
                    description=f"Type de pièce: {type_name} pour {category.nom}"
                )
                print(f"   Created: {type_name}")
            else:
                print(f"  - Already exists: {type_name}")
    except Categorie.DoesNotExist:
        print(f"   Category not found: {category_name}")

print("\n TypePiece population completed!")
