from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import IntegrityError
from django.db.models import Q
from django.utils import timezone
import logging

from .models import Categorie, Produit, ProduitFavoris, TypePiece, Livraison
from .serializers import CategorieSerializer, ProduitSerializer, ProduitFavorisSerializer, TypePieceSerializer, LivraisonSerializer
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
# TypePiece (Sous-catégorie)
# -----------------------------
class TypePieceListCreateView(generics.ListCreateAPIView):
    """
    Liste les types de pièces ou crée un nouveau type de pièce.
    GET: Peut filtrer par catégorie avec le paramètre ?categorie=<id>
    POST: Crée un nouveau type de pièce (admin uniquement)
    """
    serializer_class = TypePieceSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        """Retourne les types de pièces, filtrables par catégorie"""
        queryset = TypePiece.objects.all()

        # Filtrer par catégorie si le paramètre est fourni
        categorie_id = self.request.query_params.get('categorie')
        if categorie_id:
            print(f"Catégorie reçue : {categorie_id}")
            queryset = queryset.filter(categorie_id=categorie_id)
            print(f"Types trouvés : {queryset.count()}")

        return queryset


class TypePieceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TypePiece.objects.all()
    serializer_class = TypePieceSerializer

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

    def get_serializer(self, *args, **kwargs):
        """Passer le contexte de la requête au serializer pour générer les URLs absolues"""
        serializer = super().get_serializer(*args, **kwargs)
        if not serializer.context.get('request'):
            serializer.context['request'] = self.request
        return serializer

    def get_queryset(self):
        """Retourne uniquement les produits actifs (y compris ceux avec is_active=NULL)"""
        from django.db.models import Q
        queryset = Produit.objects.filter(Q(is_active=True) | Q(is_active__isnull=True))
        
        # Filtrer par catégorie si le paramètre est fourni
        categorie_id = self.request.query_params.get('categorie')
        if categorie_id:
            queryset = queryset.filter(categorie_id=categorie_id)
        
        # Filtrer par type de pièce si le paramètre est fourni
        type_piece_id = self.request.query_params.get('type_piece')
        if type_piece_id:
            queryset = queryset.filter(type_piece_id=type_piece_id)
        
        # Filtrer par recherche si le paramètre est fourni
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(nom__icontains=search) |
                Q(description__icontains=search) |
                Q(reference__icontains=search) |
                Q(marque__icontains=search)
            )
        
        return queryset

    def create(self, request, *args, **kwargs):
        """Création d'un produit avec gestion d'erreurs"""
        try:
            logger.info(f"Création d'un nouveau produit: {request.data.get('nom', 'N/A')}")
            
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            
            logger.info(f"Produit créé avec succès: ID {serializer.instance.id}")
            
            # Retourner le produit directement pour compatibilité avec le frontend
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
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

            serializer = ProduitSerializer(produit, context={'request': request})
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

            serializer = ProduitSerializer(produit, data=request.data, partial=partial, context={'request': request})
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


# -----------------------------
# Livraison
# -----------------------------
class LivraisonListCreateView(generics.ListCreateAPIView):
    """
    Liste les livraisons ou crée une nouvelle livraison.
    GET: Retourne toutes les livraisons
         Peut filtrer par statut avec le paramètre ?statut=<statut>
         Peut rechercher avec le paramètre ?search=<query>
    POST: Crée une nouvelle livraison
    """
    serializer_class = LivraisonSerializer
    permission_classes = [permissions.AllowAny]  # Temporairement ouvert

    def get_queryset(self):
        """Retourne les livraisons avec filtres optionnels"""
        queryset = Livraison.objects.all()

        # Filtrer par statut si le paramètre est fourni
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)

        # Filtrer par recherche si le paramètre est fourni
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(commande_id__icontains=search) |
                Q(client__icontains=search) |
                Q(adresse__icontains=search) |
                Q(transporteur__icontains=search)
            )

        return queryset

    def get_serializer(self, *args, **kwargs):
        """Passer le contexte de la requête au serializer"""
        serializer = super().get_serializer(*args, **kwargs)
        if not serializer.context.get('request'):
            serializer.context['request'] = self.request
        return serializer


