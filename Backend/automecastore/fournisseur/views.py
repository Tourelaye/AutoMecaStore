from rest_framework import generics, permissions, status, parsers
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.core.cache import cache
from account.permissions import IsFournisseur
from .models import Transaction, HistoriqueActivite, Notification
from .serializers import TransactionSerializer, HistoriqueActiviteSerializer, NotificationSerializer, FournisseurSerializer
from catalog.models import Produit
from catalog.serializers import ProduitSerializer, PromotionSerializer
from support.models import Avis
from support.serializers import AvisSerializer
from orders.models import Commande
from orders.serializers import CommandeSerializer


def get_is_fournisseur():
    from account.permissions import IsFournisseur
    return IsFournisseur


def get_is_admin():
    from account.permissions import IsAdmin
    return IsAdmin


class TransactionListView(generics.ListAPIView):
    """
    Liste des transactions du fournisseur connecté
    """
    serializer_class = TransactionSerializer
    permission_classes = [IsFournisseur]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut_reversement']
    search_fields = ['reference_virement', 'commande__reference']
    ordering_fields = ['date_transaction', 'montant_brut']
    ordering = ['-date_transaction']

    def get_queryset(self):
        return Transaction.objects.filter(fournisseur=self.request.user.fournisseur)


class TransactionDetailView(generics.RetrieveAPIView):
    """
    Détail d'une transaction
    """
    serializer_class = TransactionSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        return Transaction.objects.filter(fournisseur=self.request.user.fournisseur)


class HistoriqueActiviteListView(generics.ListAPIView):
    """
    Liste des activités du fournisseur
    """
    serializer_class = HistoriqueActiviteSerializer
    permission_classes = [IsFournisseur]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type']
    search_fields = ['titre', 'detail']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return HistoriqueActivite.objects.filter(fournisseur=self.request.user.fournisseur)


class NotificationListView(generics.ListAPIView):
    """
    Liste des notifications du fournisseur
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsFournisseur]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['type', 'lu']
    ordering = ['-created_at']

    def get_queryset(self):
        return Notification.objects.filter(
            destinataire_id=self.request.user.id,
            destinataire_type='fournisseur'
        )


class NotificationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Détail, mise à jour (marquer comme lu) et suppression d'une notification
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        return Notification.objects.filter(
            destinataire_id=self.request.user.id,
            destinataire_type='fournisseur'
        )


class NotificationCountView(APIView):
    """
    Compteur de notifications non lues
    """
    permission_classes = [IsFournisseur]

    def get(self, request):
        count = Notification.objects.filter(
            destinataire_id=request.user.id,
            destinataire_type='fournisseur',
            lu=False
        ).count()
        return Response({'unread_count': count})


class NotificationMarkAllReadView(APIView):
    """
    Marquer toutes les notifications comme lues
    """
    permission_classes = [IsFournisseur]

    def post(self, request):
        count = Notification.objects.filter(
            destinataire_id=request.user.id,
            destinataire_type='fournisseur',
            lu=False
        ).update(lu=True)
        return Response({'marked_as_read': count})



class FournisseurProfileView(generics.RetrieveUpdateAPIView):
    """
    Profil du fournisseur connecté
    """
    serializer_class = FournisseurSerializer
    permission_classes = [IsFournisseur]

    def get_object(self):
        return self.request.user.fournisseur


# -----------------------------
# Fournisseur - Statistiques
# -----------------------------
class FournisseurStatsView(APIView):
    """
    Statistiques du fournisseur connecté
    """
    permission_classes = [IsFournisseur]

    def get(self, request):
        fournisseur = request.user.fournisseur
        produits = Produit.objects.filter(fournisseur=fournisseur)
        total_produits = produits.count()
        produits_actifs = produits.filter(is_active=True).count()
        ruptures = produits.filter(stock__lt=5).count()

        from orders.models import LigneCommande, Commande
        lignes = LigneCommande.objects.filter(produit__fournisseur=fournisseur)
        commandes_ids = lignes.values_list('commande_id', flat=True).distinct()
        commandes_mois = Commande.objects.filter(id__in=commandes_ids).count()
        commandes_en_attente = Commande.objects.filter(id__in=commandes_ids, statut='en_attente').count()

        chiffre_affaires = sum(ligne.quantite * ligne.prix_unitaire for ligne in lignes)
        produits_vendus = sum(ligne.quantite for ligne in lignes)

        return Response({
            'totalProduits': total_produits,
            'produitsActifs': produits_actifs,
            'tauxActifs': round((produits_actifs / total_produits * 100) if total_produits > 0 else 0, 1),
            'ruptures': ruptures,
            'commandesMois': commandes_mois,
            'commandesEnAttente': commandes_en_attente,
            'produitsVendus': produits_vendus,
            'chiffreAffaires': float(chiffre_affaires),
        })


# -----------------------------
# Fournisseur - Produits
# -----------------------------
class FournisseurProduitListCreateView(generics.ListCreateAPIView):
    """
    Liste et création de produits pour le fournisseur connecté
    """
    serializer_class = ProduitSerializer
    permission_classes = [IsFournisseur]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        return Produit.objects.filter(fournisseur=self.request.user.fournisseur)

    def perform_create(self, serializer):
        fournisseur = self.request.user.fournisseur
        produit = serializer.save(
            fournisseur=fournisseur,
            statut='inactif',
            statut_approbation='en_attente',
            is_active=True
        )

        # Notifier les admins en temps réel
        try:
            notifications = cache.get('admin_notifications', [])
            notifications.insert(0, {
                'type': 'produit',
                'message': f"Nouveau produit à approuver : {produit.nom} (fournisseur {fournisseur.nom_entreprise})",
                'produit_id': produit.id,
                'fournisseur_id': fournisseur.user_id,
                'timestamp': None,
                'data': {
                    'produit_id': produit.id,
                    'produit_nom': produit.nom,
                    'fournisseur_nom': fournisseur.nom_entreprise,
                    'lien': '/admin/approbation-produits'
                }
            })
            cache.set('admin_notifications', notifications[:50], timeout=3600)
        except Exception:
            pass


class FournisseurProduitDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Détail, mise à jour et suppression d'un produit du fournisseur
    """
    serializer_class = ProduitSerializer
    permission_classes = [IsFournisseur]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        return Produit.objects.filter(fournisseur=self.request.user.fournisseur)


