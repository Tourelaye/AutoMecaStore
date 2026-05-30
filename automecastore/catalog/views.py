from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import IntegrityError
from django.utils import timezone
import logging

from .models import Categorie, Produit, ProduitFavoris
from .serializers import CategorieSerializer, ProduitSerializer, ProduitFavorisSerializer
from account.permissions import IsAdmin
from orders.models import LigneCommande, PanierItem
from rest_framework import parsers
# Configuration du logger
logger = logging.getLogger(__name__)


# -----------------------------
# Categorie
# -----------------------------
class CategorieListCreateView(generics.ListCreateAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.AllowAny()]


class CategorieDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdmin()]
        return [permissions.AllowAny()]


# -----------------------------
# Produit - Vues personnalisées avec Soft Delete
# -----------------------------

class ProduitListCreateView(generics.ListCreateAPIView):
    """
    Liste les produits actifs ou crée un nouveau produit.
    GET: Retourne uniquement les produits actifs (y compris ceux avec is_active=NULL)
          Peut filtrer par catégorie avec le paramètre ?categorie=<id>
    POST: Crée un nouveau produit (supporte multipart/form-data pour les images)
    """
    serializer_class = ProduitSerializer
    permission_classes = [permissions.AllowAny]  # Temporairement ouvert
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        """Retourne uniquement les produits actifs (y compris ceux avec is_active=NULL)"""
        from django.db.models import Q
        queryset = Produit.objects.filter(Q(is_active=True) | Q(is_active__isnull=True))
        
        # Filtrer par catégorie si le paramètre est fourni
        categorie_id = self.request.query_params.get('categorie')
        if categorie_id:
            queryset = queryset.filter(categorie_id=categorie_id)
        
        return queryset

    def create(self, request, *args, **kwargs):
        """Création d'un produit avec gestion d'erreurs"""
        try:
            logger.info(f"Création d'un nouveau produit: {request.data.get('nom', 'N/A')}")
            
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            
            logger.info(f"Produit créé avec succès: ID {serializer.instance.id}")
            
            return Response({
                'success': True,
                'message': 'Produit créé avec succès',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except serializers.ValidationError as e:
            logger.warning(f"Validation échouée: {e}")
            return Response({
                'success': False,
                'message': 'Données invalides',
                'errors': e.detail
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Erreur lors de la création: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur interne lors de la création du produit'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProduitDetailView(APIView):
    """
    Gestion d'un produit spécifique (GET, PUT, PATCH, DELETE)
    Implémente le SOFT DELETE pour la suppression
    Supporte multipart/form-data pour les uploads d'images
    """
    permission_classes = [permissions.AllowAny]  # Temporairement ouvert
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get_object(self, pk):
        """Récupère un produit par son ID"""
        try:
            # Utilise all_objects pour permettre la récupération même si supprimé
            return Produit.all_objects.get(pk=pk)
        except Produit.DoesNotExist:
            return None

    def get(self, request, pk):
        """Récupérer un produit"""
        try:
            produit = self.get_object(pk)
            if not produit:
                return Response({
                    'success': False,
                    'message': 'Produit introuvable'
                }, status=status.HTTP_404_NOT_FOUND)

            # Vérifier si le produit est actif (NULL ou True = actif)
            if produit.is_active is False:  # Seulement False = supprimé
                return Response({
                    'success': False,
                    'message': 'Ce produit a été supprimé'
                }, status=status.HTTP_404_NOT_FOUND)

            serializer = ProduitSerializer(produit)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erreur GET produit {pk}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération du produit'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, pk):
        """Mise à jour complète d'un produit"""
        return self._update_produit(request, pk, partial=False)

    def patch(self, request, pk):
        """Mise à jour partielle d'un produit"""
        return self._update_produit(request, pk, partial=True)

    def _update_produit(self, request, pk, partial=False):
        """Logique commune pour PUT et PATCH"""
        try:
            produit = self.get_object(pk)
            if not produit:
                return Response({
                    'success': False,
                    'message': 'Produit introuvable'
                }, status=status.HTTP_404_NOT_FOUND)

            # Vérifier si le produit est actif
            if produit.is_active not in [True, None]:
                return Response({
                    'success': False,
                    'message': 'Impossible de modifier un produit supprimé'
                }, status=status.HTTP_400_BAD_REQUEST)

            logger.info(f"Mise à jour produit {pk}: {request.data}")

            serializer = ProduitSerializer(produit, data=request.data, partial=partial)
            if serializer.is_valid():
                serializer.save()
                logger.info(f"Produit {pk} mis à jour avec succès")
                return Response({
                    'success': True,
                    'message': 'Produit mis à jour avec succès',
                    'data': serializer.data
                }, status=status.HTTP_200_OK)

            logger.warning(f"Validation échouée pour produit {pk}: {serializer.errors}")
            return Response({
                'success': False,
                'message': 'Données invalides',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Erreur PUT/PATCH produit {pk}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la mise à jour du produit'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, pk):
        """
        Suppression d'un produit avec SOFT DELETE
        Vérifie d'abord si le produit est utilisé dans des commandes ou paniers
        """
        try:
            produit = self.get_object(pk)
            if not produit:
                return Response({
                    'success': False,
                    'message': 'Produit introuvable'
                }, status=status.HTTP_404_NOT_FOUND)

            # Vérifier si le produit est déjà supprimé
            if produit.is_active is False:
                return Response({
                    'success': False,
                    'message': 'Ce produit est déjà supprimé'
                }, status=status.HTTP_400_BAD_REQUEST)

            logger.info(f"Tentative de suppression du produit {pk}: {produit.nom}")

            # === OPTION 1: SOFT DELETE (RECOMMANDÉ) ===
            # Désactiver le produit au lieu de le supprimer physiquement
            produit.soft_delete()
            
            logger.info(f"Produit {pk} désactivé avec succès (soft delete)")
            
            return Response({
                'success': True,
                'message': 'Produit supprimé avec succès',
                'data': {
                    'id': produit.id,
                    'nom': produit.nom,
                    'is_active': produit.is_active,
                    'date_suppression': produit.date_suppression
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erreur DELETE produit {pk}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la suppression du produit'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProduitRestaurerView(APIView):
    """
    Vue pour restaurer un produit supprimé (soft delete)
    POST /api/produits/{id}/restaurer/
    """
    permission_classes = [permissions.AllowAny]  # Temporairement ouvert

    def post(self, request, pk):
        """Restaurer un produit supprimé"""
        try:
            produit = Produit.all_objects.filter(pk=pk).first()
            
            if not produit:
                return Response({
                    'success': False,
                    'message': 'Produit introuvable'
                }, status=status.HTTP_404_NOT_FOUND)

            if produit.is_active:
                return Response({
                    'success': False,
                    'message': 'Ce produit est déjà actif'
                }, status=status.HTTP_400_BAD_REQUEST)

            produit.restore()
            logger.info(f"Produit {pk} restauré avec succès")

            serializer = ProduitSerializer(produit)
            return Response({
                'success': True,
                'message': 'Produit restauré avec succès',
                'data': serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erreur restauration produit {pk}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la restauration du produit'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProduitVerifierUtilisationView(APIView):
    """
    Vérifie si un produit est utilisé dans des commandes ou paniers
    GET /api/produits/{id}/verifier-utilisation/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        """Vérifier l'utilisation d'un produit"""
        try:
            produit = Produit.all_objects.filter(pk=pk).first()
            
            if not produit:
                return Response({
                    'success': False,
                    'message': 'Produit introuvable'
                }, status=status.HTTP_404_NOT_FOUND)

            # Compter les utilisations
            nb_lignes_commande = LigneCommande.objects.filter(produit=produit).count()
            nb_panier_items = PanierItem.objects.filter(produit=produit).count()
            nb_favoris = ProduitFavoris.objects.filter(produit=produit).count()

            est_utilise = nb_lignes_commande > 0 or nb_panier_items > 0

            return Response({
                'success': True,
                'data': {
                    'produit_id': pk,
                    'nom': produit.nom,
                    'est_utilise': est_utilise,
                    'details': {
                        'lignes_commande': nb_lignes_commande,
                        'panier_items': nb_panier_items,
                        'favoris': nb_favoris
                    }
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erreur vérification utilisation produit {pk}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la vérification'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -----------------------------
# ProduitFavoris
# -----------------------------
class ProduitFavorisListCreateView(generics.ListCreateAPIView):
    queryset = ProduitFavoris.objects.all()
    serializer_class = ProduitFavorisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)