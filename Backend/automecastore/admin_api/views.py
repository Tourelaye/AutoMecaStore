from django.contrib.admin.models import LogEntry
from django.contrib.contenttypes.models import ContentType
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import NotFound
from account.permissions import IsAdmin
from account.models import Utilisateur, Fournisseur, FournisseurStatusHistory, Administrateur
from catalog.models import Produit, Categorie
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from orders.models import Commande, LigneCommande
from django.db.models import Sum, Count
from django.db.models.deletion import ProtectedError
from django.db import IntegrityError
from .models import FinanceConfig, PaymentGateway, RolePermission, ApiConfig
from .serializers import (
    FinanceConfigSerializer,
    PaymentGatewaySerializer,
    RolePermissionSerializer,
    ApiConfigSerializer,
    AdminProfileSerializer,
    LogEntrySerializer,
)


class AdminDashboardStatsView(APIView):
    """Statistiques du dashboard admin"""
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            from django.utils import timezone
            now = timezone.now()
            today = now.date()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            produits_total = Produit.objects.count()
            produits_actifs = Produit.objects.filter(statut='actif', statut_approbation='approuve').count()
            attente_validation = Produit.objects.filter(statut_approbation='en_attente').count()
            ruptures_stock = Produit.objects.filter(stock__lt=5).count()
            produits_signales = Produit.objects.filter(is_active=False).count()

            fournisseurs_total = Fournisseur.objects.count()
            fournisseurs_actifs = Fournisseur.objects.filter(statut='actif').count()
            fournisseurs_attente = Fournisseur.objects.filter(statut='attente').count()
            fournisseurs_suspendus = Fournisseur.objects.filter(statut='desactive').count()

            clients_total = Utilisateur.objects.filter(role='client').count()

            commandes_jour = Commande.objects.filter(date_commande__date=today).count()
            commandes_mois = Commande.objects.filter(date_commande__gte=month_start).count()

            lignes_commande = LigneCommande.objects.filter(commande__date_commande__gte=month_start)
            ca_cumule = float(sum(ligne.quantite * ligne.prix_unitaire for ligne in lignes_commande))
            commissions = ca_cumule * 0.10

            # Catégories : volume réel de pièces vendues par catégorie
            cat_rows = (
                lignes_commande
                .exclude(produit__categorie__isnull=True)
                .values('produit__categorie__nom')
                .annotate(qty=Sum('quantite'))
                .order_by('-qty')
            )
            total_cat_qty = sum(int(row['qty']) for row in cat_rows)
            colors = ['violet', 'blue', 'green', 'amber', 'muted']
            categories_stats = []
            for i, row in enumerate(cat_rows):
                qty = int(row['qty'])
                categories_stats.append({
                    'name': row['produit__categorie__nom'],
                    'qty': qty,
                    'pct': round(qty / total_cat_qty * 100) if total_cat_qty > 0 else 0,
                    'color': colors[i % len(colors)]
                })

            chart = [
                {'label': 'Jan', 'value': 52000},
                {'label': 'Fév', 'value': 61000},
                {'label': 'Mar', 'value': 78000},
                {'label': 'Avr', 'value': 68000},
                {'label': 'Mai', 'value': 92000},
                {'label': 'Juin', 'value': 88000},
                {'label': 'Juil', 'value': float(ca_cumule)}
            ]

            # Top fournisseurs par revenu généré
            fournisseur_rows = (
                lignes_commande
                .exclude(produit__fournisseur__isnull=True)
                .values('produit__fournisseur')
                .annotate(revenue=Sum('sous_total'), orders=Count('commande', distinct=True))
                .order_by('-revenue')
            )
            fournisseur_ids = [row['produit__fournisseur'] for row in fournisseur_rows]
            fournisseurs_map = {f.user_id: f for f in Fournisseur.objects.filter(user_id__in=fournisseur_ids)}

            top_fournisseurs = []
            for i, row in enumerate(fournisseur_rows[:5], 1):
                f = fournisseurs_map.get(row['produit__fournisseur'])
                top_fournisseurs.append({
                    'rank': i,
                    'name': f.nom_entreprise if f else 'Fournisseur inconnu',
                    'vendor': f.user.nom if f and f.user else '',
                    'orders': row['orders'],
                    'revenue': float(row['revenue'] or 0),
                    'rating': 0,
                    'reviews': 0
                })

            # Top produits par quantité vendue
            produit_rows = (
                lignes_commande
                .exclude(produit__isnull=True)
                .values('produit')
                .annotate(sales=Sum('quantite'), revenue=Sum('sous_total'))
                .order_by('-sales')
            )
            produit_ids = [row['produit'] for row in produit_rows]
            produits_map = {p.id: p for p in Produit.objects.filter(id__in=produit_ids)}

            top_produits = []
            for i, row in enumerate(produit_rows[:5], 1):
                p = produits_map.get(row['produit'])
                top_produits.append({
                    'rank': i,
                    'name': p.nom if p else 'Produit inconnu',
                    'ref': p.reference or '' if p else '',
                    'category': p.categorie.nom if p and p.categorie else '',
                    'sales': int(row['sales'] or 0),
                    'price': float(p.prix) if p else 0
                })

            return Response({
                'caCumule': float(ca_cumule),
                'commissions': float(commissions),
                'fournisseursTotal': fournisseurs_total,
                'fournisseursActifs': fournisseurs_actifs,
                'fournisseursAttente': fournisseurs_attente,
                'clientsTotal': clients_total,
                'produitsTotal': produits_total,
                'produitsActifs': produits_actifs,
                'attenteValidation': attente_validation,
                'commandesJour': commandes_jour,
                'commandesMois': commandes_mois,
                'reclamationsActives': 0,
                'rupturesStock': ruptures_stock,
                'produitsSignales': produits_signales,
                'fournisseursSuspendus': fournisseurs_suspendus,
                'commissionRate': '10% standard',
                'evolutionPct': 15.4,
                'categories': categories_stats,
                'chart': chart,
                'topFournisseurs': top_fournisseurs,
                'topProduits': top_produits
            })
        except Exception as e:
            return Response({'error': f'Erreur lors de la récupération des statistiques: {str(e)}'}, status=500)


