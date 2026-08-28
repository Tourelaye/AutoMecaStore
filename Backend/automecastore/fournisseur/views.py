from rest_framework import generics, permissions, status, parsers
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
from account.permissions import IsFournisseur
from .models import Transaction, HistoriqueActivite, Notification, Magasin, creer_notification_fournisseur, creer_notification_client
from .serializers import TransactionSerializer, HistoriqueActiviteSerializer, NotificationSerializer, FournisseurSerializer, MagasinSerializer
from catalog.models import Produit, MouvementStock, Promotion
from catalog.serializers import ProduitSerializer, PromotionSerializer, MouvementStockSerializer
from django.db.models import Avg, Count, F, Q, Sum, ExpressionWrapper, IntegerField, DurationField
from support.models import Avis, SignalementAvis
from support.serializers import AvisSerializer
from orders.models import Commande, HistoriqueCommande, STATUT_COMMANDE, LigneCommande
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
            destinataire_id__in=[self.request.user.id, self.request.user.fournisseur.user_id],
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
            destinataire_id__in=[self.request.user.id, self.request.user.fournisseur.user_id],
            destinataire_type='fournisseur'
        )


class NotificationCountView(APIView):
    """
    Compteur de notifications non lues
    """
    permission_classes = [IsFournisseur]

    def get(self, request):
        count = Notification.objects.filter(
            destinataire_id__in=[request.user.id, request.user.fournisseur.user_id],
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
            destinataire_id__in=[request.user.id, request.user.fournisseur.user_id],
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

        # Rupture = stock à 0 ; stock faible = stock > 0 et <= seuil d'alerte
        rupture = produits.filter(stock=0).count()
        stock_faible = produits.filter(stock__gt=0, stock__lte=F('seuil_alerte')).count()

        from orders.models import LigneCommande, Commande
        maintenant = timezone.now()

        # Lignes vendues (hors commandes annulées/refusées)
        lignes = LigneCommande.objects.filter(
            fournisseur=fournisseur
        ).exclude(commande__statut__in=['annulee', 'refusee'])

        commandes_ids = lignes.values_list('commande_id', flat=True).distinct()

        # Commandes du mois en cours
        commandes_mois = Commande.objects.filter(
            id__in=commandes_ids,
            date_commande__year=maintenant.year,
            date_commande__month=maintenant.month
        ).count()

        # Commandes en attente (nouvelle + en attente de confirmation)
        commandes_en_attente = Commande.objects.filter(
            id__in=commandes_ids,
            statut__in=['nouvelle_commande', 'en_attente_confirmation']
        ).count()

        # CA et quantités vendues (hors annulées/refusées)
        agregats = lignes.aggregate(
            ca=Sum(F('quantite') * F('prix_unitaire')),
            qte=Sum('quantite')
        )
        chiffre_affaires = agregats['ca'] or 0
        produits_vendus = agregats['qte'] or 0

        return Response({
            'totalProduits': total_produits,
            'produitsActifs': produits_actifs,
            'tauxActifs': round((produits_actifs / total_produits * 100) if total_produits > 0 else 0, 1),
            'rupture': rupture,
            'stockFaible': stock_faible,
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
        data = serializer.validated_data

        # Valeurs par défaut si le fournisseur ne les fournit pas explicitement
        defaults = {
            'fournisseur': fournisseur,
        }
        if 'statut' not in data:
            defaults['statut'] = 'actif'
        if 'is_active' not in data:
            defaults['is_active'] = True
        if 'statut_approbation' not in data:
            defaults['statut_approbation'] = 'en_attente'

        produit = serializer.save(**defaults)

        # Notifier les admins seulement si le produit est soumis à validation
        if produit.statut == 'actif' and produit.statut_approbation == 'en_attente':
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

    def perform_update(self, serializer):
        # Sécurité : un fournisseur ne peut pas modifier certains champs administrateur
        for champ in ('fournisseur', 'statut_approbation', 'signale', 'motif_rejet', 'date_suppression', 'nombre_vues', 'nombre_favoris', 'nombre_ventes', 'note_moyenne', 'nombre_avis'):
            serializer.validated_data.pop(champ, None)
        serializer.save(fournisseur=self.request.user.fournisseur)

    def perform_destroy(self, instance):
        instance.soft_delete()


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
        lignes = LigneCommande.objects.filter(fournisseur=self.request.user.fournisseur)
        commande_ids = lignes.values_list('commande_id', flat=True)
        return Commande.objects.filter(id__in=commande_ids).order_by('-date_commande')


class FournisseurCommandeDetailView(generics.RetrieveAPIView):
    """
    Détail d'une commande pour le fournisseur
    """
    serializer_class = CommandeSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        from orders.models import LigneCommande
        lignes = LigneCommande.objects.filter(fournisseur=self.request.user.fournisseur)
        commande_ids = lignes.values_list('commande_id', flat=True)
        return Commande.objects.filter(id__in=commande_ids)


class FournisseurCommandeCommentaireView(APIView):
    """
    Ajout / mise à jour du commentaire fournisseur visible par le client
    """
    permission_classes = [IsFournisseur]

    def patch(self, request, pk):
        from orders.models import LigneCommande
        lignes = LigneCommande.objects.filter(fournisseur=request.user.fournisseur, commande_id=pk)
        if not lignes.exists():
            return Response({'error': 'Commande non trouvée'}, status=status.HTTP_404_NOT_FOUND)

        commande = lignes.first().commande
        commande.commentaire_fournisseur = request.data.get('commentaire_fournisseur', '')
        commande.save()
        return Response(CommandeSerializer(commande).data)


class FournisseurCommandeUpdateStatutView(APIView):
    """
    Mise à jour du statut d'une commande par le fournisseur avec historique et motif
    """
    permission_classes = [IsFournisseur]

    TRANSITIONS_AUTORISEES = {
        'nouvelle_commande': ['acceptee', 'refusee', 'annulee'],
        'en_attente_confirmation': ['acceptee', 'refusee', 'annulee'],
        'acceptee': ['en_preparation', 'annulee'],
        'en_preparation': ['prete_a_retirer', 'en_cours_livraison', 'annulee'],
        'prete_a_retirer': ['terminee', 'annulee'],
        'en_cours_livraison': ['livree', 'annulee'],
        'livree': ['terminee'],
        'terminee': [],
        'refusee': [],
        'annulee': [],
    }

    ORDRE_STATUTS = [s[0] for s in STATUT_COMMANDE]

    def _rang_statut(self, statut):
        try:
            return self.ORDRE_STATUTS.index(statut)
        except ValueError:
            return -1

    def _recalculer_statut_commande(self, commande):
        """Le statut global est celui de la ligne la plus en retard (hors annulées/refusées)."""
        statuts = list(commande.lignes.all().values_list('statut', flat=True))
        if not statuts:
            return commande.statut

        actifs = [s for s in statuts if s not in ('refusee', 'annulee')]
        if actifs:
            return min(actifs, key=self._rang_statut)

        if 'annulee' in statuts:
            return 'annulee'
        return 'refusee'

    def _utilisateur_nom(self, user):
        return f"{user.prenom or ''} {user.nom or ''}".strip() or user.email or 'Fournisseur'

    def _get_message_statut(self, nouveau):
        messages = {
            'acceptee': 'Commande acceptée',
            'en_preparation': 'Préparation en cours',
            'prete_a_retirer': 'Commande prête à être retirée',
            'en_cours_livraison': 'Commande en cours de livraison',
            'livree': 'Commande livrée',
            'terminee': 'Commande terminée',
            'refusee': 'Commande refusée',
            'annulee': 'Commande annulée',
        }
        return messages.get(nouveau, f'Statut mis à jour : {nouveau}')

    def patch(self, request, pk):
        fournisseur = request.user.fournisseur
        lignes_fournisseur = LigneCommande.objects.filter(
            fournisseur=fournisseur, commande_id=pk
        ).select_related('commande')
        if not lignes_fournisseur.exists():
            return Response({'error': 'Commande non trouvée'}, status=status.HTTP_404_NOT_FOUND)

        commande = lignes_fournisseur.first().commande
        nouveau_statut = request.data.get('statut')
        if not nouveau_statut:
            return Response({'error': 'Le nouveau statut est requis'}, status=status.HTTP_400_BAD_REQUEST)

        # Validation du motif pour refus/annulation
        motif = request.data.get('motif', '')
        if nouveau_statut in ['refusee', 'annulee'] and not motif:
            return Response({'error': 'Un motif est requis pour refuser ou annuler une commande'}, status=status.HTTP_400_BAD_REQUEST)

        # On met à jour chaque ligne du fournisseur autorisée à passer à ce statut
        lignes_modifiees = []
        for ligne in lignes_fournisseur:
            if ligne.statut == nouveau_statut:
                lignes_modifiees.append(ligne)
                continue
            statuts_autorises = self.TRANSITIONS_AUTORISEES.get(ligne.statut, [])
            if nouveau_statut in statuts_autorises:
                lignes_modifiees.append(ligne)
            else:
                return Response(
                    {'error': f"Transition impossible de '{ligne.statut}' vers '{nouveau_statut}' pour la ligne {ligne.id}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        commentaire = request.data.get('commentaire', self._get_message_statut(nouveau_statut))
        for ligne in lignes_modifiees:
            ligne.statut = nouveau_statut
            ligne.save()
            HistoriqueCommande.objects.create(
                commande=commande,
                ligne=ligne,
                statut=nouveau_statut,
                commentaire=commentaire,
                motif=motif,
                utilisateur=request.user,
                utilisateur_nom=self._utilisateur_nom(request.user)
            )

        # Synchronisation du statut global par rapport aux lignes
        ancien_statut = commande.statut
        commande.statut = self._recalculer_statut_commande(commande)

        # Commentaire visible par le client optionnel
        if 'commentaire_fournisseur' in request.data:
            commande.commentaire_fournisseur = request.data['commentaire_fournisseur']

        commande.save()

        # Notifier le client seulement si le statut global a vraiment changé
        if commande.client and commande.client.user and commande.statut != ancien_statut:
            type_map = {
                'acceptee': 'ORDER_ACCEPTED',
                'en_preparation': 'ORDER_PREPARING',
                'prete_a_retirer': 'ORDER_READY',
                'en_cours_livraison': 'ORDER_DELIVERING',
                'livree': 'ORDER_DELIVERED',
                'terminee': 'ORDER_DELIVERED',
                'refusee': 'ORDER_REFUSED',
                'annulee': 'ORDER_CANCELLED',
            }
            notif_type = type_map.get(commande.statut, 'ORDER_ACCEPTED')
            importance = 'danger' if commande.statut in ['refusee', 'annulee'] else 'success' if commande.statut in ['acceptee', 'livree', 'terminee'] else 'info'
            creer_notification_client(
                client_id=commande.client.user.id,
                type_notif=notif_type,
                titre=self._get_message_statut(commande.statut),
                message=f"Votre commande {commande.reference} est maintenant '{self._get_message_statut(commande.statut)}'.",
                lien=f'/mes-commandes/{commande.id}',
                importance=importance,
                objet_type='Commande',
                objet_id=commande.id
            )

        return Response(CommandeSerializer(commande, context={'request': request}).data)


# -----------------------------
# Fournisseur - Stock
# -----------------------------

def _statut_stock_avec_seuil(produit, stock=None):
    """Retourne le statut du stock et le seuil utilisé"""
    if stock is None:
        stock = produit.stock or 0
    seuil = produit.seuil_alerte if produit.seuil_alerte is not None else 5
    if stock == 0:
        return 'rupture', seuil
    if stock <= seuil:
        return 'faible', seuil
    return 'en_stock', seuil


def _maj_disponibilite(produit):
    """Met à jour le champ disponibilite en fonction du stock"""
    stock = produit.stock or 0
    seuil = produit.seuil_alerte if produit.seuil_alerte is not None else 5
    if stock == 0:
        produit.disponibilite = 'rupture'
    elif stock <= seuil:
        produit.disponibilite = 'faible_stock'
    else:
        produit.disponibilite = 'en_stock'


class FournisseurStockListView(generics.ListAPIView):
    """
    Liste des stocks des produits du fournisseur avec statut calculé
    """
    serializer_class = ProduitSerializer
    permission_classes = [IsFournisseur]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['nom', 'prix', 'stock', 'date_derniere_maj_stock']
    ordering = ['-date_derniere_maj_stock', '-date_ajout']
    search_fields = ['nom', 'reference', 'categorie__nom']

    def get_queryset(self):
        return Produit.objects.filter(
            fournisseur=self.request.user.fournisseur,
            is_active=True
        ).select_related('categorie')


class FournisseurStockUpdateView(APIView):
    """
    Mise à jour directe du stock d'un produit (compatibilité)
    Enregistre automatiquement un mouvement de type correction.
    """
    permission_classes = [IsFournisseur]

    def patch(self, request, pk):
        try:
            produit = Produit.objects.get(pk=pk, fournisseur=request.user.fournisseur, is_active=True)
            old_stock = produit.stock
            new_stock = request.data.get('stock')
            if new_stock is None:
                return Response({'error': 'Le champ stock est requis.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                new_stock = int(new_stock)
                if new_stock < 0:
                    return Response({'error': 'Le stock ne peut pas être négatif.'}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({'error': 'Le stock doit être un entier.'}, status=status.HTTP_400_BAD_REQUEST)

            produit.stock = new_stock
            _maj_disponibilite(produit)
            produit.date_derniere_maj_stock = timezone.now()
            produit.save()

            MouvementStock.objects.create(
                produit=produit,
                type_mouvement='correction',
                quantite=abs(new_stock - old_stock),
                observation=request.data.get('observation', f"Correction manuelle : {old_stock} → {new_stock}"),
                utilisateur=request.user
            )

            _gerer_alertes_stock(request.user, produit, old_stock)

            return Response(ProduitSerializer(produit).data)
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=status.HTTP_404_NOT_FOUND)


class FournisseurStockMouvementView(APIView):
    """
    Crée un mouvement de stock (entrée, sortie, retour, correction)
    et met à jour la quantité du produit.
    """
    permission_classes = [IsFournisseur]

    def post(self, request, pk):
        try:
            produit = Produit.objects.get(pk=pk, fournisseur=request.user.fournisseur, is_active=True)
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=status.HTTP_404_NOT_FOUND)

        type_mouvement = request.data.get('type_mouvement')
        quantite = request.data.get('quantite')
        observation = request.data.get('observation', '')

        if type_mouvement not in ['entree', 'sortie', 'retour', 'correction']:
            return Response({'error': 'Type de mouvement invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quantite = int(quantite)
            if quantite <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'error': 'La quantité doit être un entier positif.'}, status=status.HTTP_400_BAD_REQUEST)

        old_stock = produit.stock or 0

        if type_mouvement in ('entree', 'retour'):
            new_stock = old_stock + quantite
        elif type_mouvement == 'sortie':
            new_stock = old_stock - quantite
            if new_stock < 0:
                return Response({'error': 'Stock insuffisant pour cette sortie.'}, status=status.HTTP_400_BAD_REQUEST)
        else:  # correction
            new_stock = quantite

        produit.stock = new_stock
        _maj_disponibilite(produit)
        produit.date_derniere_maj_stock = timezone.now()
        produit.save()

        MouvementStock.objects.create(
            produit=produit,
            type_mouvement=type_mouvement,
            quantite=quantite,
            observation=observation,
            utilisateur=request.user
        )

        _gerer_alertes_stock(request.user, produit, old_stock)

        return Response(ProduitSerializer(produit).data)


class FournisseurMouvementStockListView(generics.ListAPIView):
    """
    Historique des mouvements de stock du fournisseur.
    Filtrable par produit via ?produit=<id>.
    """
    serializer_class = MouvementStockSerializer
    permission_classes = [IsFournisseur]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['produit', 'type_mouvement']
    ordering = ['-date_mouvement']

    def get_queryset(self):
        return MouvementStock.objects.filter(
            produit__fournisseur=self.request.user.fournisseur
        ).select_related('produit', 'utilisateur')


def _gerer_alertes_stock(user, produit, old_stock):
    """Crée des notifications d'alerte stock si nécessaire"""
    old_statut, _ = _statut_stock_avec_seuil(produit, old_stock)
    new_statut, seuil = _statut_stock_avec_seuil(produit)

    if new_statut == 'rupture' and old_statut != 'rupture':
        creer_notification_fournisseur(
            fournisseur_id=user.id,
            type_notif='stock',
            titre='Rupture de stock',
            message=f"Le produit « {produit.nom} » est désormais en rupture de stock.",
            lien='/fournisseur/stocks'
        )
    elif new_statut == 'faible' and old_statut != 'faible':
        creer_notification_fournisseur(
            fournisseur_id=user.id,
            type_notif='stock',
            titre='Stock faible',
            message=f"Le stock de « {produit.nom} » est faible ({produit.stock} unité(s) restantes, seuil : {seuil}).",
            lien='/fournisseur/stocks'
        )

    # Alerte non réapprovisionné depuis longtemps (30 jours)
    if produit.date_derniere_maj_stock:
        if timezone.now() - produit.date_derniere_maj_stock > timedelta(days=30):
            creer_notification_fournisseur(
                fournisseur_id=user.id,
                type_notif='stock',
                titre='Stock non réapprovisionné',
                message=f"Le produit « {produit.nom} » n'a pas été réapprovisionné depuis plus de 30 jours.",
                lien='/fournisseur/stocks'
            )


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
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['type_promotion', 'statut', 'is_active']
    ordering_fields = ['date_debut', 'date_fin', 'created_at', 'pourcentage']
    ordering = ['-created_at']

    def get_queryset(self):
        return Promotion.objects.filter(
            fournisseur=self.request.user.fournisseur
        ).select_related('produit').prefetch_related('produit__promotions')

    def perform_create(self, serializer):
        promotion = serializer.save()
        creer_notification_fournisseur(
            fournisseur_id=self.request.user.id,
            type_notif='promotion',
            titre='Nouvelle promotion créée',
            message=f"La promotion « {promotion.nom or promotion.type_promotion} » a été créée.",
            lien='/fournisseur/promotions'
        )


class FournisseurPromotionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Détail, mise à jour et suppression d'une promotion
    """
    serializer_class = PromotionSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        return Promotion.objects.filter(fournisseur=self.request.user.fournisseur).select_related('produit')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        produit = instance.produit
        self.perform_destroy(instance)
        if produit:
            PromotionSerializer._sync_produit_promotion(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class FournisseurPromotionStatsView(APIView):
    """
    Statistiques des promotions du fournisseur
    """
    permission_classes = [IsFournisseur]

    def get(self, request):
        from django.db.models import Sum, Value
        from django.db.models.functions import Coalesce
        from orders.models import LigneCommande

        now = timezone.now()
        promotions = Promotion.objects.filter(fournisseur=request.user.fournisseur)

        actives = promotions.filter(is_active=True, date_debut__lte=now, date_fin__gte=now)
        a_venir = promotions.filter(is_active=True, date_debut__gt=now)
        terminees = promotions.filter(is_active=True, date_fin__lt=now)
        suspendues = promotions.filter(is_active=False)

        promo_list = promotions.select_related('produit')
        total_ventes = 0
        total_revenus = 0
        meilleure = None
        meilleur_revenu = 0

        statuts_valides = [
            'terminee', 'livree', 'en_cours_livraison',
            'prete_a_retirer', 'en_preparation', 'acceptee'
        ]

        for p in promo_list:
            lignes = LigneCommande.objects.filter(
                produit=p.produit,
                commande__date_commande__gte=p.date_debut,
                commande__date_commande__lte=p.date_fin,
                commande__statut__in=statuts_valides
            )
            agg = lignes.aggregate(
                ventes=Coalesce(Sum('quantite'), 0),
                revenus=Coalesce(Sum('sous_total'), Value(0))
            )
            ventes = agg['ventes'] or 0
            revenus = float(agg['revenus'] or 0)
            total_ventes += ventes
            total_revenus += revenus

            if revenus > meilleur_revenu:
                meilleur_revenu = revenus
                meilleure = p

        data = {
            'total': promotions.count(),
            'actives': actives.count(),
            'a_venir': a_venir.count(),
            'terminees': terminees.count(),
            'suspendues': suspendues.count(),
            'produits_en_promotion': actives.values('produit').distinct().count(),
            'ventes_generees': total_ventes,
            'revenus_generees': total_revenus,
            'meilleure_promotion': PromotionSerializer(meilleure).data if meilleure else None
        }
        return Response(data)


class FournisseurPromotionDuplicateView(APIView):
    """
    Duplique une promotion existante.
    """
    permission_classes = [IsFournisseur]

    def post(self, request, pk):
        try:
            promotion = Promotion.objects.get(pk=pk, fournisseur=request.user.fournisseur)
        except Promotion.DoesNotExist:
            return Response({'error': 'Promotion non trouvée.'}, status=status.HTTP_404_NOT_FOUND)

        promotion.pk = None
        promotion.nom = (promotion.nom or 'Promotion') + ' (copie)'
        promotion.is_active = True
        promotion.nb_utilisations = 0
        promotion.statut = 'a_venir'
        promotion.created_at = timezone.now()
        promotion.date_debut = timezone.now()
        promotion.date_fin = timezone.now() + timedelta(days=7)
        promotion.save()

        PromotionSerializer._sync_produit_promotion(promotion)
        return Response(PromotionSerializer(promotion).data, status=status.HTTP_201_CREATED)


class FournisseurPromotionToggleView(APIView):
    """
    Active ou suspend une promotion.
    """
    permission_classes = [IsFournisseur]

    def patch(self, request, pk):
        try:
            promotion = Promotion.objects.get(pk=pk, fournisseur=request.user.fournisseur)
        except Promotion.DoesNotExist:
            return Response({'error': 'Promotion non trouvée.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action not in ('suspendre', 'reactiver'):
            return Response({'error': 'Action invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'suspendre':
            promotion.is_active = False
        else:
            if promotion.date_fin < timezone.now():
                return Response({'error': 'Impossible de réactiver une promotion déjà expirée.'}, status=status.HTTP_400_BAD_REQUEST)
            promotion.is_active = True

        promotion.save(update_fields=['is_active'])
        PromotionSerializer._sync_produit_promotion(promotion)

        return Response(PromotionSerializer(promotion).data)


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
        return Avis.objects.filter(
            produit__fournisseur=self.request.user.fournisseur
        ).select_related('client__user', 'produit').prefetch_related('signalements')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['fournisseur'] = self.request.user.fournisseur
        return ctx


class FournisseurAvisRepondreView(APIView):
    """
    Permet au fournisseur de répondre publiquement à un avis.
    """
    permission_classes = [IsFournisseur]

    def post(self, request, pk):
        fournisseur = request.user.fournisseur
        try:
            avis = Avis.objects.get(pk=pk, produit__fournisseur=fournisseur)
        except Avis.DoesNotExist:
            return Response({'error': 'Avis introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        reponse = request.data.get('reponse_fournisseur', '').strip()
        if not reponse:
            return Response({'error': 'Le message de réponse est vide.'}, status=status.HTTP_400_BAD_REQUEST)

        avis.reponse_fournisseur = reponse
        avis.date_reponse = timezone.now()
        avis.reponse_fournisseur_nom = fournisseur.nom_entreprise or f"{request.user.prenom} {request.user.nom}".strip()
        avis.save(update_fields=['reponse_fournisseur', 'date_reponse', 'reponse_fournisseur_nom'])

        # 🔔 Notifier le client de la réponse
        if avis.client and avis.client.user:
            creer_notification_client(
                client_id=avis.client.user.id,
                type_notif='REVIEW_REPLIED',
                titre='Réponse à votre avis',
                message=f"{fournisseur.nom_entreprise or 'Un fournisseur'} a répondu à votre avis.",
                lien=f'/produits?id={avis.produit_id}' if avis.produit_id else '/',
                importance='info',
                objet_type='Avis',
                objet_id=avis.id
            )

        serializer = AvisSerializer(avis, context={'fournisseur': fournisseur})
        return Response(serializer.data)


class FournisseurAvisSignalerView(APIView):
    """
    Permet au fournisseur de signaler un avis à l'administrateur.
    """
    permission_classes = [IsFournisseur]

    def post(self, request, pk):
        fournisseur = request.user.fournisseur
        try:
            avis = Avis.objects.get(pk=pk, produit__fournisseur=fournisseur)
        except Avis.DoesNotExist:
            return Response({'error': 'Avis introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        motif = request.data.get('motif')
        commentaire = request.data.get('commentaire', '').strip()
        if motif not in [m[0] for m in SignalementAvis.MOTIF_CHOICES]:
            return Response({'error': 'Motif invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        if SignalementAvis.objects.filter(avis=avis, fournisseur=fournisseur).exists():
            return Response({'error': 'Vous avez déjà signalé cet avis.'}, status=status.HTTP_400_BAD_REQUEST)

        signalement = SignalementAvis.objects.create(
            avis=avis,
            fournisseur=fournisseur,
            motif=motif,
            commentaire=commentaire
        )

        # Notification fournisseur (confirmation)
        creer_notification_fournisseur(
            fournisseur_id=fournisseur.user_id,
            type_notif='systeme',
            titre='Signalement envoyé',
            message=f"Le signalement de l'avis de {avis.client.user.nom if avis.client else 'Client'} a été transmis à l'administrateur.",
            lien='/fournisseur/avis'
        )

        # Notification admin via le cache temps réel
        try:
            admin_notifications = cache.get('admin_notifications', [])
            admin_notifications.insert(0, {
                'type': 'system',
                'message': f"Un fournisseur a signalé un avis ({signalement.get_motif_display()}) pour « {avis.produit.nom} ».",
                'signalement_id': signalement.id,
                'avis_id': avis.id,
                'fournisseur_id': fournisseur.user_id,
                'data': {
                    'lien': '/admin/fournisseurs'
                }
            })
            cache.set('admin_notifications', admin_notifications[:50], timeout=3600)
        except Exception:
            pass

        return Response({
            'id': signalement.id,
            'motif': signalement.motif,
            'date': signalement.date,
            'statut': signalement.statut
        }, status=status.HTTP_201_CREATED)


class FournisseurAvisStatsView(APIView):
    """
    Statistiques avancées des avis du fournisseur.
    """
    permission_classes = [IsFournisseur]

    def get(self, request):
        fournisseur = request.user.fournisseur
        avis_qs = Avis.objects.filter(produit__fournisseur=fournisseur)

        total = avis_qs.count()
        if total == 0:
            return Response({
                'total': 0,
                'note_moyenne': 0,
                'repartition': {str(i): 0 for i in range(1, 6)},
                'top_produits': [],
                'flop_produits': [],
                'evolution': {},
                'reponses': {'count': 0, 'avg_response_time_hours': None}
            })

        note_moyenne = round(avis_qs.aggregate(avg=Avg('note'))['avg'] or 0, 2)
        repartition = {
            str(i): avis_qs.filter(note=i).count()
            for i in range(1, 6)
        }

        # Produits les mieux/moins bien notés (minimum 3 avis pour être significatif)
        produits_notes = Produit.objects.filter(fournisseur=fournisseur).annotate(
            nb_avis=Count('avis'),
            moyenne=Avg('avis__note')
        ).filter(nb_avis__gte=3)

        top_produits = [
            {'id': p.id, 'nom': p.nom, 'note_moyenne': round(p.moyenne or 0, 2), 'nb_avis': p.nb_avis}
            for p in produits_notes.order_by('-moyenne', '-nb_avis')[:5]
        ]
        flop_produits = [
            {'id': p.id, 'nom': p.nom, 'note_moyenne': round(p.moyenne or 0, 2), 'nb_avis': p.nb_avis}
            for p in produits_notes.order_by('moyenne', 'nb_avis')[:5]
        ]

        # Évolution de la satisfaction par mois (12 derniers mois)
        today = timezone.now()
        evolution = {}
        for i in range(11, -1, -1):
            mois = today - timedelta(days=i * 30)
            key = mois.strftime('%Y-%m')
            qs_mois = avis_qs.filter(date__year=mois.year, date__month=mois.month)
            evolution[key] = {
                'count': qs_mois.count(),
                'moyenne': round(qs_mois.aggregate(avg=Avg('note'))['avg'] or 0, 2)
            }

        # Réponses du fournisseur
        reponses_qs = avis_qs.exclude(reponse_fournisseur__isnull=True).exclude(reponse_fournisseur='')
        response_count = reponses_qs.count()
        avg_response_time = None
        if response_count:
            diff = reponses_qs.annotate(
                diff=ExpressionWrapper(F('date_reponse') - F('date'), output_field=DurationField())
            ).aggregate(avg=Avg('diff'))['avg']
            if diff is not None:
                avg_response_time = round(diff.total_seconds() / 3600, 1)

        return Response({
            'total': total,
            'note_moyenne': note_moyenne,
            'repartition': repartition,
            'top_produits': top_produits,
            'flop_produits': flop_produits,
            'evolution': evolution,
            'reponses': {
                'count': response_count,
                'avg_response_time_hours': avg_response_time
            }
        })


# -----------------------------
# Fournisseur - Mon magasin
# -----------------------------
class FournisseurMagasinView(generics.RetrieveUpdateAPIView):
    """
    Récupère ou met à jour les informations du magasin du fournisseur connecté.
    """
    serializer_class = MagasinSerializer
    permission_classes = [IsFournisseur]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get_object(self):
        fournisseur = self.request.user.fournisseur
        magasin, _ = Magasin.objects.get_or_create(
            fournisseur=fournisseur,
            defaults={
                'nom_magasin': fournisseur.nom_entreprise,
                'description': fournisseur.description or '',
            }
        )
        return magasin

    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        if not serializer.context.get('request'):
            serializer.context['request'] = self.request
        return serializer