# -----------------------------
# Fournisseur - Commandes
# -----------------------------
class FournisseurCommandeListView(generics.ListAPIView):
    """
    Liste des commandes contenant les produits du fournisseur
    """
    serializer_class = CommandeSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        from orders.models import LigneCommande
        lignes = LigneCommande.objects.filter(produit__fournisseur=self.request.user.fournisseur)
        commande_ids = lignes.values_list('commande_id', flat=True)
        return Commande.objects.filter(id__in=commande_ids)


class FournisseurCommandeUpdateStatutView(APIView):
    """
    Mise à jour du statut d'une commande par le fournisseur
    """
    permission_classes = [IsFournisseur]

    def patch(self, request, pk):
        from orders.models import LigneCommande
        lignes = LigneCommande.objects.filter(produit__fournisseur=request.user.fournisseur, commande_id=pk)
        if not lignes.exists():
            return Response({'error': 'Commande non trouvée'}, status=status.HTTP_404_NOT_FOUND)

        commande = lignes.first().commande
        commande.statut = request.data.get('statut', commande.statut)
        commande.save()
        return Response(CommandeSerializer(commande).data)


# -----------------------------
# Fournisseur - Stock
# -----------------------------
class FournisseurStockListView(generics.ListAPIView):
    """
    Liste des stocks des produits du fournisseur
    """
    serializer_class = ProduitSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        return Produit.objects.filter(fournisseur=self.request.user.fournisseur)


class FournisseurStockUpdateView(APIView):
    """
    Mise à jour du stock d'un produit
    """
    permission_classes = [IsFournisseur]

    def patch(self, request, pk):
        try:
            produit = Produit.objects.get(pk=pk, fournisseur=request.user.fournisseur)
            old_stock = produit.stock
            produit.stock = request.data.get('stock', produit.stock)
            produit.save()

            # 🔔 Alerte stock faible
            if produit.stock <= 5 and old_stock > 5:
                creer_notification_fournisseur(
                    fournisseur_id=request.user.id,
                    type_notif='stock',
                    titre='Alerte stock faible',
                    message=f"Le stock de « {produit.nom} » est faible ({produit.stock} unité(s)).",
                    lien='/fournisseur/stocks'
                )

            return Response(ProduitSerializer(produit).data)
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=status.HTTP_404_NOT_FOUND)


# -----------------------------
# Fournisseur - Ventes
# -----------------------------
class FournisseurVenteListView(generics.ListAPIView):
    """
    Liste des ventes du fournisseur (transactions)
    """
    serializer_class = TransactionSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        return Transaction.objects.filter(fournisseur=self.request.user.fournisseur)


# -----------------------------
# Fournisseur - Promotions
# -----------------------------
class FournisseurPromotionListCreateView(generics.ListCreateAPIView):
    """
    Liste et création de promotions pour les produits du fournisseur
    """
    serializer_class = PromotionSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        return Promotion.objects.filter(produit__fournisseur=self.request.user.fournisseur)

    def perform_create(self, serializer):
        serializer.save()


class FournisseurPromotionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Détail, mise à jour et suppression d'une promotion
    """
    serializer_class = PromotionSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        return Promotion.objects.filter(produit__fournisseur=self.request.user.fournisseur)


# -----------------------------
# Fournisseur - Avis
# -----------------------------
class FournisseurAvisListView(generics.ListAPIView):
    """
    Liste des avis sur les produits du fournisseur
    """
    serializer_class = AvisSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        return Avis.objects.filter(produit__fournisseur=self.request.user.fournisseur)