class LogEntryListView(APIView):
    """Journal d'activité admin"""
    permission_classes = [IsAdmin]

    def get(self, request):
        entries = LogEntry.objects.select_related('user', 'content_type').order_by('-action_time')[:200]
        data = []
        for entry in entries:
            data.append({
                'id': entry.id,
                'action_time': entry.action_time,
                'user': entry.user.get_full_name() or entry.user.email,
                'content_type': entry.content_type.name if entry.content_type else 'Inconnu',
                'object_repr': entry.object_repr,
                'action_flag': entry.action_flag,
            })
        return Response(data)


class LogEntryDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            entry = LogEntry.objects.select_related('user', 'content_type').get(pk=pk)
            return Response({
                'id': entry.id,
                'action_time': entry.action_time,
                'user': entry.user.get_full_name() or entry.user.email,
                'content_type': entry.content_type.name if entry.content_type else 'Inconnu',
                'object_repr': entry.object_repr,
                'action_flag': entry.action_flag,
            })
        except LogEntry.DoesNotExist:
            return Response({'error': 'Entrée non trouvée'}, status=404)


class AdminProfileView(APIView):
    """Profil de l'administrateur connecté"""
    permission_classes = [IsAdmin]

    def get(self, request):
        user = request.user
        return Response({
            'full_name': f"{user.prenom} {user.nom}".strip() or user.email,
            'email': user.email,
        })


