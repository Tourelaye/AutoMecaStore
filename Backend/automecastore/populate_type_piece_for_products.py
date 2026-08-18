"""
Script pour peupler le champ type_piece des produits existants
basé sur leur catégorie et le nom du produit
"""

from catalog.models import Produit, TypePiece, Categorie

def populate_type_pieces():
    print("=== Peuplement des type_piece pour les produits existants ===\n")
    
    # Mapping des catégories vers leurs types de pièces correspondants
    category_type_mapping = {
        'Automobile': ['Freinage', 'Moteur', 'Filtration', 'Suspension', 'Transmission', 'Éclairage'],
        'Moto & Scooter': ['Freinage Moto', 'Kit Chaîne', 'Carénage', 'Échappement'],
        'Poids Lourds': ['Freinage', 'Transmission', 'Pneumatiques', 'Éclairage'],
        'Velo & E-bike': ['Freinage', 'Transmission', 'Roues', 'Éclairage'],
    }
    
    # Récupérer toutes les catégories
    categories = Categorie.objects.all()
    print(f"Catégories trouvées: {list(categories.values_list('nom', flat=True))}\n")
    
    # Récupérer tous les types de pièces
    type_pieces = TypePiece.objects.all()
    print(f"Types de pièces trouvés: {list(type_pieces.values_list('nom', flat=True))}\n")
    
    # Pour chaque produit sans type_piece
    products_without_type = Produit.objects.filter(type_piece__isnull=True)
    print(f"Produits sans type_piece: {products_without_type.count()}\n")
    
    updated_count = 0
    for produit in products_without_type:
        categorie_nom = produit.categorie.nom if produit.categorie else None
        
        if categorie_nom and categorie_nom in category_type_mapping:
            # Choisir un type de pièce aléatoire parmi ceux disponibles pour cette catégorie
            available_types = category_type_mapping[categorie_nom]
            
            # Essayer de trouver un type de pièce correspondant dans la base
            matching_type = TypePiece.objects.filter(
                categorie=produit.categorie,
                nom__in=available_types
            ).first()
            
            if matching_type:
                produit.type_piece = matching_type
                produit.save()
                updated_count += 1
                print(f" Produit '{produit.nom}' -> TypePiece: {matching_type.nom} (Catégorie: {categorie_nom})")
            else:
                print(f" Produit '{produit.nom}' -> Aucun TypePiece trouvé pour la catégorie {categorie_nom}")
        else:
            print(f" Produit '{produit.nom}' -> Catégorie non reconnue ou None: {categorie_nom}")
    
    print(f"\n=== Résumé ===")
    print(f"Produits mis à jour: {updated_count}/{products_without_type.count()}")

if __name__ == '__main__':
    populate_type_pieces()
