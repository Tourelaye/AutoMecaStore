# ==============================
# VIEWS POUR LA PAGE "MON COMPTE"
# ==============================

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from django.db.models import Count
from .models import Utilisateur, Client, Favori, Fournisseur
from orders.models import Commande, LigneCommande, Panier, PanierItem, MODE_RECEPTION
from orders.serializers import CommandeSerializer
from catalog.models import Produit, FournisseurProduit, Fournisseur as CatalogFournisseur
from fournisseur.models import Magasin, Notification, creer_notification_client, creer_notification_fournisseur
from fournisseur.serializers import NotificationSerializer
from .permissions import IsClient, IsClientOrAdmin


def _offre_et_stock(produit, account_fournisseur=None, magasin=None):
    account_f = account_fournisseur
    if not account_f and magasin:
        account_f = magasin.fournisseur
    if not account_f or not account_f.user:
        return None, int(produit.stock or 0)
    catalog_f = CatalogFournisseur.objects.filter(administrateur=account_f.user).first()
    if not catalog_f:
        return None, int(produit.stock or 0)
    offre = FournisseurProduit.objects.filter(produit=produit, fournisseur=catalog_f).first()
    stock = int(offre.stock_disponible if offre and offre.stock_disponible is not None else produit.stock or 0)
    return offre, stock


def _get_or_create_client(user):
    """Récupère ou crée le profil client lié à l'utilisateur."""
    client, _ = Client.objects.get_or_create(
        user=user,
        defaults={'point_fidelite': 0}
    )
    return client


def _get_or_create_panier(client):
    """Récupère ou crée le panier du client (un seul panier par client)."""
    panier = Panier.objects.filter(client=client).annotate(
        item_count=Count('items')
    ).order_by('-item_count', '-id').first()
    if panier is None:
        panier = Panier.objects.create(client=client, nom_panier='Panier')
    return panier


def _produit_image_url(request, produit):
    """Retourne l'URL absolue de l'image produit ou l'image par défaut."""
    if produit.image:
        try:
            return request.build_absolute_uri(produit.image.url)
        except Exception:
            pass
    return request.build_absolute_uri('/images/products/default.jpg')