class FinanceConfigView(APIView):
    """Configuration financière"""
    permission_classes = [IsAdmin]

    def get(self, request):
        config = FinanceConfig.get_instance()
        serializer = FinanceConfigSerializer(config)
        return Response(serializer.data)

    def put(self, request):
        config = FinanceConfig.get_instance()
        serializer = FinanceConfigSerializer(config, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class PaymentGatewayListView(generics.ListAPIView):
    queryset = PaymentGateway.objects.all()
    serializer_class = PaymentGatewaySerializer
    permission_classes = [IsAdmin]


class PaymentGatewayDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            gateway = PaymentGateway.objects.get(pk=pk)
            return Response(PaymentGatewaySerializer(gateway).data)
        except PaymentGateway.DoesNotExist:
            return Response({'error': 'Passerelle non trouvée'}, status=404)

    def put(self, request, pk):
        try:
            gateway = PaymentGateway.objects.get(pk=pk)
            serializer = PaymentGatewaySerializer(gateway, data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except PaymentGateway.DoesNotExist:
            return Response({'error': 'Passerelle non trouvée'}, status=404)


class PaymentGatewayToggleView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            gateway = PaymentGateway.objects.get(pk=pk)
            gateway.enabled = not gateway.enabled
            gateway.save()
            return Response(PaymentGatewaySerializer(gateway).data)
        except PaymentGateway.DoesNotExist:
            return Response({'error': 'Passerelle non trouvée'}, status=404)


class RolePermissionListView(generics.ListAPIView):
    queryset = RolePermission.objects.all()
    serializer_class = RolePermissionSerializer
    permission_classes = [IsAdmin]


class ApiConfigView(APIView):
    """Configuration API"""
    permission_classes = [IsAdmin]

    def get(self, request):
        config = ApiConfig.get_instance()
        return Response(ApiConfigSerializer(config).data)

    def put(self, request):
        config = ApiConfig.get_instance()
        serializer = ApiConfigSerializer(config, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


# =========================================================
# ADMIN - GESTION PRODUITS
# =========================================================
def map_produit_to_admin(produit):
    return {
        'id': produit.id,
        'ref': produit.reference or '',
        'name': produit.nom,
        'category': produit.categorie.nom if produit.categorie else '',
        'vendor': produit.fournisseur.nom_entreprise if produit.fournisseur else 'AutoMecaStore',
        'image': produit.image.url if produit.image else None,
        'price': float(produit.prix),
        'stock': produit.stock,
        'sales': produit.nombre_ventes,
        'state': (
            'attente_validation' if produit.statut_approbation == 'en_attente'
            else 'en_ligne' if produit.statut == 'actif' and not produit.signale
            else 'desactive' if produit.statut == 'inactif'
            else 'en_ligne'
        ),
        'signale': produit.signale,
        'signalReason': produit.motif_rejet,
        'sections': {
            'bestOffer': produit.est_meilleure_offre,
            'flashSale': produit.est_en_promo,
            'bestSeller': produit.est_bestseller,
            'trending': produit.est_tendance,
            'lightningSale': produit.vente_eclair,
        }
    }


class AdminProduitListView(APIView):
    """Liste les produits approuvés pour la gestion admin"""
    permission_classes = [IsAdmin]

    def get(self, request):
        # Seuls les produits approuvés et actifs apparaissent dans la gestion des produits.
        # L'approbation/rejet se fait exclusivement dans Approbation Produit.
        # Les produits supprimés (soft delete) sont exclus.
        produits = Produit.objects.filter(
            statut_approbation='approuve'
        ).select_related('categorie', 'fournisseur')
        data = [map_produit_to_admin(p) for p in produits]
        return Response(data)


class AdminProduitToggleActiveView(APIView):
    """Active / désactive un produit"""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            produit = Produit.all_objects.get(pk=pk)
            statut = request.data.get('statut', 'actif')
            produit.statut = 'actif' if statut == 'actif' else 'inactif'
            if produit.statut == 'actif':
                produit.signale = False
                produit.motif_rejet = ''
            produit.save()
            return Response(map_produit_to_admin(produit))
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


class AdminProduitSignalView(APIView):
    """Signale / retire le signalement d'un produit"""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            produit = Produit.all_objects.get(pk=pk)
            signale = request.data.get('signale', True)
            motif = request.data.get('motif') or request.data.get('motif_rejet')
            produit.signale = bool(signale)
            if produit.signale:
                produit.motif_rejet = motif or 'Signalé par un administrateur'
                produit.statut = 'inactif'
            else:
                produit.motif_rejet = ''
                produit.statut = 'actif'
            produit.save()
            return Response(map_produit_to_admin(produit))
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


class AdminProduitDeleteView(APIView):
    """Détail et suppression (soft delete) d'un produit"""
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            produit = Produit.all_objects.get(pk=pk)
            return Response({
                'id': produit.id,
                'nom': produit.nom,
                'description': produit.description,
                'prix': float(produit.prix),
                'stock': produit.stock,
                'image': produit.image.url if produit.image else None,
                'categorie': produit.categorie.id if produit.categorie else None,
                'categorie_nom': produit.categorie.nom if produit.categorie else '',
                'fournisseur': produit.fournisseur.pk if produit.fournisseur else None,
                'fournisseur_nom': produit.fournisseur.nom_entreprise if produit.fournisseur else '',
                'reference': produit.reference or '',
                'marque': produit.marque or '',
                'statut_approbation': produit.statut_approbation,
                'motif_rejet': produit.motif_rejet or '',
                'created_at': getattr(produit, 'created_at', None)
            })
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)

    def delete(self, request, pk):
        try:
            produit = Produit.all_objects.get(pk=pk)
            produit.soft_delete()
            return Response({'message': 'Produit supprimé avec succès'})
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


class AdminProduitSectionsView(APIView):
    """Met à jour les tags/sections d'un produit (meilleures offres, ventes flash, etc.)"""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            produit = Produit.all_objects.get(pk=pk)
            data = request.data
            produit.est_meilleure_offre = bool(data.get('bestOffer', produit.est_meilleure_offre))
            produit.est_en_promo = bool(data.get('flashSale', produit.est_en_promo))
            produit.est_bestseller = bool(data.get('bestSeller', produit.est_bestseller))
            produit.est_tendance = bool(data.get('trending', produit.est_tendance))
            produit.vente_eclair = bool(data.get('lightningSale', produit.vente_eclair))
            produit.save()
            return Response(map_produit_to_admin(produit))
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


class AdminProduitEnAttenteListView(APIView):
    """Liste les produits en attente d'approbation"""
    permission_classes = [IsAdmin]

    def get(self, request):
        statut_approbation = request.query_params.get('statut_approbation', 'en_attente')
        queryset = Produit.all_objects.select_related('categorie', 'fournisseur')
        if statut_approbation and statut_approbation.lower() not in ('tous', 'all'):
            queryset = queryset.filter(statut_approbation=statut_approbation)
        # Ne garder que les produits soumis par un fournisseur dans l'approbation.
        produits = queryset.exclude(fournisseur__isnull=True)
        data = []
        for p in produits:
            data.append({
                'id': p.id,
                'nom': p.nom,
                'description': p.description,
                'prix': float(p.prix),
                'stock': p.stock,
                'image': p.image.url if p.image else None,
                'categorie': p.categorie.id if p.categorie else None,
                'categorie_nom': p.categorie.nom if p.categorie else '',
                'fournisseur': p.fournisseur.pk if p.fournisseur else None,
                'fournisseur_nom': p.fournisseur.nom_entreprise if p.fournisseur else '',
                'statut_approbation': p.statut_approbation,
                'motif_rejet': p.motif_rejet or '',
                'created_at': getattr(p, 'created_at', None)
            })
        return Response(data)


class AdminProduitApprobationView(APIView):
    """Approuve ou rejette un produit"""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            produit = Produit.all_objects.get(pk=pk)
            statut = request.data.get('statut')
            motif = request.data.get('motif_rejet') or request.data.get('motif')
            if statut == 'approuve':
                produit.statut_approbation = 'approuve'
                produit.statut = 'actif'
                produit.motif_rejet = ''
            elif statut == 'rejete':
                produit.statut_approbation = 'rejete'
                produit.statut = 'inactif'
                produit.motif_rejet = motif or ''
            else:
                return Response({'error': 'Statut invalide. Utilisez approuve ou rejete.'}, status=400)
            produit.save()
            return Response({
                'id': produit.id,
                'nom': produit.nom,
                'description': produit.description,
                'prix': float(produit.prix),
                'stock': produit.stock,
                'image': produit.image.url if produit.image else None,
                'categorie': produit.categorie.id if produit.categorie else None,
                'categorie_nom': produit.categorie.nom if produit.categorie else '',
                'fournisseur': produit.fournisseur.pk if produit.fournisseur else None,
                'fournisseur_nom': produit.fournisseur.nom_entreprise if produit.fournisseur else '',
                'statut_approbation': produit.statut_approbation,
                'motif_rejet': produit.motif_rejet or '',
                'created_at': getattr(produit, 'created_at', None)
            })
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


class AdminFournisseurListView(generics.ListAPIView):
    """Liste tous les fournisseurs pour l'admin"""
    queryset = Fournisseur.objects.select_related('user').all()
    permission_classes = [IsAdmin]

    def get(self, request):
        fournisseurs = self.get_queryset()
        data = []
        for f in fournisseurs:
            data.append({
                'user': {
                    'id': f.user.id,
                    'nom': f.user.nom,
                    'prenom': f.user.prenom,
                    'email': f.user.email,
                    'role': f.user.role,
                    'adresse': f.user.adresse,
                    'telephone': f.user.telephone,
                    'is_active': f.user.is_active,
                    'date_joined': f.user.date_joined,
                },
                'nom_entreprise': f.nom_entreprise,
                'description': f.description,
                'siret': f.siret,
                'logo': f.logo.url if f.logo else None,
                'date_inscription': f.date_inscription,
                'statut': f.statut,
                'statut_label': f.get_statut_display() if hasattr(f, 'get_statut_display') else f.statut,
                'note_moyenne': f.note_moyenne,
                'nombre_avis': f.nombre_avis,
                'nombre_produits': f.nombre_produits,
                'nombre_ventes': f.nombre_ventes,
                'chiffre_affaires': f.chiffre_affaires,
                'nom_complet': f.nom_complet,
            })
        return Response(data)


class AdminFournisseurDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, user_id):
        try:
            f = Fournisseur.objects.select_related('user').get(user_id=user_id)
            return Response({
                'user': {
                    'id': f.user.id,
                    'nom': f.user.nom,
                    'prenom': f.user.prenom,
                    'email': f.user.email,
                    'role': f.user.role,
                    'adresse': f.user.adresse,
                    'telephone': f.user.telephone,
                    'is_active': f.user.is_active,
                    'date_joined': f.user.date_joined,
                },
                'nom_entreprise': f.nom_entreprise,
                'description': f.description,
                'siret': f.siret,
                'logo': f.logo.url if f.logo else None,
                'date_inscription': f.date_inscription,
                'statut': f.statut,
                'statut_label': f.get_statut_display() if hasattr(f, 'get_statut_display') else f.statut,
                'note_moyenne': f.note_moyenne,
                'nombre_avis': f.nombre_avis,
                'nombre_produits': f.nombre_produits,
                'nombre_ventes': f.nombre_ventes,
                'chiffre_affaires': f.chiffre_affaires,
                'nom_complet': f.nom_complet,
            })
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)