class LivraisonDetailView(APIView):
    """
    Gestion d'une livraison spécifique (GET, PUT, PATCH, DELETE)
    """
    permission_classes = [permissions.AllowAny]  # Temporairement ouvert

    def get_object(self, pk):
        """Récupère une livraison par son ID"""
        try:
            return Livraison.objects.get(pk=pk)
        except Livraison.DoesNotExist:
            return None

    def get(self, request, pk):
        """Récupérer une livraison"""
        livraison = self.get_object(pk)
        if not livraison:
            return Response({
                'success': False,
                'message': 'Livraison introuvable'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = LivraisonSerializer(livraison, context={'request': request})
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    def put(self, request, pk):
        """Mise à jour complète d'une livraison"""
        return self._update_livraison(request, pk, partial=False)

    def patch(self, request, pk):
        """Mise à jour partielle d'une livraison"""
        return self._update_livraison(request, pk, partial=True)

    def _update_livraison(self, request, pk, partial=False):
        """Logique commune pour PUT et PATCH"""
        livraison = self.get_object(pk)
        if not livraison:
            return Response({
                'success': False,
                'message': 'Livraison introuvable'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = LivraisonSerializer(livraison, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Livraison mise à jour avec succès',
                'data': serializer.data
            }, status=status.HTTP_200_OK)

        return Response({
            'success': False,
            'message': 'Données invalides',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Supprimer une livraison"""
        livraison = self.get_object(pk)
        if not livraison:
            return Response({
                'success': False,
                'message': 'Livraison introuvable'
            }, status=status.HTTP_404_NOT_FOUND)

        livraison.delete()
        return Response({
            'success': True,
            'message': 'Livraison supprimée avec succès'
        }, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)


# -----------------------------
# Page d'accueil - Sections dynamiques
# -----------------------------
class HomeCategoriesView(APIView):
    """
    Retourne les catégories avec le nombre de produits pour la page d'accueil
    GET /api/home/categories/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Retourne toutes les catégories avec leur nombre de produits actifs"""
        try:
            categories = Categorie.objects.all()
            serializer = CategorieSerializer(categories, many=True)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur récupération catégories home: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des catégories'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HomeFlashSalesView(APIView):
    """
    Retourne les produits en vente flash pour la page d'accueil
    GET /api/home/flash-sales/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Retourne les produits en promotion actifs"""
        try:
            now = timezone.now()
            from django.db.models import Q

            # Produits en promo avec date de fin dans le futur ou null
            queryset = Produit.objects.filter(
                Q(is_active=True) | Q(is_active__isnull=True),
                est_en_promo=True
            ).filter(
                Q(date_fin_promo__isnull=True) | Q(date_fin_promo__gt=now)
            ).filter(
                Q(date_debut_promo__isnull=True) | Q(date_debut_promo__lte=now)
            )

            serializer = ProduitSerializer(queryset, many=True, context={'request': request})
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur récupération ventes flash: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des ventes flash'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HomeBestSellersView(APIView):
    """
    Retourne les produits les plus vendus pour la page d'accueil
    GET /api/home/bestsellers/?limit=10
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Retourne les produits triés par nombre de ventes"""
        try:
            from django.db.models import Q
            limit = int(request.query_params.get('limit', 10))

            queryset = Produit.objects.filter(
                Q(is_active=True) | Q(is_active__isnull=True)
            ).order_by('-nombre_ventes')[:limit]

            serializer = ProduitSerializer(queryset, many=True, context={'request': request})
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur récupération bestsellers: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des bestsellers'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HomeTrendingView(APIView):
    """
    Retourne les produits tendance pour la page d'accueil
    GET /api/home/trending/?limit=10
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Retourne les produits tendance (triés par vues ou flag tendance)"""
        try:
            from django.db.models import Q
            limit = int(request.query_params.get('limit', 10))

            # Priorité aux produits marqués tendance, sinon triés par vues
            queryset = Produit.objects.filter(
                Q(is_active=True) | Q(is_active__isnull=True)
            ).order_by('-est_tendance', '-nombre_vues')[:limit]

            serializer = ProduitSerializer(queryset, many=True, context={'request': request})
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur récupération trending: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des produits tendance'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HomeFlashDealsView(APIView):
    """
    Retourne les produits en vente éclair (vente limitée dans le temps par heure)
    GET /api/home/flash-deals/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Retourne les produits en vente éclair actifs (heure actuelle dans la plage)"""
        try:
            from django.db.models import Q
            now = timezone.now()
            current_time = now.time()

            # Produits en vente éclair avec heure actuelle dans la plage
            queryset = Produit.objects.filter(
                Q(is_active=True) | Q(is_active__isnull=True),
                vente_eclair=True
            ).filter(
                Q(heure_debut_eclair__isnull=True) | Q(heure_debut_eclair__lte=current_time)
            ).filter(
                Q(heure_fin_eclair__isnull=True) | Q(heure_fin_eclair__gt=current_time)
            )

            serializer = ProduitSerializer(queryset, many=True, context={'request': request})
            return Response({
                'success': True,
                'data': serializer.data,
                'current_time': current_time.strftime('%H:%M')
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur récupération flash deals: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des ventes éclair'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HomeFeaturedView(APIView):
    """
    Retourne les produits vedettes pour la page d'accueil
    GET /api/home/featured/?limit=10
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Retourne les produits marqués comme vedettes"""
        try:
            from django.db.models import Q
            limit = int(request.query_params.get('limit', 10))

            queryset = Produit.objects.filter(
                Q(is_active=True) | Q(is_active__isnull=True),
                est_vedette=True
            )[:limit]

            serializer = ProduitSerializer(queryset, many=True, context={'request': request})
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur récupération featured: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des produits vedettes'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HomeRecommendedView(APIView):
    """
    Retourne les produits recommandés pour la page d'accueil
    GET /api/home/recommended/?limit=10
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Retourne les produits marqués comme recommandés"""
        try:
            from django.db.models import Q
            limit = int(request.query_params.get('limit', 10))

            queryset = Produit.objects.filter(
                Q(is_active=True) | Q(is_active__isnull=True),
                est_recommande=True
            )[:limit]

            serializer = ProduitSerializer(queryset, many=True, context={'request': request})
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur récupération recommended: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des produits recommandés'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class IncrementProductViewsView(APIView):
    """
    Incrémente le compteur de vues d'un produit
    POST /api/produits/{id}/increment-views/
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        """Incrémente le nombre de vues du produit"""
        try:
            produit = Produit.objects.filter(pk=pk).first()
            if not produit:
                return Response({
                    'success': False,
                    'message': 'Produit introuvable'
                }, status=status.HTTP_404_NOT_FOUND)

            produit.nombre_vues += 1
            produit.save(update_fields=['nombre_vues'])

            return Response({
                'success': True,
                'data': {'nombre_vues': produit.nombre_vues}
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur incrémentation vues produit {pk}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de l\'incrémentation des vues'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HomePopularSearchesView(APIView):
    """
    Retourne les recherches populaires basées sur les produits les plus vus
    GET /api/home/popular-searches/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Retourne les termes de recherche populaires"""
        try:
            # Récupérer les produits les plus vus pour générer des recherches populaires
            top_products = Produit.objects.filter(
                is_active=True
            ).order_by('-nombre_vues')[:8]

            # Générer des recherches basées sur les noms et catégories des produits populaires
            searches = []
            categories_seen = set()
            
            for produit in top_products:
                # Extraire des termes de recherche du nom du produit
                nom_lower = produit.nom.lower()
                categorie_nom = produit.categorie.nom if produit.categorie else 'Pièces'
                
                # Déterminer si c'est trending (basé sur les vues)
                trending = produit.nombre_vues > 50
                
                # Déterminer l'icône selon la catégorie
                icon_map = {
                    'frein': 'bi-stop-circle-fill',
                    'batterie': 'bi-lightning-fill',
                    'filtre': 'bi-wind',
                    'pneu': 'bi-circle-fill',
                    'amortisseur': 'bi-arrows-collapse',
                    'essuie': 'bi-moisture',
                    'embrayage': 'bi-gear-wide-connected',
                    'courroie': 'bi-link-45deg',
                    'huile': 'bi-droplet-fill',
                    'allumage': 'bi-lightning-charge-fill',
                }
                
                icon = 'bi-search'
                for key, value in icon_map.items():
                    if key in nom_lower:
                        icon = value
                        break
                
                # Couleur selon la catégorie
                color_map = {
                    'Freinage': '#ef4444',
                    'Électrique': '#f59e0b',
                    'Filtration': '#3b82f6',
                    'Pneumatiques': '#10b981',
                    'Suspension': '#8b5cf6',
                    'Visibilité': '#06b6d4',
                    'Transmission': '#f97316',
                    'Moteur': '#d32f2f',
                }
                color = color_map.get(categorie_nom, '#6b7280')
                
                # Tag et couleur de tag
                tag = None
                tag_color = None
                if produit.est_tendance:
                    tag = 'Trending'
                    tag_color = '#f59e0b'
                elif produit.est_bestseller:
                    tag = 'Populaire'
                    tag_color = '#ef4444'
                elif produit.nombre_vues > 100:
                    tag = 'Top'
                    tag_color = '#10b981'
                
                # Compte de vues formaté
                count = f"{produit.nombre_vues}K" if produit.nombre_vues >= 1000 else str(produit.nombre_vues)
                
                searches.append({
                    'label': produit.nom,
                    'icon': icon,
                    'categorie': categorie_nom,
                    'trending': trending,
                    'count': count,
                    'color': color,
                    'tag': tag,
                    'tag_color': tag_color,
                    'route': f'/produits?search={produit.nom}'
                })
                
                categories_seen.add(categorie_nom)
            
            # Générer les tendances de catégories
            tendances = list(categories_seen)[:4]
            
            return Response({
                'success': True,
                'data': {
                    'searches': searches,
                    'trends': [{'label': cat, 'route': f'/produits?category={cat.lower()}'} for cat in tendances]
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur récupération recherches populaires: {str(e)}")
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des recherches populaires'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)