class MeView(APIView):
    """
    Retourne et met à jour les informations de l'utilisateur connecté
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        base_data = {
            'id': user.id,
            'email': user.email,
            'nom': user.nom,
            'prenom': user.prenom,
            'telephone': user.telephone,
            'adresse': user.adresse,
            'role': user.role,
            'is_active': user.is_active,
            'date_joined': user.date_joined
        }
        try:
            client = Client.objects.get(user=user)
            base_data.update({
                'date_inscription': client.date_inscription,
                'point_fidelite': client.point_fidelite,
                'mode_paiement_favoris': client.mode_paiement_favoris,
            })
        except Client.DoesNotExist:
            pass
        try:
            fournisseur = Fournisseur.objects.get(user=user)
            base_data.update({
                'statut': fournisseur.statut,
                'date_validation': fournisseur.date_validation,
                'nom_entreprise': fournisseur.nom_entreprise,
                'siret': fournisseur.siret,
                'description': fournisseur.description,
                'raison_refus': fournisseur.raison_refus or '',
            })
        except Fournisseur.DoesNotExist:
            pass
        return Response(base_data)
    
    def put(self, request):
        """Met à jour complètement le profil utilisateur"""
        return self._update_profile(request, partial=False)
    
    def patch(self, request):
        """Met à jour partiellement le profil utilisateur"""
        return self._update_profile(request, partial=True)
    
    def _update_profile(self, request, partial=False):
        try:
            user = request.user
            user_fields = ['nom', 'prenom', 'email', 'telephone', 'adresse']

            for field in user_fields:
                if field in request.data:
                    setattr(user, field, request.data[field])
            user.save()

            try:
                client = Client.objects.get(user=user)
                client_fields = ['mode_paiement_favoris']
                for field in client_fields:
                    if field in request.data:
                        setattr(client, field, request.data[field])
                client.save()
                return Response({
                    'id': user.id,
                    'email': user.email,
                    'nom': user.nom,
                    'prenom': user.prenom,
                    'telephone': user.telephone,
                    'adresse': user.adresse,
                    'role': user.role,
                    'date_joined': user.date_joined,
                    'date_inscription': client.date_inscription,
                    'point_fidelite': client.point_fidelite,
                    'mode_paiement_favoris': client.mode_paiement_favoris,
                    'is_active': user.is_active
                })
            except Client.DoesNotExist:
                base_data = {
                    'id': user.id,
                    'email': user.email,
                    'nom': user.nom,
                    'prenom': user.prenom,
                    'telephone': user.telephone,
                    'adresse': user.adresse,
                    'role': user.role,
                    'is_active': user.is_active,
                    'date_joined': user.date_joined
                }
                try:
                    fournisseur = Fournisseur.objects.get(user=user)
                    base_data.update({
                        'statut': fournisseur.statut,
                        'date_validation': fournisseur.date_validation,
                        'nom_entreprise': fournisseur.nom_entreprise,
                        'siret': fournisseur.siret,
                        'description': fournisseur.description,
                    })
                except Fournisseur.DoesNotExist:
                    pass
                return Response(base_data)

        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la mise à jour: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

class MesCommandesView(APIView):
    """
    Retourne les commandes du client connecté
    """
    permission_classes = [IsClient]
    
    def get(self, request):
        """Retourne les commandes du client"""
        print(f" COMMANDES GET - User: {request.user}, Authenticated: {request.user.is_authenticated}, Role: {getattr(request.user, 'role', 'N/A')}")
        try:
            client = Client.objects.get(user=request.user)
            commandes = Commande.objects.filter(client=client).prefetch_related('lignes__produit', 'lignes__magasin', 'lignes__fournisseur', 'historique').order_by('-date_commande')
            serializer = CommandeSerializer(commandes, many=True, context={'request': request})
            response_data = {
                'commandes': serializer.data,
                'total': len(serializer.data)
            }
            return Response(response_data)

        except Client.DoesNotExist:
            print(f" Client.DoesNotExist pour user: {request.user}")
            return Response(
                {'error': 'Profil client non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )


class MaCommandeDetailView(APIView):
    """
    Détail d'une commande appartenant au client connecté
    """
    permission_classes = [IsClient]

    def get(self, request, pk):
        try:
            client = Client.objects.get(user=request.user)
            commande = Commande.objects.prefetch_related('lignes__produit', 'lignes__magasin', 'lignes__fournisseur', 'historique').get(pk=pk, client=client)
            serializer = CommandeSerializer(commande, context={'request': request})
            return Response(serializer.data)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        except Client.DoesNotExist:
            return Response({'error': 'Profil client non trouvé'}, status=status.HTTP_404_NOT_FOUND)


class MaCommandeAnnulerView(APIView):
    """
    Permet au client d'annuler une commande (si statut autorisé)
    """
    permission_classes = [IsClient]

    STATUTS_ANNULABLES = {
        'nouvelle_commande', 'en_attente_confirmation', 'acceptee', 'en_preparation'
    }

    def post(self, request, pk):
        try:
            client = Client.objects.get(user=request.user)
            commande = Commande.objects.get(pk=pk, client=client)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        except Client.DoesNotExist:
            return Response({'error': 'Profil client non trouvé'}, status=status.HTTP_404_NOT_FOUND)

        if commande.statut not in self.STATUTS_ANNULABLES:
            return Response(
                {'error': f"Impossible d'annuler une commande au statut '{commande.statut}'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        motif = request.data.get('motif', 'Annulation demandée par le client')
        ancien_statut = commande.statut
        commande.statut = 'annulee'
        commande.save()

        from orders.models import HistoriqueCommande
        HistoriqueCommande.objects.create(
            commande=commande,
            statut='annulee',
            commentaire='Commande annulée par le client',
            motif=motif,
            utilisateur=request.user,
            utilisateur_nom=f"{request.user.prenom or ''} {request.user.nom or ''}".strip() or request.user.email or 'Client'
        )

        # Notifier le client
        creer_notification_client(
            client_id=request.user.id,
            type_notif='commande',
            titre='Commande annulée',
            message=f"Votre commande {commande.reference} a été annulée.",
            lien='/mes-commandes'
        )

        # Notifier le(s) fournisseur(s) concerné(s)
        fournisseurs_notifies = set()
        for ligne in commande.lignes.all():
            fid = ligne.fournisseur_id or (ligne.magasin.fournisseur_id if ligne.magasin else None)
            if fid and fid not in fournisseurs_notifies:
                fournisseurs_notifies.add(fid)
                creer_notification_fournisseur(
                    fournisseur_id=fid,
                    type_notif='commande',
                    titre='Commande annulée',
                    message=f"La commande {commande.reference} a été annulée par le client. Motif : {motif}",
                    lien=f'/fournisseur/commandes/{commande.id}'
                )

        return Response(CommandeSerializer(commande, context={'request': request}).data)


def _type_destinataire(user):
    return user.role or 'client'


class MesNotificationsListView(APIView):
    """
    Liste et compteur des notifications de l'utilisateur connecté
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get('limit', 20))
        if limit > 100:
            limit = 100
        destinataire_type = _type_destinataire(request.user)
        qs = Notification.objects.filter(
            destinataire_id=request.user.id,
            destinataire_type=destinataire_type
        ).order_by('-created_at')[:limit]
        serializer = NotificationSerializer(qs, many=True)
        unread_count = Notification.objects.filter(
            destinataire_id=request.user.id,
            destinataire_type=destinataire_type,
            lu=False
        ).count()
        return Response({
            'notifications': serializer.data,
            'unread_count': unread_count
        })


class MesNotificationCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        destinataire_type = _type_destinataire(request.user)
        count = Notification.objects.filter(
            destinataire_id=request.user.id,
            destinataire_type=destinataire_type,
            lu=False
        ).count()
        return Response({'unread_count': count})


class MesNotificationDetailView(APIView):
    """
    Détail, marquer comme lue, supprimer d'une notification
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_notification(self, request, pk):
        destinataire_type = _type_destinataire(request.user)
        try:
            return Notification.objects.get(
                pk=pk,
                destinataire_id=request.user.id,
                destinataire_type=destinataire_type
            )
        except Notification.DoesNotExist:
            return None

    def get(self, request, pk):
        notification = self._get_notification(request, pk)
        if not notification:
            return Response({'error': 'Notification non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        serializer = NotificationSerializer(notification)
        return Response(serializer.data)

    def patch(self, request, pk):
        notification = self._get_notification(request, pk)
        if not notification:
            return Response({'error': 'Notification non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        if request.data.get('lu') is True:
            notification.lu = True
            notification.save(update_fields=['lu'])
        return Response({'success': True})

    def delete(self, request, pk):
        notification = self._get_notification(request, pk)
        if not notification:
            return Response({'error': 'Notification non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        notification.delete()
        return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)


class MesNotificationMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        destinataire_type = _type_destinataire(request.user)
        count = Notification.objects.filter(
            destinataire_id=request.user.id,
            destinataire_type=destinataire_type,
            lu=False
        ).update(lu=True)
        return Response({'marked_as_read': count})


class FavorisView(APIView):
    """
    Gestion des favoris du client connecté
    """
    permission_classes = [IsClientOrAdmin]
    
    def get(self, request):
        """Retourne les favoris du client"""
        print(f" FAVORIS GET - User: {request.user}, Authenticated: {request.user.is_authenticated}, Role: {getattr(request.user, 'role', 'N/A')}")
        client = _get_or_create_client(request.user)
        print(f" Client trouvé/créé: {client}")
        favoris = Favori.objects.filter(client=client).select_related('produit').order_by('-date_ajout')
        print(f"️ Nombre de favoris: {favoris.count()}")

        favoris_data = []
        for favori in favoris:
            produit = favori.produit
            favoris_data.append({
                'id': favori.id,
                'produit_id': produit.id,
                'produit_nom': produit.nom,
                'prix': float(produit.prix),
                'image': _produit_image_url(request, produit),
                'date_ajout': favori.date_ajout.isoformat()
            })

        response_data = {
            'favoris': favoris_data,
            'total': len(favoris_data)
        }
        print(f" FAVORIS RESPONSE: {response_data}")
        return Response(response_data)
    
    def post(self, request):
        """Ajoute un produit aux favoris"""
        print(f" FAVORIS POST - User: {request.user}, Authenticated: {request.user.is_authenticated}, Role: {getattr(request.user, 'role', 'N/A')}")
        print(f" Request data: {request.data}")
        produit_id = request.data.get('produit_id')

        if not produit_id:
            print(" produit_id manquant")
            return Response(
                {'error': 'produit_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            client = _get_or_create_client(request.user)
            print(f" Client trouvé/créé: {client}")

            produit = Produit.objects.get(id=produit_id)
            print(f" Produit trouvé: {produit.nom}")

            # Vérifier si le produit est déjà dans les favoris
            favori_existant = Favori.objects.filter(client=client, produit=produit).first()
            if favori_existant:
                print("⚠️ Produit déjà dans les favoris")
                return Response({
                    'message': 'Produit déjà dans les favoris',
                    'favori_id': favori_existant.id,
                    'produit_id': produit_id
                })

            # Ajouter aux favoris
            favori = Favori.objects.create(client=client, produit=produit)
            print(f"️ FAVORI CRÉÉ: ID={favori.id}, Client={client}, Produit={produit.nom}")

            return Response({
                'message': 'Produit ajouté aux favoris',
                'favori_id': favori.id,
                'produit_id': produit_id
            }, status=status.HTTP_201_CREATED)

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
        
        try:
            client = _get_or_create_client(request.user)
            produit = Produit.objects.get(id=produit_id)

            # Supprimer le favori
            deleted_count, _ = Favori.objects.filter(client=client, produit=produit).delete()

            if deleted_count == 0:
                return Response(
                    {'error': 'Produit non trouvé dans les favoris'},
                    status=status.HTTP_404_NOT_FOUND
                )

            return Response({
                'message': 'Produit retiré des favoris',
                'produit_id': produit_id
            })

        except Produit.DoesNotExist:
            return Response(
                {'error': 'Produit non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

class PanierView(APIView):
    """
    Gestion du panier du client connecté
    """
    permission_classes = [IsClient]
    
    def get(self, request):
        """Retourne le panier du client"""
        print(f" PANIER GET - User: {request.user}, Authenticated: {request.user.is_authenticated}, Role: {getattr(request.user, 'role', 'N/A')}")
        try:
            client = _get_or_create_client(request.user)
            panier = _get_or_create_panier(client)
            print(f" Client trouvé/créé: {client}")

            items_data = []
            for item in panier.items.all().select_related('produit', 'fournisseur', 'magasin'):
                offre, stock = _offre_et_stock(item.produit, item.fournisseur, item.magasin)
                prix = float(offre.prix_vente if offre and offre.prix_vente is not None else item.produit.prix)
                image_url = None
                if item.produit.image:
                    image_url = request.build_absolute_uri(item.produit.image.url)
                items_data.append({
                    'id': item.id,
                    'produit': {
                        'id': item.produit.id,
                        'nom': item.produit.nom,
                        'reference': item.produit.reference or '',
                        'image_url': image_url
                    },
                    'produit_id': item.produit.id,
                    'produit_nom': item.produit.nom,
                    'reference': item.produit.reference or '',
                    'prix': prix,
                    'image': image_url,
                    'quantite': item.quantite,
                    'stock': stock,
                    'sous_total': round(prix * item.quantite, 2),
                    'fournisseur_id': item.fournisseur_id,
                    'fournisseur_nom': item.fournisseur.nom_entreprise if item.fournisseur else None,
                    'magasin_id': item.magasin_id,
                    'magasin_nom': item.magasin.nom_magasin if item.magasin else None,
                    'mode_reception': item.mode_reception or 'livraison'
                })

            total = sum(item['sous_total'] for item in items_data)

            return Response({
                'items': items_data,
                'total': total,
                'nombre_items': len(items_data)
            })
        except Exception as e:
            print(f" Erreur GET panier: {str(e)}")
            return Response(
                {'error': 'Erreur lors de la récupération du panier'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, item_id=None):
        """Supprime un item du panier"""
        item_id = item_id or request.data.get('item_id')
        if not item_id:
            return Response(
                {'error': 'item_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            client = _get_or_create_client(request.user)
            panier = _get_or_create_panier(client)
            item = PanierItem.objects.get(id=item_id, panier=panier)
            item.delete()
            return Response({'message': 'Item supprimé du panier'})
        except PanierItem.DoesNotExist:
            return Response(
                {'error': 'Item non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def patch(self, request, item_id=None):
        """Met à jour la quantité d'un item du panier"""
        if not item_id:
            return Response(
                {'error': 'item_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        quantite = request.data.get('quantite')

        if quantite is None:
            return Response(
                {'error': 'quantite requise'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            client = _get_or_create_client(request.user)
            panier = _get_or_create_panier(client)
            item = PanierItem.objects.get(id=item_id, panier=panier)

            offre, stock = _offre_et_stock(item.produit, item.fournisseur, item.magasin)
            if int(quantite) > stock:
                return Response(
                    {'error': f'Stock insuffisant. Il reste {stock} unité(s).'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            item.quantite = quantite
            item.save()

            return Response({
                'message': 'Quantité mise à jour',
                'quantite': item.quantite
            })

        except PanierItem.DoesNotExist:
            return Response(
                {'error': 'Item non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def post(self, request):
        """Ajoute un produit au panier (avec fournisseur/magasin sélectionné)"""
        produit_id = request.data.get('produit_id')
        quantite = int(request.data.get('quantite', 1))
        fournisseur_id = request.data.get('fournisseur_id')
        magasin_id = request.data.get('magasin_id')
        mode_reception = request.data.get('mode_reception', 'livraison')

        if not produit_id:
            return Response(
                {'error': 'produit_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if quantite <= 0:
            return Response(
                {'error': 'quantite invalide'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if mode_reception not in dict(MODE_RECEPTION):
            mode_reception = 'livraison'

        try:
            client = _get_or_create_client(request.user)
            produit = Produit.objects.get(id=produit_id)

            # Récupérer ou créer le panier du client
            panier = _get_or_create_panier(client)

            # Identifier le fournisseur et magasin sélectionnés
            fournisseur = None
            magasin = None
            if fournisseur_id:
                fournisseur = Fournisseur.objects.filter(id=fournisseur_id).first()
            if magasin_id:
                magasin = Magasin.objects.filter(id=magasin_id).first()
            if not fournisseur and magasin:
                fournisseur = magasin.fournisseur
            if not magasin and fournisseur:
                try:
                    magasin = fournisseur.magasin
                except Magasin.DoesNotExist:
                    magasin = None

            # Vérification du stock de l'offre sélectionnée
            offre, stock = _offre_et_stock(produit, fournisseur, magasin)

            # On distingue les lignes panier par produit, offre et mode de réception
            filters = {'panier': panier, 'produit': produit}
            if fournisseur:
                filters['fournisseur'] = fournisseur
            else:
                filters['fournisseur__isnull'] = True
            if magasin:
                filters['magasin'] = magasin
            else:
                filters['magasin__isnull'] = True

            existing_item = PanierItem.objects.filter(**filters).first()
            requested_quantite = existing_item.quantite + quantite if existing_item else quantite

            if requested_quantite > stock:
                return Response(
                    {'error': f'Stock insuffisant. Il reste {stock} unité(s).'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if existing_item:
                existing_item.quantite += quantite
                existing_item.mode_reception = mode_reception
                existing_item.save()
            else:
                PanierItem.objects.create(
                    panier=panier,
                    produit=produit,
                    fournisseur=fournisseur,
                    magasin=magasin,
                    quantite=quantite,
                    mode_reception=mode_reception
                )

            return Response({
                'message': 'Produit ajouté au panier',
                'produit_id': produit_id,
                'fournisseur_id': fournisseur.id if fournisseur else None,
                'magasin_id': magasin.id if magasin else None,
                'mode_reception': mode_reception
            }, status=status.HTTP_201_CREATED)

        except Produit.DoesNotExist:
            return Response(
                {'error': 'Produit non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