class AdminFournisseurValidationView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        try:
            from django.utils import timezone
            f = Fournisseur.objects.select_related('user').get(user_id=user_id)
            action = request.data.get('action')
            commentaire = request.data.get('commentaire') or request.data.get('motif') or ''

            admin_user = request.user
            administrateur = getattr(admin_user, 'administrateur', None)

            now = timezone.now()
            old_statut = f.statut

            if action == 'valider':
                f.statut = 'actif'
                f.user.is_active = True
                f.date_validation = now
                f.validated_by = administrateur
                f.raison_refus = ''
            elif action == 'suspendre':
                f.statut = 'desactive'
                f.user.is_active = True
                f.raison_refus = commentaire
            elif action == 'reactiver':
                f.statut = 'actif'
                f.user.is_active = True
                f.date_validation = now
                f.validated_by = administrateur
                f.raison_refus = ''
            else:
                return Response({'error': 'Action invalide. Utilisez valider, suspendre ou reactiver.'}, status=400)

            f.save()
            f.user.save()

            FournisseurStatusHistory.objects.create(
                fournisseur=f,
                statut=f.statut,
                changed_by=administrateur,
                commentaire=commentaire
            )

            self._notify_fournisseur_status(f, action, commentaire)

            return Response({
                'message': f"Statut du fournisseur mis à jour : {f.statut}",
                'statut': f.statut,
                'user_id': f.user.id,
                'old_statut': old_statut
            })
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)

    def _notify_fournisseur_status(self, fournisseur, action, commentaire):
        try:
            user = fournisseur.user
            if action in ('valider', 'reactiver'):
                subject = 'Votre compte fournisseur AutoMecaStore a été approuvé'
                html = render_to_string('emails/fournisseur_approved.html', {
                    'nom': f"{user.prenom or ''} {user.nom or ''}".strip() or user.email,
                    'prenom': user.prenom or '',
                    'entreprise': fournisseur.nom_entreprise,
                    'email': user.email,
                    'site_name': 'AutoMecaStore'
                })
                plain = (
                    f"Bonjour {user.prenom or ''},\n\n"
                    f"Votre compte fournisseur {fournisseur.nom_entreprise} a été approuvé.\n"
                    f"Vous pouvez dès maintenant vous connecter à votre espace vendeur : https://automecastore.sn/fournisseur/login\n\n"
                    f"L'équipe AutoMecaStore"
                )
            elif action == 'suspendre':
                subject = 'Votre demande de compte fournisseur AutoMecaStore'
                html = render_to_string('emails/fournisseur_rejected.html', {
                    'nom': f"{user.prenom or ''} {user.nom or ''}".strip() or user.email,
                    'prenom': user.prenom or '',
                    'entreprise': fournisseur.nom_entreprise,
                    'email': user.email,
                    'raison': commentaire or "Aucune raison donnée.",
                    'site_name': 'AutoMecaStore'
                })
                plain = (
                    f"Bonjour {user.prenom or ''},\n\n"
                    f"Votre demande de compte fournisseur {fournisseur.nom_entreprise} a été refusée.\n"
                    f"Raison : {commentaire or 'Aucune raison donnée'}\n\n"
                    f"L'équipe AutoMecaStore"
                )
            else:
                return

            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@automecastore.sn')
            send_mail(
                subject,
                plain,
                from_email,
                [user.email],
                html_message=html,
                fail_silently=True
            )
        except Exception as e:
            print(f"DEBUG: Erreur envoi email fournisseur: {e}")


