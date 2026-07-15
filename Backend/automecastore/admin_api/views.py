from django.contrib.admin.models import LogEntry
from django.contrib.contenttypes.models import ContentType
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from rest_framework.exceptions import NotFound
from account.permissions import IsAdmin
from account.models import Utilisateur, Fournisseur
from catalog.models import Produit, Categorie
from orders.models import Commande, LigneCommande
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
            fournisseurs_attente = Fournisseur.objects.filter(statut='desactive').count()
            fournisseurs_suspendus = Fournisseur.objects.filter(statut='desactive').count()

            clients_total = Utilisateur.objects.filter(role='client').count()

            commandes_jour = Commande.objects.filter(date_commande__date=today).count()
            commandes_mois = Commande.objects.filter(date_commande__gte=month_start).count()

            lignes_commande = LigneCommande.objects.filter(commande__date_commande__gte=month_start)
            ca_cumule = sum(ligne.quantite * ligne.prix_unitaire for ligne in lignes_commande)
            commissions = ca_cumule * 0.10

            categories_stats = []
            categories = Categorie.objects.all()
            for cat in categories:
                qty = Produit.objects.filter(categorie=cat).count()
                if qty > 0:
                    categories_stats.append({
                        'name': cat.nom,
                        'qty': qty,
                        'pct': round(qty / produits_total * 100) if produits_total > 0 else 0,
                        'color': 'violet'
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

            top_fournisseurs = []
            for i, fournisseur in enumerate(Fournisseur.objects.all()[:5], 1):
                top_fournisseurs.append({
                    'rank': i,
                    'name': fournisseur.nom_entreprise,
                    'vendor': fournisseur.user.nom if fournisseur.user else '',
                    'orders': 0,
                    'revenue': 0,
                    'rating': 0,
                    'reviews': 0
                })

            top_produits = []
            for i, produit in enumerate(Produit.objects.all()[:5], 1):
                top_produits.append({
                    'rank': i,
                    'name': produit.nom,
                    'ref': produit.reference or '',
                    'category': produit.categorie.nom if produit.categorie else '',
                    'sales': 0,
                    'price': float(produit.prix)
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
    }


class AdminProduitListView(APIView):
    """Liste tous les produits pour l'admin"""
    permission_classes = [IsAdmin]

    def get(self, request):
        produits = Produit.all_objects.select_related('categorie', 'fournisseur').all()
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
    """Suppression (soft delete) d'un produit"""
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        try:
            produit = Produit.all_objects.get(pk=pk)
            produit.soft_delete()
            return Response({'message': 'Produit supprimé avec succès'})
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


class AdminProduitEnAttenteListView(APIView):
    """Liste les produits en attente d'approbation"""
    permission_classes = [IsAdmin]

    def get(self, request):
        produits = Produit.all_objects.filter(statut_approbation='en_attente').select_related('categorie', 'fournisseur')
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
                'fournisseur': p.fournisseur.id if p.fournisseur else None,
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
                'fournisseur': produit.fournisseur.id if produit.fournisseur else None,
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
    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        try:
            f = Fournisseur.objects.select_related('user').get(user_id=user_id)
            action = request.data.get('action')
            if action == 'valider':
                f.statut = 'actif'
                f.user.is_active = True
            elif action == 'suspendre':
                f.statut = 'desactive'
                f.user.is_active = False
            elif action == 'reactiver':
                f.statut = 'actif'
                f.user.is_active = True
            f.save()
            f.user.save()
            return Response({
                'message': f"Statut du fournisseur mis à jour : {f.statut}",
                'statut': f.statut,
                'user_id': f.user.id
            })
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)


class AdminFournisseurDeleteView(APIView):
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


class AdminFournisseurCommandesView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, user_id):
        try:
            f = Fournisseur.objects.get(user_id=user_id)
            from orders.models import LigneCommande
            lignes = LigneCommande.objects.filter(produit__fournisseur=f)
            commandes = []
            for ligne in lignes:
                commandes.append({
                    'id': ligne.commande.id,
                    'reference': ligne.commande.reference,
                    'client': f"{ligne.commande.client.prenom} {ligne.commande.client.nom}" if ligne.commande.client else 'Client',
                    'produit': ligne.produit.nom,
                    'quantite': ligne.quantite,
                    'prix_unitaire': float(ligne.prix_unitaire),
                    'total': float(ligne.quantite * ligne.prix_unitaire),
                    'statut': ligne.commande.statut,
                    'date_commande': ligne.commande.date_commande,
                })
            return Response(commandes)
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
                    'statut': p.statut,
                    'statut_approbation': p.statut_approbation,
                })
            return Response(data)
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
            return Response({
                'produits_total': produits.count(),
                'produits_actifs': produits.filter(is_active=True).count(),
                'commandes_total': len(set(l.values_list('commande_id', flat=True).distinct())),
                'chiffre_affaires': float(sum(l.quantite * l.prix_unitaire for l in lignes)),
                'ventes_total': sum(l.quantite for l in lignes),
            })
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)
