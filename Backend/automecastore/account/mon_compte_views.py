# ==============================
# VIEWS POUR LA PAGE "MON COMPTE"
# ==============================

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from django.db.models import Count
from .models import Utilisateur, Client, Favori, Fournisseur
from orders.models import Commande, LigneCommande, Panier, PanierItem
from catalog.models import Produit
from .permissions import IsClient, IsClientOrAdmin


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
        print(f"🔍 COMMANDES GET - User: {request.user}, Authenticated: {request.user.is_authenticated}, Role: {getattr(request.user, 'role', 'N/A')}")
        try:
            client = Client.objects.get(user=request.user)
            print(f"✅ Client trouvé: {client}")
            commandes = Commande.objects.filter(client=client).prefetch_related('lignes__produit').order_by('-date_commande')
            print(f"📦 Nombre de commandes: {commandes.count()}")
            
            commandes_data = []
            for commande in commandes:
                lignes = commande.lignes.all()
                commandes_data.append({
                    'id': commande.id,
                    'reference': commande.reference,
                    'date_commande': commande.date_commande.isoformat(),
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
            
            response_data = {
                'commandes': commandes_data,
                'total': len(commandes_data)
            }
            print(f"✅ COMMANDES RESPONSE: {response_data}")
            return Response(response_data)
            
        except Client.DoesNotExist:
            print(f"❌ Client.DoesNotExist pour user: {request.user}")
            return Response(
                {'error': 'Profil client non trouvé'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class FavorisView(APIView):
    """
    Gestion des favoris du client connecté
    """
    permission_classes = [IsClientOrAdmin]
    
    def get(self, request):
        """Retourne les favoris du client"""
        print(f"🔍 FAVORIS GET - User: {request.user}, Authenticated: {request.user.is_authenticated}, Role: {getattr(request.user, 'role', 'N/A')}")
        client = _get_or_create_client(request.user)
        print(f"✅ Client trouvé/créé: {client}")
        favoris = Favori.objects.filter(client=client).select_related('produit').order_by('-date_ajout')
        print(f"❤️ Nombre de favoris: {favoris.count()}")

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
        print(f"✅ FAVORIS RESPONSE: {response_data}")
        return Response(response_data)
    
    def post(self, request):
        """Ajoute un produit aux favoris"""
        print(f"🔍 FAVORIS POST - User: {request.user}, Authenticated: {request.user.is_authenticated}, Role: {getattr(request.user, 'role', 'N/A')}")
        print(f"📦 Request data: {request.data}")
        produit_id = request.data.get('produit_id')

        if not produit_id:
            print("❌ produit_id manquant")
            return Response(
                {'error': 'produit_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            client = _get_or_create_client(request.user)
            print(f"✅ Client trouvé/créé: {client}")

            produit = Produit.objects.get(id=produit_id)
            print(f"✅ Produit trouvé: {produit.nom}")

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
            print(f"❤️ FAVORI CRÉÉ: ID={favori.id}, Client={client}, Produit={produit.nom}")

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
        print(f"🔍 PANIER GET - User: {request.user}, Authenticated: {request.user.is_authenticated}, Role: {getattr(request.user, 'role', 'N/A')}")
        client = _get_or_create_client(request.user)
        print(f"✅ Client trouvé/créé: {client}")
        # Récupérer ou créer le panier du client
        panier = _get_or_create_panier(client)
        print(f"🛒 Panier ID: {panier.id}")

        items = PanierItem.objects.filter(panier=panier).select_related('produit')
        print(f"📦 Nombre d'items: {items.count()}")

        items_data = []
        total = 0
        nombre_items = 0

        for item in items:
            produit = item.produit
            sous_total = float(produit.prix) * item.quantite
            total += sous_total
            nombre_items += item.quantite

            items_data.append({
                'id': item.id,
                'produit_id': produit.id,
                'produit_nom': produit.nom,
                'prix': float(produit.prix),
                'image': _produit_image_url(request, produit),
                'quantite': item.quantite,
                'sous_total': sous_total
            })

        response_data = {
            'items': items_data,
            'total': total,
            'nombre_items': nombre_items
        }
        print(f"✅ PANIER RESPONSE: {response_data}")
        return Response(response_data)
    
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
        """Ajoute un produit au panier"""
        produit_id = request.data.get('produit_id')
        quantite = request.data.get('quantite', 1)

        if not produit_id:
            return Response(
                {'error': 'produit_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            client = _get_or_create_client(request.user)
            produit = Produit.objects.get(id=produit_id)

            # Récupérer ou créer le panier du client
            panier = _get_or_create_panier(client)

            # Vérifier si le produit est déjà dans le panier
            existing_item = PanierItem.objects.filter(panier=panier, produit=produit).first()

            if existing_item:
                # Mettre à jour la quantité
                existing_item.quantite += quantite
                existing_item.save()
            else:
                # Ajouter le nouvel item
                PanierItem.objects.create(
                    panier=panier,
                    produit=produit,
                    quantite=quantite
                )

            return Response({
                'message': 'Produit ajouté au panier',
                'produit_id': produit_id
            }, status=status.HTTP_201_CREATED)

        except Produit.DoesNotExist:
            return Response(
                {'error': 'Produit non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

