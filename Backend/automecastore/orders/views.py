from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from django.db import transaction, models
from .models import Commande, LigneCommande, Panier, PanierItem, HistoriqueCommande, MODE_RECEPTION
from .serializers import CommandeSerializer, LigneCommandeSerializer, PanierSerializer, PanierItemSerializer
from catalog.models import Produit, FournisseurProduit, Fournisseur as CatalogFournisseur
from fournisseur.models import creer_notification_fournisseur, creer_notification_client, Magasin
from account.models import Fournisseur
from account.permissions import IsClient, IsAdmin
from delivery.models import Adresse, Livraison


def _offre_et_stock(produit, account_fournisseur=None, magasin=None):
    """Récupère l'offre FournisseurProduit et le stock/prix effectifs."""
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


# -----------------------------
# Panier
# -----------------------------
class PanierView(generics.RetrieveAPIView):
    serializer_class = PanierSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        panier, _ = Panier.objects.get_or_create(client=self.request.user.client)
        return panier


# -----------------------------
# Ajouter au panier
# -----------------------------
class AjouterAuPanierView(generics.CreateAPIView):
    serializer_class = PanierItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        panier, _ = Panier.objects.get_or_create(client=request.user.client)

        produit_id = request.data.get('produit_id')
        quantite = int(request.data.get('quantite', 1))

        if quantite <= 0:
            return Response(
                {"error": "Quantité invalide"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            produit = Produit.objects.get(id=produit_id)
        except Produit.DoesNotExist:
            return Response(
                {"error": "Produit introuvable"},
                status=status.HTTP_404_NOT_FOUND
            )

        fournisseur_id = request.data.get('fournisseur_id')
        magasin_id = request.data.get('magasin_id')
        mode_reception = request.data.get('mode_reception', 'livraison')

        if mode_reception not in dict(MODE_RECEPTION):
            mode_reception = 'livraison'

        # Récupérer fournisseur / magasin s'ils sont fournis, sinon produit.fournisseur par défaut
        fournisseur = None
        magasin = None
        if fournisseur_id:
            try:
                fournisseur = Fournisseur.objects.get(pk=fournisseur_id)
            except Fournisseur.DoesNotExist:
                pass
        if magasin_id:
            try:
                magasin = Magasin.objects.get(id=magasin_id)
            except Magasin.DoesNotExist:
                pass

        # Si aucun fournisseur/magasin n'est fourni, on tente le fournisseur principal du produit
        if not fournisseur and not magasin and produit.fournisseur:
            fournisseur = produit.fournisseur
            try:
                magasin = fournisseur.magasin
            except Magasin.DoesNotExist:
                magasin = None

        # Si un magasin est donné sans fournisseur, le fournisseur du magasin est utilisé
        if magasin and not fournisseur:
            fournisseur = magasin.fournisseur

        # Vérification du stock réel de l'offre sélectionnée (non modifiable par le frontend)
        offre, stock = _offre_et_stock(produit, fournisseur, magasin)
        if quantite > stock:
            return Response(
                {
                    "error": f"Stock insuffisant. Il reste seulement {stock} unité{'s' if stock > 1 else ''}."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérifier que le magasin accepte le mode de réception demandé
        if magasin:
            if mode_reception == 'livraison' and not magasin.livraison_disponible:
                return Response(
                    {"error": "Ce magasin ne propose pas la livraison"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if mode_reception == 'retrait_magasin' and not magasin.retrait_magasin:
                return Response(
                    {"error": "Ce magasin ne propose pas le retrait en magasin"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        item, created = PanierItem.objects.get_or_create(
            panier=panier,
            produit=produit,
            fournisseur=fournisseur,
            magasin=magasin,
            mode_reception=mode_reception
        )

        if not created:
            item.quantite += quantite
        else:
            item.quantite = quantite

        item.fournisseur = fournisseur
        item.magasin = magasin
        item.mode_reception = mode_reception
        item.save()

        return Response(PanierSerializer(panier, context={'request': request}).data)


# -----------------------------
# Commande
# -----------------------------
class CommandeListView(generics.ListAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [IsAdmin]
    queryset = Commande.objects.all().order_by('-date_commande')


class CommandeDetailView(generics.RetrieveAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [IsAdmin]
    queryset = Commande.objects.all()


class CommandeCreateView(generics.CreateAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [IsClient]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)


# -----------------------------
# Client - Mes commandes
# -----------------------------
class ClientCommandeListView(generics.ListAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return Commande.objects.filter(client=self.request.user.client).order_by('-date_commande')


class ClientCommandeDetailView(generics.RetrieveAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return Commande.objects.filter(client=self.request.user.client)


# -----------------------------
# Ligne commande
# -----------------------------
class LigneCommandeCreateView(generics.CreateAPIView):
    serializer_class = LigneCommandeSerializer
    permission_classes = [IsAdmin]


# -----------------------------
# Créer commande depuis panier
# -----------------------------
class CreerCommandeDepuisPanierView(generics.CreateAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        # print(f"🔍 Créer commande depuis panier - User: {request.user}")
        # print(f"📦 Request data: {request.data}")

        try:
            client = request.user.client
        except Exception:
            return Response(
                {"error": "Profil client introuvable. Veuillez vous reconnecter."},
                status=status.HTTP_400_BAD_REQUEST
            )

        panier, _ = Panier.objects.get_or_create(client=client)

        if not panier.items.exists():
            # print("❌ Panier vide")
            return Response(
                {"error": "Panier vide"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # print(f"📦 Nombre d'items dans panier: {panier.items.count()}")

        # Infos de livraison / réception (adresse et téléphone fournis par le frontend)
        adresse_data = request.data.get('adresse', {}) or {}
        adresse_livraison = adresse_data.get('adresse', '') or request.data.get('adresse_livraison', '')
        telephone_client = adresse_data.get('telephone', '') or request.data.get('telephone_client', '')
        nom_destinataire = adresse_data.get('nom_destinataire', '')

        # Mode de réception par item (permet livraison ET retrait sur la même commande)
        requested_items = request.data.get('items')
        item_lookup = {}
        if requested_items and isinstance(requested_items, list):
            for it in requested_items:
                pid = it.get('panier_item_id')
                if pid:
                    item_lookup[pid] = it

        # ---------- PRÉ-VALIDATION DE CHAQUE LIGNE ----------
        lignes = []
        fournisseurs_notifies = set()

        for item in panier.items.all():
            produit = item.produit
            if not produit:
                return Response(
                    {"error": "Un article du panier n'a pas de produit associé."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Mode de réception final : par item, sinon celui du panier, sinon livraison
            req = item_lookup.get(item.id, {})
            mode_reception = req.get('mode_reception', item.mode_reception or 'livraison')
            if mode_reception not in dict(MODE_RECEPTION):
                mode_reception = 'livraison'

            magasin = item.magasin
            fournisseur = item.fournisseur

            # Si aucun magasin n'est associé, on tente de le déduire du fournisseur principal du produit
            if not magasin and not fournisseur and produit.fournisseur:
                fournisseur = produit.fournisseur
                try:
                    magasin = fournisseur.magasin
                except Magasin.DoesNotExist:
                    magasin = None

            if not magasin:
                return Response(
                    {"error": f"Le produit {produit.nom} n'a pas de magasin associé."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not fournisseur:
                fournisseur = magasin.fournisseur

            # Cohérence fournisseur / magasin
            if magasin.fournisseur and fournisseur and magasin.fournisseur.user_id != fournisseur.user_id:
                return Response(
                    {"error": f"Le magasin ne correspond pas au fournisseur pour {produit.nom}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Le magasin accepte-t-il ce mode de réception ?
            if mode_reception == 'livraison' and not magasin.livraison_disponible:
                return Response(
                    {"error": f"Le magasin {magasin.nom_magasin} ne propose pas la livraison pour {produit.nom}."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if mode_reception == 'retrait_magasin' and not magasin.retrait_magasin:
                return Response(
                    {"error": f"Le magasin {magasin.nom_magasin} ne propose pas le retrait pour {produit.nom}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Prix et stock issus de l'offre FournisseurProduit, non du frontend
            offre, stock = _offre_et_stock(produit, fournisseur, magasin)
            if offre and offre.produit_id != produit.id:
                return Response(
                    {"error": f"L'offre sélectionnée pour {produit.nom} est invalide."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            prix = offre.prix_vente if offre and offre.prix_vente is not None else produit.prix

            # print(f"🔍 Produit: {produit.nom}, Magasin: {magasin.nom_magasin}, Quantité: {item.quantite}, Stock: {stock}, Prix: {prix}")

            if item.quantite > stock:
                # print(f"❌ Stock insuffisant pour {produit.nom}")
                return Response(
                    {"error": f"Stock insuffisant pour {produit.nom}. Il reste {stock} unité(s)."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            lignes.append({
                'panier_item': item,
                'produit': produit,
                'fournisseur': fournisseur,
                'magasin': magasin,
                'quantite': item.quantite,
                'prix_unitaire': prix,
                'mode_reception': mode_reception,
            })

            fid = fournisseur.user_id if fournisseur else None
            if fid:
                fournisseurs_notifies.add(fid)

        # ---------- CALCUL DES FRAIS CÔTÉ BACKEND ----------
        # Frais de livraison calculés par magasin pour les articles en livraison
        a_livraison = any(l['mode_reception'] == 'livraison' for l in lignes)
        frais_par_magasin = {}
        for l in lignes:
            if l['mode_reception'] == 'livraison' and l['magasin'].livraison_disponible:
                magasin = l['magasin']
                if magasin.id not in frais_par_magasin:
                    frais_par_magasin[magasin.id] = {
                        'magasin': magasin,
                        'frais': magasin.frais_livraison or 0,
                        'mode_tarif': magasin.mode_tarif_livraison or 'non_defini'
                    }

        frais_livraison = sum(f['frais'] for f in frais_par_magasin.values())

        # Mode global de la commande : retrait si tout est retrait, sinon livraison
        modes = {l['mode_reception'] for l in lignes}
        mode_reception_commande = 'retrait_magasin' if modes == {'retrait_magasin'} else 'livraison'

        # ---------- CRÉATION DE LA COMMANDE ----------
        commande = Commande.objects.create(
            client=request.user.client,
            statut='nouvelle_commande',
            mode_reception=mode_reception_commande,
            adresse_livraison=adresse_livraison,
            telephone_client=telephone_client,
            frais_livraison=frais_livraison
        )
        # print(f"✅ Commande créée: ID={commande.id}, Reference={commande.reference}")

        HistoriqueCommande.objects.create(
            commande=commande,
            statut=commande.statut,
            commentaire='Commande créée',
            motif='',
            utilisateur=request.user,
            utilisateur_nom=f"{request.user.prenom or ''} {request.user.nom or ''}".strip() or request.user.email or 'Client'
        )

        # ---------- CRÉATION DES LIGNES ET DÉDUCTION STOCK ----------
        for l in lignes:
            LigneCommande.objects.create(
                commande=commande,
                produit=l['produit'],
                fournisseur=l['fournisseur'],
                magasin=l['magasin'],
                quantite=l['quantite'],
                prix_unitaire=l['prix_unitaire'],
                mode_reception=l['mode_reception']
            )

            offre, _ = _offre_et_stock(l['produit'], l['fournisseur'], l['magasin'])
            if offre and offre.stock_disponible is not None:
                offre.stock_disponible = max(0, offre.stock_disponible - l['quantite'])
                offre.save()
            l['produit'].stock = max(0, l['produit'].stock - l['quantite'])
            l['produit'].save()
            # print(f"✅ Stock déduit pour {l['produit'].nom}: nouveau stock={l['produit'].stock}")

        # 🔔 Notifier les fournisseurs concernés
        for fid in fournisseurs_notifies:
            creer_notification_fournisseur(
                fournisseur_id=fid,
                type_notif='ORDER_CREATED',
                titre='Nouvelle commande',
                message=f"Une nouvelle commande ({commande.reference}) a été passée pour l'un de vos produits.",
                lien='/fournisseur/commandes',
                importance='info',
                objet_type='Commande',
                objet_id=commande.id
            )

        # 🔔 Notifier le client
        creer_notification_client(
            client_id=request.user.id,
            type_notif='ORDER_CREATED',
            titre='Commande créée',
            message=f"Votre commande {commande.reference} a été créée avec succès.",
            lien=f'/mes-commandes/{commande.id}',
            importance='success',
            objet_type='Commande',
            objet_id=commande.id
        )

        # 🧹 Vider panier
        panier.items.all().delete()

        # ---------- CRÉATION ADRESSE ET LIVRAISONS ----------
        adresse_obj = None
        if mode_reception_commande == 'livraison':
            adresse_obj = Adresse.objects.create(
                client=request.user.client,
                nom_destinataire=nom_destinataire,
                telephone=telephone_client,
                ville=adresse_data.get('ville', ''),
                quartier=adresse_data.get('quartier', ''),
                adresse=adresse_data.get('adresse', adresse_livraison),
                point_de_repere=adresse_data.get('point_de_repere', ''),
                instructions=adresse_data.get('instructions', ''),
                latitude=adresse_data.get('latitude'),
                longitude=adresse_data.get('longitude'),
                est_principale=False
            )

            for info in frais_par_magasin.values():
                mag = info['magasin']
                Livraison.objects.create(
                    commande=commande,
                    client=request.user.client,
                    adresse=adresse_obj,
                    magasin=mag,
                    fournisseur=mag.fournisseur,
                    frais_livraison=info['frais'],
                    mode_tarif=info['mode_tarif'],
                    instructions=adresse_data.get('instructions', ''),
                    statut='en_attente_attribution',
                    responsable_type='non_attribue'
                )

        # Recalculer le montant total : sous-total + frais (backend fait foi)
        total = sum((l.sous_total or 0) for l in commande.lignes.all())
        commande.montant_total = total + commande.frais_livraison
        commande.save()

        return Response(
            CommandeSerializer(commande).data,
            status=status.HTTP_201_CREATED
        )


# -----------------------------
# Dashboard Stats
# -----------------------------
class DashboardStatsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # print(f"🔍 Dashboard Stats - User: {request.user}, Role: {request.user.role}")
        
        # Temporarily allow clients to access dashboard stats for testing
        # TODO: Revert to ['admin', 'administrateur'] in production
        if not request.user.is_authenticated:
            # print("❌ Non authentifié")
            return Response(
                {"error": "Accès non autorisé"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Calculate stats
        total_produits = Produit.objects.filter(is_active=True).count()
        total_commandes = Commande.objects.count()
        total_revenue = Commande.objects.aggregate(
            total=models.Sum('montant_total')
        )['total'] or 0
        stock_faible = Produit.objects.filter(stock__lte=5, is_active=True).count()
        
        # print(f"📊 Stats calculées:")
        # print(f"   - Total produits: {total_produits}")
        # print(f"   - Total commandes: {total_commandes}")
        # print(f"   - Total revenue: {total_revenue}")
        # print(f"   - Stock faible: {stock_faible}")
        
        return Response({
            'totalProduits': total_produits,
            'totalCommandes': total_commandes,
            'totalRevenue': float(total_revenue),
            'stockFaible': stock_faible
        })


# -----------------------------
# Weekly Sales Data
# -----------------------------
class WeeklySalesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum
        from django.utils import timezone
        from datetime import timedelta, datetime
        
        # Get sales data for the last 7 days
        sales_data = []
        days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
        
        for i in range(7):
            # Calculate date for this day
            today = timezone.now().date()
            day_date = today - timedelta(days=(6 - i))
            
            # Get sales for this day
            day_sales = Commande.objects.filter(
                date_commande__date=day_date
            ).aggregate(total=Sum('montant_total'))['total'] or 0
            
            sales_data.append({
                'label': days[i],
                'real': round(float(day_sales) / 1000, 1),  # Convert to k
                'target': round(float(day_sales) * 1.2 / 1000, 1) if day_sales > 0 else 5.0,
                'value': f'{round(float(day_sales) / 1000, 1)}k'
            })
        
        return Response(sales_data)


# -----------------------------
# KPI Data
# -----------------------------
class KPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Avg, Count, Sum
        from django.utils import timezone
        from datetime import timedelta
        
        # Calculate KPIs
        # Panier moyen (average order value)
        avg_order_value = Commande.objects.aggregate(
            avg=Avg('montant_total')
        )['avg'] or 0
        
        # Taux de conversion (orders / total clients)
        from account.models import Client
        total_clients = Client.objects.count()
        total_orders = Commande.objects.count()
        conversion_rate = (total_orders / total_clients * 100) if total_clients > 0 else 0
        
        # Clients actifs (clients with orders in last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        active_clients = Commande.objects.filter(
            date_commande__gte=thirty_days_ago
        ).values('client').distinct().count()
        
        # Délai livraison (mock - would need delivery tracking)
        avg_delivery_time = 36  # hours
        
        # Taux satisfaction (mock - would need review system)
        satisfaction_rate = 4.8  # out of 5
        
        return Response([
            {
                'label': 'Panier moyen',
                'value': f'{int(avg_order_value):,} FCFA'.replace(',', ' '),
                'icon': 'bi-wallet2',
                'bg': 'rgba(59,130,246,0.12)',
                'color': '#60a5fa',
                'trend': 5.2
            },
            {
                'label': 'Taux conversion',
                'value': f'{conversion_rate:.1f}%',
                'icon': 'bi-percent',
                'bg': 'rgba(34,197,94,0.12)',
                'color': '#4ade80',
                'trend': 1.1
            },
            {
                'label': 'Clients actifs',
                'value': str(active_clients),
                'icon': 'bi-people-fill',
                'bg': 'rgba(139,92,246,0.12)',
                'color': '#a78bfa',
                'trend': 8.4
            },
            {
                'label': 'Délai livraison',
                'value': f'{avg_delivery_time}h',
                'icon': 'bi-truck',
                'bg': 'rgba(245,158,11,0.12)',
                'color': '#fbbf24',
                'trend': -2.3
            },
            {
                'label': 'Taux satisfaction',
                'value': f'{satisfaction_rate}/5',
                'icon': 'bi-star-fill',
                'bg': 'rgba(236,72,153,0.12)',
                'color': '#f472b6',
                'trend': 0
            }
        ])


# -----------------------------
# Recent Orders
# -----------------------------
class RecentOrdersView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get('limit', 5))
        
        orders = Commande.objects.all().order_by('-date_commande')[:limit]
        
        # Map French status to English for frontend compatibility
        status_mapping = {
            'en_attente': 'pending',
            'validee': 'validated',
            'expediee': 'shipped',
            'livree': 'shipped',
            'annulee': 'cancelled'
        }
        
        orders_data = []
        for order in orders:
            statut = order.statut if hasattr(order, 'statut') else 'en_attente'
            orders_data.append({
                'id': str(order.id),
                'client': f"{order.client.user.nom} {order.client.user.prenom}" if order.client else 'Client inconnu',
                'produits': list(order.lignes.values_list('produit_id', flat=True)),
                'total': float(order.montant_total),
                'statut': status_mapping.get(statut, 'pending')
            })
        
        return Response(orders_data)