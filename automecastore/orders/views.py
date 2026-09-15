from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from django.db import transaction, models
from .models import Commande, LigneCommande, Panier, PanierItem
from .serializers import CommandeSerializer, LigneCommandeSerializer, PanierSerializer, PanierItemSerializer
from catalog.models import Produit


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

        if produit.stock < quantite:
            return Response(
                {"error": "Stock insuffisant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        item, created = PanierItem.objects.get_or_create(
            panier=panier,
            produit=produit
        )

        if not created:
            item.quantite += quantite
        else:
            item.quantite = quantite

        item.save()

        return Response(PanierSerializer(panier).data)


# -----------------------------
# Commande
# -----------------------------
class CommandeListView(generics.ListAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Commande.objects.all().order_by('-date_commande')

class CommandeDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Commande.objects.all()

class CommandeCreateView(generics.CreateAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)


# -----------------------------
# Ligne commande
# -----------------------------
class LigneCommandeCreateView(generics.CreateAPIView):
    serializer_class = LigneCommandeSerializer
    permission_classes = [permissions.IsAuthenticated]


# -----------------------------
# Créer commande depuis panier
# -----------------------------
class CreerCommandeDepuisPanierView(generics.CreateAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        print(f" Créer commande depuis panier - User: {request.user}")
        print(f" Request data: {request.data}")

        try:
            panier = Panier.objects.get(client=request.user.client)
            print(f" Panier trouvé: ID={panier.id}")
        except Panier.DoesNotExist:
            print(" Panier introuvable")
            return Response(
                {"error": "Panier introuvable"},
                status=status.HTTP_404_NOT_FOUND
            )

        if not panier.items.exists():
            print(" Panier vide")
            return Response(
                {"error": "Panier vide"},
                status=status.HTTP_400_BAD_REQUEST
            )

        print(f" Nombre d'items dans panier: {panier.items.count()}")

        commande = Commande.objects.create(client=request.user.client)
        print(f" Commande créée: ID={commande.id}, Reference={commande.reference}")

        for item in panier.items.all():
            produit = item.produit
            print(f" Produit: {produit.nom}, Quantité demandée: {item.quantite}, Stock disponible: {produit.stock}")

            if produit.stock < item.quantite:
                print(f" Stock insuffisant pour {produit.nom}")
                return Response(
                    {"error": f"Stock insuffisant pour {produit.nom}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            LigneCommande.objects.create(
                commande=commande,
                produit=produit,
                quantite=item.quantite
            )

            # 🔻 Déduction stock
            produit.stock -= item.quantite
            produit.save()
            print(f" Stock déduit pour {produit.nom}: nouveau stock={produit.stock}")

        # 🧹 Vider panier
        panier.items.all().delete()

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
        print(f" Dashboard Stats - User: {request.user}, Role: {request.user.role}")
        
        # Temporarily allow clients to access dashboard stats for testing
        # TODO: Revert to ['admin', 'administrateur'] in production
        if not request.user.is_authenticated:
            print(" Non authentifié")
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
        
        print(f" Stats calculées:")
        print(f"   - Total produits: {total_produits}")
        print(f"   - Total commandes: {total_commandes}")
        print(f"   - Total revenue: {total_revenue}")
        print(f"   - Stock faible: {stock_faible}")
        
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


# -----------------------------
# Admin - Gestion des commandes
# -----------------------------
from rest_framework_simplejwt.authentication import JWTAuthentication
from account.permissions import IsAdmin
from django.db.models import Sum, Avg, Q
from datetime import timedelta
from django.utils import timezone


def _build_admin_commande_data(cmd):
    lignes = list(cmd.lignes.all())
    nombre_produits = sum(l.quantite for l in lignes)
    client = cmd.client
    client_user = client.user if client else None

    return {
        'id': cmd.id,
        'reference': cmd.reference or f"CMD{cmd.id}",
        'date_commande': cmd.date_commande.isoformat() if cmd.date_commande else None,
        'statut': cmd.statut,
        'montant_total': float(cmd.montant_total),
        'frais_livraison': 0,
        'mode_paiement': '',
        'mode_reception': '',
        'client': {
            'id': client_user.id if client_user else 0,
            'nom': client_user.nom if client_user else '',
            'prenom': client_user.prenom if client_user else '',
            'email': client_user.email if client_user else '',
            'telephone': getattr(client_user, 'telephone', '') or '',
            'adresse': getattr(client_user, 'adresse', '') or '',
        } if client_user else None,
        'magasins': [],
        'nombre_produits': nombre_produits,
        'alertes': [],
    }


class AdminCommandeListView(generics.ListAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = Commande.objects.select_related('client__user').prefetch_related('lignes').order_by('-date_commande')

        statut = request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)

        periode = request.query_params.get('periode')
        today = timezone.now().date()
        if periode == 'today':
            qs = qs.filter(date_commande__date=today)
        elif periode == 'week':
            start = today - timedelta(days=today.weekday())
            qs = qs.filter(date_commande__date__gte=start)
        elif periode == 'month':
            qs = qs.filter(date_commande__year=today.year, date_commande__month=today.month)
        elif periode == 'livrees':
            qs = qs.filter(statut='livree')
        elif periode == 'annulees':
            qs = qs.filter(statut='annulee')

        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(
                Q(reference__icontains=q) |
                Q(client__user__nom__icontains=q) |
                Q(client__user__prenom__icontains=q)
            ).distinct()

        data = [_build_admin_commande_data(cmd) for cmd in qs]
        return Response(data)


class AdminCommandeDetailView(generics.RetrieveAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            cmd = Commande.objects.select_related('client__user').prefetch_related('lignes__produit').get(pk=pk)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande non trouvée'}, status=status.HTTP_404_NOT_FOUND)

        base = _build_admin_commande_data(cmd)
        base['lignes'] = [{
            'id': l.id,
            'produit': {
                'id': l.produit.id if l.produit else 0,
                'nom': l.produit.nom if l.produit else '',
                'image': None,
            },
            'quantite': l.quantite,
            'prix_unitaire': float(l.prix_unitaire),
            'sous_total': float(l.sous_total) if l.sous_total else float(l.prix_unitaire) * l.quantite,
            'magasin': None,
        } for l in cmd.lignes.all()]
        base['historique'] = []
        base['livraison'] = None
        base['reclamations'] = []
        return Response(base)


class AdminCommandeStatsView(generics.ListAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        total = Commande.objects.count()
        aujourdhui = Commande.objects.filter(date_commande__date=today).count()
        terminees = Commande.objects.filter(statut='livree').count()
        annulees = Commande.objects.filter(statut='annulee').count()
        en_preparation = Commande.objects.filter(statut__in=['en_attente', 'validee', 'expediee']).count()

        montant_total = float(Commande.objects.aggregate(total=Sum('montant_total'))['total'] or 0)
        panier_moyen = float(Commande.objects.aggregate(avg=Avg('montant_total'))['avg'] or 0)

        montant_jour = float(Commande.objects.filter(date_commande__date=today).aggregate(total=Sum('montant_total'))['total'] or 0)
        montant_semaine = float(Commande.objects.filter(date_commande__date__gte=week_start).aggregate(total=Sum('montant_total'))['total'] or 0)
        montant_mois = float(Commande.objects.filter(date_commande__date__gte=month_start).aggregate(total=Sum('montant_total'))['total'] or 0)

        return Response({
            'total': total,
            'aujourdhui': aujourdhui,
            'terminees': terminees,
            'annulees': annulees,
            'en_preparation': en_preparation,
            'montant_total': montant_total,
            'panier_moyen': panier_moyen,
            'temps_moyen_heures': 0,
            'montant_jour': montant_jour,
            'montant_semaine': montant_semaine,
            'montant_mois': montant_mois,
        })


class AdminCommandeAlertsView(generics.ListAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        now = timezone.now()
        alertes = []
        qs = Commande.objects.select_related('client__user').all()

        for cmd in qs:
            delta = now - cmd.date_commande
            if cmd.statut == 'en_attente' and delta > timedelta(hours=2):
                alertes.append({
                    'id': f"{cmd.id}-bloquee",
                    'commande_id': cmd.id,
                    'reference': cmd.reference or f"CMD{cmd.id}",
                    'type': 'bloquee',
                    'label': 'Commande bloquée',
                    'severity': 'high',
                    'client': f"{cmd.client.user.nom} {cmd.client.user.prenom}".strip() if cmd.client else 'Client inconnu',
                })
            if cmd.statut == 'annulee':
                alertes.append({
                    'id': f"{cmd.id}-annulee",
                    'commande_id': cmd.id,
                    'reference': cmd.reference or f"CMD{cmd.id}",
                    'type': 'annulee',
                    'label': 'Commande annulée',
                    'severity': 'high',
                    'client': f"{cmd.client.user.nom} {cmd.client.user.prenom}".strip() if cmd.client else 'Client inconnu',
                })

        return Response(alertes)


class AdminCommandeActionView(generics.GenericAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            cmd = Commande.objects.get(pk=pk)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande non trouvée'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        statut_map = {
            'accepter': 'validee',
            'refuser': 'annulee',
            'preparer': 'validee',
            'prete': 'validee',
            'expedier': 'expediee',
            'livrer': 'livree',
            'terminer': 'livree',
            'annuler': 'annulee',
        }

        if action in statut_map:
            cmd.statut = statut_map[action]
            cmd.save()
            return Response({'message': f'Statut mis à jour: {cmd.statut}'})

        return Response({'error': 'Action non reconnue'}, status=status.HTTP_400_BAD_REQUEST)