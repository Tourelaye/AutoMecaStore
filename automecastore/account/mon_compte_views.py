# ==============================
# VIEWS POUR LA PAGE "MON COMPTE"
# ==============================

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from .models import Utilisateur, Client
from orders.models import Commande, LigneCommande
from catalog.models import Produit
from .permissions import IsClient

class MeView(APIView):
    """
    Retourne les informations de l'utilisateur connecté
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            user = request.user
            client = Client.objects.get(user=user)
            
            return Response({
                'id': user.id,
                'email': user.email,
                'nom': user.nom,
                'prenom': user.prenom,
                'telephone': user.telephone,
                'adresse': user.adresse,
                'role': user.role,
                'date_inscription': client.date_inscription,
                'point_fidelite': client.point_fidelite,
                'mode_paiement_favoris': client.mode_paiement_favoris,
                'is_active': user.is_active
            })
        except Client.DoesNotExist:
            return Response(
                {'error': 'Profil client non trouvé'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class MesCommandesView(APIView):
    """
    Retourne les commandes du client connecté
    """
    permission_classes = [IsClient]
    
    def get(self, request):
        try:
            client = Client.objects.get(user=request.user)
            commandes = Commande.objects.filter(client=client).select_related('client').order_by('-date_commande')
            
            # Serializer custom pour les commandes
            commandes_data = []
            for commande in commandes:
                lignes = LigneCommande.objects.filter(commande=commande).select_related('produit')
                commandes_data.append({
                    'id': commande.id,
                    'reference': commande.reference,
                    'date_commande': commande.date_commande,
                    'montant_total': float(commande.montant_total),
                    'statut': commande.statut,
                    'nombre_produits': lignes.count(),
                    'lignes': [
                        {
                            'produit_nom': ligne.produit.nom,
                            'quantite': ligne.quantite,
                            'prix_unitaire': float(ligne.prix_unitaire),
                            'sous_total': float(ligne.sous_total)
                        }
                        for ligne in lignes
                    ]
                })
            
            return Response({
                'commandes': commandes_data,
                'total': len(commandes_data)
            })
            
        except Client.DoesNotExist:
            return Response(
                {'error': 'Profil client non trouvé'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class FavorisView(APIView):
    """
    Gestion des favoris du client connecté
    """
    permission_classes = [IsClient]
    
    def get(self, request):
        """Retourne les favoris du client"""
        try:
            client = Client.objects.get(user=request.user)
            
            # Pour l'instant, simulons des favoris (à implémenter avec un modèle Favori)
            favoris_data = [
                {
                    'id': 1,
                    'produit_nom': 'Pneu Michelin Pilot Sport 4',
                    'prix': 250000,
                    'image': '/images/products/tyre1.jpg',
                    'date_ajout': '2024-01-15T10:30:00Z'
                },
                {
                    'id': 2,
                    'produit_nom': 'Huile Moteur 5W-30',
                    'prix': 15000,
                    'image': '/images/products/oil1.jpg',
                    'date_ajout': '2024-01-20T14:15:00Z'
                }
            ]
            
            return Response({
                'favoris': favoris_data,
                'total': len(favoris_data)
            })
            
        except Client.DoesNotExist:
            return Response(
                {'error': 'Profil client non trouvé'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def post(self, request):
        """Ajoute un produit aux favoris"""
        produit_id = request.data.get('produit_id')
        
        if not produit_id:
            return Response(
                {'error': 'produit_id requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            produit = Produit.objects.get(id=produit_id)
            # TODO: Implémenter la logique d'ajout aux favoris
            return Response({
                'message': 'Produit ajouté aux favoris',
                'produit_id': produit_id
            })
        except Produit.DoesNotExist:
            return Response(
                {'error': 'Produit non trouvé'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request):
        """Retire un produit des favoris"""
        produit_id = request.data.get('produit_id')
        
        if not produit_id:
            return Response(
                {'error': 'produit_id requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TODO: Implémenter la logique de retrait des favoris
        return Response({
            'message': 'Produit retiré des favoris',
            'produit_id': produit_id
        })