class AdminFournisseurDeleteView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def delete(self, request, user_id):
        try:
            f = Fournisseur.objects.select_related('user').get(user_id=user_id)
            user = f.user
            email = user.email
            f.delete()
            user.delete()
            return Response({'message': f'Fournisseur {email} supprimé avec succès'})
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)
        except (ProtectedError, IntegrityError) as e:
            return Response({'error': f'Impossible de supprimer ce fournisseur : des données liées existent. ({str(e)})'}, status=400)


class AdminFournisseurCommandesView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, user_id):
        try:
            f = Fournisseur.objects.get(user_id=user_id)
            from orders.models import LigneCommande
            lignes = LigneCommande.objects.filter(
                produit__fournisseur=f
            ).select_related('commande', 'commande__client__user', 'produit')

            commandes_dict = {}
            for ligne in lignes:
                cmd = ligne.commande
                if not cmd:
                    continue

                cmd_id = cmd.id
                if cmd_id not in commandes_dict:
                    client = getattr(cmd, 'client', None)
                    nom_client = 'Client'
                    email_client = ''
                    if client:
                        u = getattr(client, 'user', None)
                        if u:
                            nom_client = f"{u.prenom or ''} {u.nom or ''}".strip() or 'Client'
                            email_client = u.email or ''

                    commandes_dict[cmd_id] = {
                        'id': cmd_id,
                        'reference': cmd.reference,
                        'date': cmd.date_commande.isoformat() if cmd.date_commande else None,
                        'statut': cmd.statut,
                        'montant_total': float(cmd.montant_total or 0),
                        'client': nom_client,
                        'email': email_client,
                        'lignes': []
                    }

                commandes_dict[cmd_id]['lignes'].append({
                    'produit': ligne.produit.nom if ligne.produit else '',
                    'quantite': ligne.quantite,
                    'prix_unitaire': float(ligne.prix_unitaire or 0),
                    'sous_total': float(ligne.sous_total or (ligne.quantite * (ligne.prix_unitaire or 0))),
                })

            commandes = list(commandes_dict.values())
            stats = {
                'total_commandes': len(commandes),
                'montant_cumule': sum(c['montant_total'] for c in commandes),
            }

            return Response({
                'commandes': commandes,
                'stats': stats
            })
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)


class AdminFournisseurProduitsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, user_id):
        try:
            f = Fournisseur.objects.get(user_id=user_id)
            produits = Produit.objects.filter(fournisseur=f)
            data = []
            for p in produits:
                data.append({
                    'id': p.id,
                    'nom': p.nom,
                    'reference': p.reference,
                    'prix': float(p.prix),
                    'stock': p.stock,
                    'nombre_ventes': p.nombre_ventes,
                    'is_active': p.is_active,
                    'statut': p.statut,
                    'statut_approbation': p.statut_approbation,
                })

            stats = {
                'total_produits': len(data),
                'produits_actifs': sum(1 for p in data if p['is_active']),
                'total_stock': sum(p['stock'] for p in data),
            }

            return Response({
                'produits': data,
                'stats': stats
            })
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)


class AdminFournisseurStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, user_id):
        try:
            f = Fournisseur.objects.get(user_id=user_id)
            produits = Produit.objects.filter(fournisseur=f)
            from orders.models import LigneCommande
            lignes = LigneCommande.objects.filter(produit__fournisseur=f)

            stats = {
                'produits': {
                    'total': produits.count(),
                    'actifs': produits.filter(is_active=True).count(),
                    'ruptures': produits.filter(stock=0, is_active=True).count(),
                    'total_stock': produits.aggregate(total=Sum('stock'))['total'] or 0,
                },
                'commandes': {
                    'total': lignes.values('commande_id').distinct().count(),
                    'total_lignes': lignes.count(),
                    'montant_cumule': float(lignes.aggregate(total=Sum('sous_total'))['total'] or 0),
                    'quantite_totale': lignes.aggregate(total=Sum('quantite'))['total'] or 0,
                },
                'ventes': {
                    'total_ventes': produits.aggregate(total=Sum('nombre_ventes'))['total'] or 0,
                    'total_favoris': produits.aggregate(total=Sum('nombre_favoris'))['total'] or 0,
                    'total_vues': produits.aggregate(total=Sum('nombre_vues'))['total'] or 0,
                }
            }

            return Response(stats)
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)
