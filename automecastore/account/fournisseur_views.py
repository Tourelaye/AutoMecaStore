"""
Views pour l'espace fournisseur
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions, parsers
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import timedelta
import logging

from .models import Utilisateur, FournisseurProfile, JournalActivite
from .serializers import (
    RegisterFournisseurSerializer,
    FournisseurProfileSerializer,
    FournisseurUpdateSerializer,
    JournalActiviteSerializer
)
from .permissions import IsFournisseur, IsFournisseurActif
from catalog.models import Produit, Categorie, TypePiece
from catalog.serializers import ProduitSerializer as CatalogProduitSerializer
from orders.models import Commande, LigneCommande

logger = logging.getLogger(__name__)


def journaliser(utilisateur, categorie, action, description, request=None):
    """Fonction utilitaire pour ajouter une entrée au journal"""
    ip = None
    if request:
        ip = request.META.get('REMOTE_ADDR')
    JournalActivite.objects.create(
        utilisateur=utilisateur,
        categorie=categorie,
        action=action,
        description=description,
        ip_address=ip
    )


# ==============================
# INSCRIPTION FOURNISSEUR
# ==============================

class RegisterFournisseurView(APIView):
    """Inscription d'un nouveau fournisseur"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterFournisseurSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            logger.info(f"Nouveau fournisseur inscrit: {user.email}")
            
            # Journaliser
            journaliser(
                user, 'vendeurs', 'creation',
                f"Nouveau fournisseur inscrit: {user.nom} {user.prenom} ({user.email})",
                request
            )
            
            return Response({
                'message': 'Inscription réussie. Votre compte est en attente de validation par un administrateur.',
                'user_id': user.id
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==============================
# PROFIL FOURNISSEUR
# ==============================

class FournisseurProfileView(APIView):
    """Gestion du profil du fournisseur connecté"""
    permission_classes = [IsFournisseur]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get(self, request):
        try:
            profile = request.user.fournisseur_profile
            serializer = FournisseurProfileSerializer(profile)
            return Response(serializer.data)
        except FournisseurProfile.DoesNotExist:
            return Response({'error': 'Profil fournisseur non trouvé'}, status=404)

    def patch(self, request):
        try:
            profile = request.user.fournisseur_profile
            serializer = FournisseurUpdateSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                
                # Journaliser
                journaliser(
                    request.user, 'vendeurs', 'modification',
                    f"Le fournisseur {request.user.email} a mis à jour son profil",
                    request
                )
                
                return Response(FournisseurProfileSerializer(profile).data)
            return Response(serializer.errors, status=400)
        except FournisseurProfile.DoesNotExist:
            return Response({'error': 'Profil fournisseur non trouvé'}, status=404)


# ==============================
# PRODUITS DU FOURNISSEUR
# ==============================

class FournisseurProduitsView(APIView):
    """Gestion des produits du fournisseur connecté"""
    permission_classes = [IsFournisseurActif]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get(self, request):
        """Liste des produits du fournisseur"""
        produits = Produit.objects.filter(
            Q(fournisseurproduit__fournisseur__user=request.user) | 
            Q(est_vedette=False)  # Fallback: tous les produits si pas de lien
        ).distinct()
        
        # Si le fournisseur a un profil avec des produits liés
        try:
            profile = request.user.fournisseur_profile
            # Chercher les produits via FournisseurProduit
            from catalog.models import FournisseurProduit
            fp_ids = FournisseurProduit.objects.filter(
                fournisseur__user=request.user
            ).values_list('produit_id', flat=True)
            if fp_ids.exists():
                produits = Produit.objects.filter(id__in=fp_ids)
        except:
            pass
        
        serializer = CatalogProduitSerializer(produits, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        """Créer un nouveau produit (en attente de validation)"""
        from catalog.serializers import ProduitSerializer
        
        data = request.data.copy()
        # Marquer comme en attente de validation
        data['is_active'] = False  # Sera activé après validation admin
        
        serializer = CatalogProduitSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            produit = serializer.save()
            
            # Journaliser
            journaliser(
                request.user, 'produits', 'creation',
                f"Nouveau produit ajouté par {request.user.email}: {produit.nom}",
                request
            )
            
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class FournisseurProduitDetailView(APIView):
    """Détail et modification d'un produit du fournisseur"""
    permission_classes = [IsFournisseurActif]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get_object(self, pk):
        try:
            return Produit.objects.get(pk=pk)
        except Produit.DoesNotExist:
            return None

    def get(self, request, pk):
        produit = self.get_object(pk)
        if not produit:
            return Response({'error': 'Produit non trouvé'}, status=404)
        serializer = CatalogProduitSerializer(produit, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, pk):
        produit = self.get_object(pk)
        if not produit:
            return Response({'error': 'Produit non trouvé'}, status=404)
        
        from catalog.serializers import ProduitSerializer
        serializer = ProduitSerializer(produit, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            
            # Journaliser
            journaliser(
                request.user, 'produits', 'modification',
                f"Produit modifié par {request.user.email}: {produit.nom}",
                request
            )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        produit = self.get_object(pk)
        if not produit:
            return Response({'error': 'Produit non trouvé'}, status=404)
        
        nom_produit = produit.nom
        produit.soft_delete()
        
        # Journaliser
        journaliser(
            request.user, 'produits', 'suppression',
            f"Produit supprimé par {request.user.email}: {nom_produit}",
            request
        )
        
        return Response({'message': 'Produit supprimé avec succès'})


# ==============================
# COMMANDES DU FOURNISSEUR
# ==============================

class FournisseurCommandesView(APIView):
    """Liste des commandes contenant les produits du fournisseur"""
    permission_classes = [IsFournisseurActif]

    def get(self, request):
        # Récupérer les commandes qui contiennent des produits du fournisseur
        from catalog.models import FournisseurProduit
        
        try:
            # Produits liés à ce fournisseur
            produit_ids = FournisseurProduit.objects.filter(
                fournisseur__user=request.user
            ).values_list('produit_id', flat=True)
            
            if produit_ids.exists():
                # Commandes contenant ces produits
                commande_ids = LigneCommande.objects.filter(
                    produit_id__in=produit_ids
                ).values_list('commande_id', flat=True).distinct()
                
                commandes = Commande.objects.filter(id__in=commande_ids).order_by('-date_commande')
            else:
                commandes = Commande.objects.none()
        except:
            commandes = Commande.objects.none()
        
        # Sérialiser
        from orders.serializers import CommandeSerializer
        serializer = CommandeSerializer(commandes, many=True)
        return Response(serializer.data)


class FournisseurCommandeDetailView(APIView):
    """Détail d'une commande pour le fournisseur"""
    permission_classes = [IsFournisseurActif]

    def get(self, request, pk):
        try:
            commande = Commande.objects.get(pk=pk)
            from orders.serializers import CommandeSerializer
            serializer = CommandeSerializer(commande)
            return Response(serializer.data)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande non trouvée'}, status=404)


# ==============================
# STATISTIQUES FOURNISSEUR
# ==============================

class FournisseurStatsView(APIView):
    """Statistiques pour le dashboard du fournisseur"""
    permission_classes = [IsFournisseurActif]

    def get(self, request):
        try:
            profile = request.user.fournisseur_profile
            from catalog.models import FournisseurProduit
            
            # Produits du fournisseur
            produit_ids = FournisseurProduit.objects.filter(
                fournisseur__user=request.user
            ).values_list('produit_id', flat=True)
            
            produits = Produit.objects.filter(id__in=produit_ids) if produit_ids.exists() else Produit.objects.none()
            
            total_produits = produits.count()
            produits_actifs = produits.filter(is_active=True).count()
            stock_faible = produits.filter(stock__lte=5, is_active=True).count()
            rupture = produits.filter(stock=0, is_active=True).count()
            
            # Commandes
            commande_ids = LigneCommande.objects.filter(
                produit_id__in=produit_ids
            ).values_list('commande_id', flat=True).distinct() if produit_ids.exists() else []
            
            commandes_mois = Commande.objects.filter(
                id__in=commande_ids,
                date_commande__gte=timezone.now() - timedelta(days=30)
            ).count()
            
            commandes_en_attente = Commande.objects.filter(
                id__in=commande_ids,
                statut='en_attente'
            ).count()
            
            # Chiffre d'affaires
            ca = LigneCommande.objects.filter(
                produit_id__in=produit_ids
            ).aggregate(total=Sum('sous_total'))['total'] or 0
            
            # Ventes totales
            ventes = LigneCommande.objects.filter(
                produit_id__in=produit_ids
            ).aggregate(total=Sum('quantite'))['total'] or 0
            
            return Response({
                'totalProduits': total_produits,
                'produitsActifs': produits_actifs,
                'stockFaible': stock_faible,
                'rupture': rupture,
                'commandesMois': commandes_mois,
                'commandesEnAttente': commandes_en_attente,
                'chiffreAffaires': float(ca),
                'produitsVendus': ventes,
                'tauxActifs': round((produits_actifs / total_produits * 100) if total_produits > 0 else 0, 1)
            })
        except Exception as e:
            logger.error(f"Erreur stats fournisseur: {str(e)}")
            return Response({'error': 'Erreur lors du calcul des statistiques'}, status=500)


# ==============================
# STOCKS FOURNISSEUR
# ==============================

class FournisseurStocksView(APIView):
    """Gestion des stocks pour le fournisseur"""
    permission_classes = [IsFournisseurActif]

    def get(self, request):
        from catalog.models import FournisseurProduit
        
        produit_ids = FournisseurProduit.objects.filter(
            fournisseur__user=request.user
        ).values_list('produit_id', flat=True)
        
        produits = Produit.objects.filter(id__in=produit_ids) if produit_ids.exists() else Produit.objects.none()
        
        stocks_data = []
        for p in produits:
            stocks_data.append({
                'id': p.id,
                'nom': p.nom,
                'reference': p.reference or '',
                'stock': p.stock,
                'prix': float(p.prix),
                'statut': 'rupture' if p.stock == 0 else ('faible' if p.stock <= 5 else 'ok'),
                'image': p.image.url if p.image else None
            })
        
        return Response(stocks_data)

    def patch(self, request, pk):
        """Mettre à jour le stock d'un produit"""
        try:
            produit = Produit.objects.get(pk=pk)
            nouvelle_quantite = request.data.get('stock')
            if nouvelle_quantite is None:
                return Response({'error': 'Quantité requise'}, status=400)
            
            produit.stock = int(nouvelle_quantite)
            produit.save()
            
            # Journaliser
            journaliser(
                request.user, 'produits', 'modification',
                f"Stock mis à jour par {request.user.email}: {produit.nom} → {produit.stock} unités",
                request
            )
            
            return Response({'message': 'Stock mis à jour', 'stock': produit.stock})
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


# ==============================
# PROMOTIONS FOURNISSEUR
# ==============================

class FournisseurPromotionsView(APIView):
    """Gestion des promotions pour le fournisseur"""
    permission_classes = [IsFournisseurActif]

    def get(self, request):
        from catalog.models import FournisseurProduit
        
        produit_ids = FournisseurProduit.objects.filter(
            fournisseur__user=request.user
        ).values_list('produit_id', flat=True)
        
        produits = Produit.objects.filter(
            id__in=produit_ids,
            est_en_promo=True
        ) if produit_ids.exists() else Produit.objects.none()
        
        promotions = []
        for p in produits:
            promotions.append({
                'id': p.id,
                'nom': p.nom,
                'prix_normal': float(p.prix),
                'prix_promo': float(p.prix_promo) if p.prix_promo else None,
                'reduction': p.pourcentage_reduction,
                'date_debut': p.date_debut_promo,
                'date_fin': p.date_fin_promo,
                'active': p.est_en_promo
            })
        
        return Response(promotions)

    def post(self, request):
        """Ajouter/Modifier une promotion"""
        produit_id = request.data.get('produit_id')
        if not produit_id:
            return Response({'error': 'produit_id requis'}, status=400)
        
        try:
            produit = Produit.objects.get(pk=produit_id)
            produit.est_en_promo = True
            produit.prix_promo = request.data.get('prix_promo')
            produit.pourcentage_reduction = request.data.get('pourcentage_reduction')
            produit.date_debut_promo = request.data.get('date_debut')
            produit.date_fin_promo = request.data.get('date_fin')
            produit.save()
            
            # Journaliser
            journaliser(
                request.user, 'produits', 'modification',
                f"Promotion ajoutée par {request.user.email} sur {produit.nom}",
                request
            )
            
            return Response({'message': 'Promotion ajoutée avec succès'})
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)

    def delete(self, request, pk):
        """Supprimer une promotion"""
        try:
            produit = Produit.objects.get(pk=pk)
            produit.est_en_promo = False
            produit.prix_promo = None
            produit.pourcentage_reduction = None
            produit.date_debut_promo = None
            produit.date_fin_promo = None
            produit.save()
            
            return Response({'message': 'Promotion supprimée'})
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


# ==============================
# VENTES FOURNISSEUR
# ==============================

class FournisseurVentesView(APIView):
    """Historique des ventes du fournisseur"""
    permission_classes = [IsFournisseurActif]

    def get(self, request):
        from catalog.models import FournisseurProduit
        
        produit_ids = FournisseurProduit.objects.filter(
            fournisseur__user=request.user
        ).values_list('produit_id', flat=True)
        
        lignes = LigneCommande.objects.filter(
            produit_id__in=produit_ids
        ).select_related('commande', 'produit').order_by('-commande__date_commande') if produit_ids.exists() else []
        
        ventes = []
        for ligne in lignes:
            ventes.append({
                'id': ligne.id,
                'commande_ref': ligne.commande.reference,
                'produit_nom': ligne.produit.nom,
                'quantite': ligne.quantite,
                'prix_unitaire': float(ligne.prix_unitaire),
                'total': float(ligne.sous_total or 0),
                'date': ligne.commande.date_commande,
                'statut': ligne.commande.statut
            })
        
        return Response(ventes)