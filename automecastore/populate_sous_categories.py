# Script pour peupler les sous-catégories (types de pièces)
import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automecastore.settings')
django.setup()

from catalog.models import Categorie, SousCategorie

# Mapping des sous-catégories par catégorie
SOUS_CATEGORIES_PAR_CATEGORIE = {
    'Automobile': [
        'Freinage',
        'Moteur',
        'Filtration',
        'Suspension',
        'Transmission',
        'Éclairage',
        'Climatisation',
        'Batterie',
        'Échappement'
    ],
    'Moto & Scooter': [
        'Freinage',
        'Moteur',
        'Transmission',
        'Kit chaîne',
        'Carénage',
        'Éclairage',
        'Échappement',
        'Pneumatiques'
    ],
    'Poids lourds': [
        'Freinage',
        'Suspension',
        'Moteur',
        'Transmission',
        'Filtration',
        'Éclairage',
        'Pneus'
    ],
    'Vélo & E-bike': [
        'Freinage',
        'Transmission',
        'Pneus',
        'Éclairage',
        'Batterie',
        'Cadre',
        'Selle',
        'Pédalier'
    ]
}

def populate_sous_categories():
    """Peuple la base de données avec les sous-catégories"""
    print("=== PEUPLEMENT DES SOUS-CATÉGORIES ===\n")
    
    total_created = 0
    total_updated = 0
    
    for categorie_nom, sous_categories in SOUS_CATEGORIES_PAR_CATEGORIE.items():
        # Récupérer la catégorie
        try:
            categorie = Categorie.objects.get(nom=categorie_nom)
            print(f"Catégorie trouvée: {categorie.nom}")
        except Categorie.DoesNotExist:
            print(f"⚠️ Catégorie non trouvée: {categorie_nom}")
            continue
        
        # Créer les sous-catégories
        for sc_nom in sous_categories:
            sous_categorie, created = SousCategorie.objects.get_or_create(
                nom=sc_nom,
                categorie=categorie
            )
            
            if created:
                print(f"  ✅ Créé: {sc_nom}")
                total_created += 1
            else:
                print(f"  ℹ️ Existe déjà: {sc_nom}")
                total_updated += 1
    
    print(f"\n=== RÉSUMÉ ===")
    print(f"Total créées: {total_created}")
    print(f"Total existantes: {total_updated}")
    print(f"Sous-catégories totales: {SousCategorie.objects.count()}")

if __name__ == '__main__':
    populate_sous_categories()
