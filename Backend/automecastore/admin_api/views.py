import logging

logger = logging.getLogger(__name__)

from django.contrib.admin.models import LogEntry
from django.contrib.contenttypes.models import ContentType
from rest_framework.views import APIView
from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework import status, generics, permissions, parsers
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import NotFound
from account.permissions import IsAdmin
from account.models import Utilisateur, Fournisseur, FournisseurStatusHistory, Administrateur, Client, SecurityActivity, UserSession
from catalog.models import Produit, Categorie, Marque
from support.models import Avis, Reclamation, SignalementAvis
from fournisseur.models import Magasin, creer_notification_fournisseur, creer_notification_client
from fournisseur.serializers import MagasinSerializer
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from orders.models import Commande, LigneCommande, HistoriqueCommande
from delivery.models import Livraison
from django.db.models import Sum, Count, Q, Avg, F, Max, Value
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
    CommandeAdminListSerializer,
    CommandeAdminDetailSerializer,
    UtilisateurAdminListSerializer,
    UtilisateurAdminDetailSerializer,
    SecurityActivityAdminSerializer,
)


class AdminDashboardStatsView(APIView):
    """Statistiques du dashboard admin"""
    permission_classes = [IsAdmin]

    def get(self, request):
        from datetime import date, datetime, time, timedelta
        from calendar import monthrange
        from django.utils import timezone

        try:
            now = timezone.now()
            today = now.date()
            yesterday = today - timedelta(days=1)
            make_aware = timezone.make_aware

            def month_dt(year, month, day=1):
                return make_aware(datetime(year, month, day, 0, 0, 0))

            this_month_start = month_dt(today.year, today.month)
            if today.month == 12:
                next_month_start = month_dt(today.year + 1, 1)
            else:
                next_month_start = month_dt(today.year, today.month + 1)
            last_month_end = this_month_start - timedelta(microseconds=1)
            last_month_start = month_dt(last_month_end.year, last_month_end.month)
            today_start = month_dt(today.year, today.month, today.day)

            def month_bounds(offset):
                """Retourne (debut, fin) timezone-aware du mois décalé (0 = mois en cours)."""
                year = today.year
                month = today.month - offset
                while month <= 0:
                    month += 12
                    year -= 1
                while month > 12:
                    month -= 12
                    year += 1
                start = month_dt(year, month)
                _, last_day = monthrange(year, month)
                if month == 12:
                    end = month_dt(year + 1, 1)
                else:
                    end = month_dt(year, month + 1)
                return start, end

            def variation(current, previous):
                if previous:
                    return round(((current - previous) / previous) * 100, 1)
                return 100.0 if current else 0.0

            # ---- Données brutes ----
            clients_total = Client.objects.count()
            clients_mois = Client.objects.filter(date_inscription__gte=this_month_start).count()
            clients_mois_prev = Client.objects.filter(
                date_inscription__gte=last_month_start,
                date_inscription__lt=this_month_start
            ).count()

            fournisseurs_total = Fournisseur.objects.count()
            fournisseurs_attente = Fournisseur.objects.filter(statut='attente').count()
            fournisseurs_mois = Fournisseur.objects.filter(date_inscription__gte=this_month_start).count()
            fournisseurs_mois_prev = Fournisseur.objects.filter(
                date_inscription__gte=last_month_start,
                date_inscription__lt=this_month_start
            ).count()

            produits_total = Produit.objects.count()
            produits_mois = Produit.objects.filter(date_ajout__gte=this_month_start).count()
            produits_mois_prev = Produit.objects.filter(
                date_ajout__gte=last_month_start,
                date_ajout__lt=this_month_start
            ).count()

            commandes_jour = Commande.objects.filter(date_commande__date=today).count()
            commandes_jour_prev = Commande.objects.filter(date_commande__date=yesterday).count()
            commandes_mois = Commande.objects.filter(date_commande__gte=this_month_start).count()

            lignes_mois = LigneCommande.objects.filter(
                commande__date_commande__gte=this_month_start,
                commande__date_commande__lt=next_month_start
            )
            ca_mois = float(lignes_mois.aggregate(total=Sum('sous_total'))['total'] or 0)

            lignes_mois_prev = LigneCommande.objects.filter(
                commande__date_commande__gte=last_month_start,
                commande__date_commande__lt=this_month_start
            )
            ca_mois_prev = float(lignes_mois_prev.aggregate(total=Sum('sous_total'))['total'] or 0)

            ca_total = float(LigneCommande.objects.aggregate(total=Sum('sous_total'))['total'] or 0)

            reclamations_ouvertes = Reclamation.objects.filter(statut='EN_ATTENTE').count()

            # ---- KPIs ----
            kpis = [
                {
                    'key': 'clients_total',
                    'value': clients_total,
                    'variation': variation(clients_mois, clients_mois_prev),
                    'label': 'Clients',
                    'icon': 'bi-people',
                    'currency': False
                },
                {
                    'key': 'magasins_total',
                    'value': fournisseurs_total,
                    'variation': variation(fournisseurs_mois, fournisseurs_mois_prev),
                    'label': 'Magasins partenaires',
                    'icon': 'bi-shop',
                    'currency': False
                },
                {
                    'key': 'produits_total',
                    'value': produits_total,
                    'variation': variation(produits_mois, produits_mois_prev),
                    'label': 'Produits',
                    'icon': 'bi-box-seam',
                    'currency': False
                },
                {
                    'key': 'commandes_jour',
                    'value': commandes_jour,
                    'variation': variation(commandes_jour, commandes_jour_prev),
                    'label': 'Commandes aujourd\'hui',
                    'icon': 'bi-cart-check',
                    'currency': False
                },
                {
                    'key': 'ca_global',
                    'value': round(ca_total, 2),
                    'variation': variation(ca_mois, ca_mois_prev),
                    'label': 'Chiffre d\'affaires global',
                    'icon': 'bi-cash-coin',
                    'currency': True
                },
                {
                    'key': 'magasins_attente',
                    'value': fournisseurs_attente,
                    'variation': 0.0,
                    'label': 'Magasins en attente',
                    'icon': 'bi-shop-window',
                    'currency': False
                },
                {
                    'key': 'reclamations_ouvertes',
                    'value': reclamations_ouvertes,
                    'variation': 0.0,
                    'label': 'Réclamations ouvertes',
                    'icon': 'bi-exclamation-triangle',
                    'currency': False,
                    'alert': reclamations_ouvertes > 0
                },
            ]

            # ---- Évolutions mensuelles (12 derniers mois) ----
            evolution_ventes = []
            evolution_commandes = []
            evolution_inscriptions = []
            for i in range(11, -1, -1):
                start, end = month_bounds(i)
                mois_lignes = LigneCommande.objects.filter(
                    commande__date_commande__gte=start,
                    commande__date_commande__lt=end
                )
                ca = float(mois_lignes.aggregate(total=Sum('sous_total'))['total'] or 0)
                ventes = int(mois_lignes.aggregate(total=Sum('quantite'))['total'] or 0)
                commandes = Commande.objects.filter(
                    date_commande__gte=start,
                    date_commande__lt=end
                ).count()
                inscriptions = Client.objects.filter(
                    date_inscription__gte=start,
                    date_inscription__lt=end
                ).count()
                label = start.strftime('%b %Y')
                evolution_ventes.append({'mois': label, 'ca': ca, 'ventes': ventes})
                evolution_commandes.append({'mois': label, 'commandes': commandes})
                evolution_inscriptions.append({'mois': label, 'inscriptions': inscriptions})

            # ---- Répartition catégories ----
            cat_rows = (
                LigneCommande.objects
                .exclude(produit__categorie__isnull=True)
                .values('produit__categorie__nom')
                .annotate(ventes=Sum('quantite'), ca=Sum('sous_total'))
                .order_by('-ca')[:8]
            )
            total_cat_ca = float(sum(float(row['ca'] or 0) for row in cat_rows))
            repartition_categories = []
            for row in cat_rows:
                ca = float(row['ca'] or 0)
                repartition_categories.append({
                    'nom': row['produit__categorie__nom'] or 'Non catégorisé',
                    'ventes': int(row['ventes'] or 0),
                    'ca': ca,
                    'pct': round((ca / total_cat_ca) * 100, 1) if total_cat_ca else 0
                })

            # ---- Ventes par région ----
            region_rows = (
                LigneCommande.objects
                .exclude(produit__fournisseur__magasin__region__isnull=True)
                .exclude(produit__fournisseur__magasin__region='')
                .values('produit__fournisseur__magasin__region')
                .annotate(ca=Sum('sous_total'), ventes=Sum('quantite'))
                .order_by('-ca')[:8]
            )
            total_region_ca = float(sum(float(row['ca'] or 0) for row in region_rows))
            ventes_par_region = []
            for row in region_rows:
                ca = float(row['ca'] or 0)
                ventes_par_region.append({
                    'region': row['produit__fournisseur__magasin__region'],
                    'ca': ca,
                    'ventes': int(row['ventes'] or 0),
                    'pct': round((ca / total_region_ca) * 100, 1) if total_region_ca else 0
                })

            # ---- Top catégories ----
            top_categories = repartition_categories[:5]

            # ---- Activité récente ----
            activites = []

            def add_activite(date, type_, icone, texte, lien, entity_id):
                activites.append({
                    'date': date.isoformat() if date else now.isoformat(),
                    'type': type_,
                    'icon': icone,
                    'texte': texte,
                    'lien': lien,
                    'id': entity_id
                })

            for f in Fournisseur.objects.select_related('user', 'magasin').order_by('-date_inscription')[:3]:
                magasin = getattr(f, 'magasin', None)
                nom = magasin.nom_magasin if magasin and magasin.nom_magasin else f.nom_entreprise
                add_activite(f.date_inscription, 'magasin', 'bi-shop',
                             f'Nouveau magasin <strong>{nom}</strong> inscrit',
                             '/admin/fournisseurs', f.user_id)

            for p in Produit.objects.select_related('fournisseur', 'categorie').order_by('-date_ajout')[:3]:
                fournisseur = getattr(p.fournisseur, 'nom_entreprise', '') if p.fournisseur else ''
                add_activite(p.date_ajout, 'produit', 'bi-box-seam',
                             f'Nouveau produit <strong>{p.nom}</strong> ajouté{f" par {fournisseur}" if fournisseur else ""}',
                             '/admin/produits', p.id)

            for cmd in Commande.objects.select_related('client__user').order_by('-date_commande')[:3]:
                client = f"{cmd.client.user.prenom} {cmd.client.user.nom}".strip() if cmd.client else 'Client'
                add_activite(cmd.date_commande, 'commande', 'bi-cart-check',
                             f'Nouvelle commande <strong>{cmd.reference}</strong> de {client}',
                             '/admin/commandes', cmd.id)

            for c in Client.objects.select_related('user').order_by('-date_inscription')[:3]:
                nom = f"{c.user.prenom} {c.user.nom}".strip()
                add_activite(c.date_inscription, 'client', 'bi-person-plus',
                             f'Nouveau client <strong>{nom}</strong> inscrit',
                             '/admin/clients', c.user_id)

            for avis in Avis.objects.select_related('client__user', 'produit').order_by('-date')[:3]:
                client = f"{avis.client.user.prenom} {avis.client.user.nom}".strip() if avis.client else 'Client'
                produit = avis.produit.nom if avis.produit else 'Produit'
                add_activite(avis.date, 'avis', 'bi-chat-left-text',
                             f'Nouvel avis <strong>{avis.note}/5</strong> sur {produit} par {client}',
                             '/admin/avis', avis.id)

            for rec in Reclamation.objects.select_related('client__user').order_by('-date_soumission')[:3]:
                client = f"{rec.client.user.prenom} {rec.client.user.nom}".strip() if rec.client else 'Client'
                add_activite(rec.date_soumission, 'reclamation', 'bi-exclamation-circle',
                             f'Réclamation <strong>{rec.objet}</strong> créée par {client}',
                             '/admin/avis', rec.id)

            activites.sort(key=lambda x: x['date'], reverse=True)
            activites = activites[:12]

            # ---- Alertes ----
            alertes = []

            for p in Produit.objects.filter(statut_approbation='en_attente').select_related('fournisseur')[:5]:
                alertes.append({
                    'type': 'produit_en_attente',
                    'severity': 'warning',
                    'message': f'{p.nom} est en attente de validation',
                    'lien': '/admin/approbation-produits',
                    'id': p.id
                })

            for f in Fournisseur.objects.filter(statut='attente').select_related('user')[:5]:
                alertes.append({
                    'type': 'magasin_a_verifier',
                    'severity': 'warning',
                    'message': f'Le magasin {f.nom_entreprise} est en attente de validation',
                    'lien': '/admin/fournisseurs',
                    'id': f.user_id
                })

            for p in Produit.objects.filter(Q(signale=True) | Q(is_active=False)).select_related('fournisseur')[:5]:
                alertes.append({
                    'type': 'produit_signale',
                    'severity': 'error',
                    'message': f'{p.nom} a été signalé ou désactivé',
                    'lien': '/admin/produits',
                    'id': p.id
                })

            for sig in SignalementAvis.objects.filter(statut='en_attente').select_related('avis__produit', 'fournisseur')[:5]:
                avis = sig.avis
                produit = avis.produit.nom if avis and avis.produit else 'Produit'
                alertes.append({
                    'type': 'avis_signale',
                    'severity': 'error',
                    'message': f'Avis signalé sur {produit} : {sig.motif}',
                    'lien': '/admin/avis',
                    'id': sig.id
                })

            for p in Produit.all_objects.filter(
                Q(stock=0) | Q(stock__lte=F('seuil_alerte')) | Q(stock__lt=5, seuil_alerte__isnull=True)
            ).select_related('fournisseur')[:5]:
                alertes.append({
                    'type': 'stock_critique',
                    'severity': 'error',
                    'message': f'Stock critique pour {p.nom} ({p.stock} restants)',
                    'lien': '/admin/produits',
                    'id': p.id
                })

            # Erreurs système : placeholder car pas de modèle dédié
            alertes.append({
                'type': 'systeme',
                'severity': 'info',
                'message': 'Aucune erreur système détectée',
                'lien': '/admin/journal',
                'id': 0
            })

            # ---- Tableaux ----
            def user_full_name(user):
                return f"{user.prenom} {user.nom}".strip() if user else ''

            def image_url(field):
                if field and hasattr(field, 'url'):
                    return request.build_absolute_uri(field.url)
                return None

            derniers_magasins = []
            for f in Fournisseur.objects.select_related('user', 'magasin').order_by('-date_inscription')[:5]:
                mag = f.magasin if hasattr(f, 'magasin') else None
                derniers_magasins.append({
                    'id': f.user_id,
                    'nom': mag.nom_magasin if mag and mag.nom_magasin else f.nom_entreprise,
                    'fournisseur': f.nom_entreprise,
                    'ville': mag.ville if mag else '',
                    'region': mag.region if mag else '',
                    'logo': image_url(mag.logo) if mag else None,
                    'date': f.date_inscription.isoformat() if f.date_inscription else None,
                    'statut': f.statut
                })

            derniers_produits = []
            for p in Produit.objects.select_related('categorie', 'fournisseur').order_by('-date_ajout')[:5]:
                image = None
                if p.image:
                    image = image_url(p.image)
                derniers_produits.append({
                    'id': p.id,
                    'nom': p.nom,
                    'categorie': p.categorie.nom if p.categorie else '',
                    'prix': float(p.prix),
                    'statut': p.statut_approbation,
                    'image': image,
                    'date': p.date_ajout.isoformat() if p.date_ajout else None,
                    'fournisseur': p.fournisseur.nom_entreprise if p.fournisseur else ''
                })

            dernieres_commandes = []
            for cmd in Commande.objects.select_related('client__user').order_by('-date_commande')[:5]:
                client = user_full_name(cmd.client.user) if cmd.client and cmd.client.user else 'Client'
                dernieres_commandes.append({
                    'id': cmd.id,
                    'reference': cmd.reference or f'#{cmd.id}',
                    'client': client,
                    'statut': cmd.statut,
                    'montant': float(cmd.montant_total or 0),
                    'date': cmd.date_commande.isoformat() if cmd.date_commande else None
                })

            derniers_utilisateurs = []
            for u in Utilisateur.objects.order_by('-date_joined')[:5]:
                derniers_utilisateurs.append({
                    'id': u.id,
                    'nom': user_full_name(u),
                    'email': u.email,
                    'role': u.role,
                    'date': u.date_joined.isoformat() if u.date_joined else None
                })

            return Response({
                'kpis': kpis,
                'evolution_ventes': evolution_ventes,
                'evolution_commandes': evolution_commandes,
                'evolution_inscriptions': evolution_inscriptions,
                'repartition_categories': repartition_categories,
                'ventes_par_region': ventes_par_region,
                'top_categories': top_categories,
                'activites_recentes': activites,
                'alertes': alertes,
                'derniers_magasins': derniers_magasins,
                'derniers_produits': derniers_produits,
                'dernieres_commandes': dernieres_commandes,
                'derniers_utilisateurs': derniers_utilisateurs
            })
        except Exception as e:
            import traceback
            return Response({
                'error': f'Erreur lors de la récupération des statistiques: {str(e)}',
                'detail': traceback.format_exc()
            }, status=500)


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
                'user': f"{entry.user.prenom} {entry.user.nom}".strip() or entry.user.email if entry.user else 'Système',
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
                'user': f"{entry.user.prenom} {entry.user.nom}".strip() or entry.user.email if entry.user else 'Système',
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
def compute_admin_status(produit):
    """Calcule le statut administrateur parmi les 6 états demandés."""
    if not produit.is_active or produit.date_suppression:
        return 'masque'
    if produit.statut_approbation == 'rejete':
        return 'refuse'
    if produit.signale and produit.statut == 'inactif':
        return 'a_corriger'
    if produit.statut_approbation == 'en_attente':
        if produit.statut == 'actif':
            return 'en_attente_validation'
        return 'brouillon'
    if produit.statut_approbation == 'approuve' and produit.statut == 'actif' and not produit.signale:
        return 'publie'
    if produit.statut == 'inactif' and not produit.signale:
        return 'brouillon'
    return 'brouillon'


ADMIN_STATUS_META = {
    'en_attente_validation': {'label': 'En attente de validation', 'couleur': '#f59e0b', 'icone': 'bi-clock', 'description': 'Produit soumis par le vendeur, en attente de validation.'},
    'publie': {'label': 'Publié', 'couleur': '#22c55e', 'icone': 'bi-check-circle', 'description': 'Produit approuvé et visible sur la plateforme.'},
    'brouillon': {'label': 'Brouillon', 'couleur': '#3b82f6', 'icone': 'bi-pencil-square', 'description': 'Produit enregistré mais non soumis à validation.'},
    'a_corriger': {'label': 'À corriger', 'couleur': '#f97316', 'icone': 'bi-exclamation-octagon', 'description': 'Produit signalé, des corrections sont demandées au vendeur.'},
    'refuse': {'label': 'Refusé', 'couleur': '#ef4444', 'icone': 'bi-x-circle', 'description': 'Produit refusé par l\'administrateur.'},
    'masque': {'label': 'Masqué', 'couleur': '#64748b', 'icone': 'bi-eye-slash', 'description': 'Produit masqué et non visible par les clients.'},
}


def _image_url(produit, champ):
    img = getattr(produit, champ, None)
    if img and img.url:
        return img.url
    return None


def _quality_alerts(produit, duplicate_ids=None):
    alerts = []
    duplicate_ids = duplicate_ids or set()
    images = [produit.image, produit.image_2, produit.image_3, produit.image_4]
    if not any(images):
        alerts.append({'type': 'no_image', 'label': 'Aucune image', 'severity': 'high'})
    if not produit.description or len(produit.description.strip()) < 50:
        alerts.append({'type': 'short_description', 'label': 'Description trop courte', 'severity': 'medium'})
    if not produit.description_courte or len(produit.description_courte.strip()) < 10:
        alerts.append({'type': 'short_description_courte', 'label': 'Accroche manquante', 'severity': 'low'})
    if produit.prix is None or float(produit.prix) <= 0:
        alerts.append({'type': 'price_incoherent', 'label': 'Prix incohérent', 'severity': 'high'})
    if produit.prix_promo and produit.prix and float(produit.prix_promo) >= float(produit.prix):
        alerts.append({'type': 'price_incoherent', 'label': 'Prix promo invalide', 'severity': 'medium'})
    if produit.stock == 0:
        alerts.append({'type': 'empty_stock', 'label': 'Stock vide', 'severity': 'high'})
    compat = produit.compatibilites or produit.modeles_compatibles or (produit.annee_debut and produit.annee_fin)
    if not compat:
        alerts.append({'type': 'no_compatibility', 'label': 'Compatibilité non renseignée', 'severity': 'medium'})
    if produit.id in (duplicate_ids or set()):
        alerts.append({'type': 'duplicate', 'label': 'Produit potentiellement dupliqué', 'severity': 'medium'})
    return alerts


def build_produit_admin_data(produit, duplicate_ids=None):
    status = compute_admin_status(produit)
    meta = ADMIN_STATUS_META.get(status, ADMIN_STATUS_META['brouillon'])
    magasin_nom = ''
    if produit.fournisseur:
        magasin = getattr(produit.fournisseur, 'magasin', None)
        magasin_nom = magasin.nom_magasin if magasin and getattr(magasin, 'nom_magasin', '') else produit.fournisseur.nom_entreprise
    images = []
    for champ in ['image', 'image_2', 'image_3', 'image_4']:
        url = _image_url(produit, champ)
        if url:
            images.append(url)
    return {
        'id': produit.id,
        'ref': produit.reference or '',
        'reference_oem': produit.reference_oem or '',
        'name': produit.nom,
        'category': produit.categorie.nom if produit.categorie else '',
        'category_id': produit.categorie_id,
        'brand': produit.marque or '',
        'vendor': produit.fournisseur.nom_entreprise if produit.fournisseur else 'AutoMecaStore',
        'vendor_id': produit.fournisseur_id,
        'vendor_store': magasin_nom,
        'image': _image_url(produit, 'image'),
        'images': images,
        'price': float(produit.prix),
        'stock': produit.stock,
        'sales': produit.nombre_ventes,
        'created_at': getattr(produit, 'date_ajout', None),
        'updated_at': getattr(produit, 'date_derniere_maj_stock', None),
        'admin_status': status,
        'admin_status_label': meta['label'],
        'admin_status_color': meta['couleur'],
        'admin_status_icon': meta['icone'],
        'admin_status_description': meta['description'],
        'signale': produit.signale,
        'signalReason': produit.motif_rejet or '',
        'motif_rejet': produit.motif_rejet or '',
        'statut_approbation': produit.statut_approbation,
        'statut': produit.statut,
        'is_active': produit.is_active,
        'sections': {
            'bestOffer': produit.est_meilleure_offre,
            'flashSale': produit.est_en_promo,
            'bestSeller': produit.est_bestseller,
            'trending': produit.est_tendance,
            'lightningSale': produit.vente_eclair,
            'featured': produit.est_vedette,
            'recommended': produit.est_recommande,
        },
        'alerts': _quality_alerts(produit, duplicate_ids),
        'compatibility': {
            'modeles_compatibles': produit.modeles_compatibles or [],
            'annee_debut': produit.annee_debut,
            'annee_fin': produit.annee_fin,
            'compatibilites': produit.compatibilites or [],
        },
        'technical': {
            'etat': produit.etat,
            'garantie_mois': produit.garantie_mois,
            'garantie_disponible': produit.garantie_disponible,
            'pays_origine': produit.pays_origine,
            'fabricant': produit.fabricant,
            'matiere': produit.matiere,
            'couleur': produit.couleur,
            'poids': float(produit.poids) if produit.poids else None,
            'longueur': float(produit.longueur) if produit.longueur else None,
            'largeur': float(produit.largeur) if produit.largeur else None,
            'hauteur': float(produit.hauteur) if produit.hauteur else None,
        },
        'description_courte': produit.description_courte,
        'description_detaillee': produit.description_detaillee,
        'precautions': produit.precautions,
        'mots_cles': produit.mots_cles or [],
        'delai_livraison': produit.delai_livraison,
        'livraison_disponible': produit.livraison_disponible,
        'retrait_magasin': produit.retrait_magasin,
        'quantite_min': produit.quantite_min,
        'seuil_alerte': produit.seuil_alerte,
    }


def map_produit_to_admin(produit):
    return build_produit_admin_data(produit)


class AdminProduitListView(APIView):
    """Liste tous les produits pour la gestion admin"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        produits = Produit.all_objects.select_related('categorie', 'fournisseur').order_by('-date_ajout')

        # Filtres optionnels
        statut = request.query_params.get('statut')
        if statut and statut != 'tous':
            if statut == 'en_attente_validation':
                produits = produits.filter(statut_approbation='en_attente', statut='actif', is_active=True, signale=False)
            elif statut == 'brouillon':
                produits = produits.filter(statut_approbation='en_attente', statut='inactif', is_active=True, signale=False)
            elif statut == 'publie':
                produits = produits.filter(statut_approbation='approuve', statut='actif', is_active=True, signale=False)
            elif statut == 'a_corriger':
                produits = produits.filter(signale=True, statut='inactif', is_active=True)
            elif statut == 'refuse':
                produits = produits.filter(statut_approbation='rejete')
            elif statut == 'masque':
                produits = produits.filter(is_active=False)

        categorie = request.query_params.get('categorie')
        if categorie:
            produits = produits.filter(categorie__nom__iexact=categorie)

        marque = request.query_params.get('marque')
        if marque:
            produits = produits.filter(marque__iexact=marque)

        fournisseur = request.query_params.get('fournisseur')
        if fournisseur:
            produits = produits.filter(fournisseur__nom_entreprise__icontains=fournisseur)

        q = request.query_params.get('q')
        if q:
            produits = produits.filter(
                Q(nom__icontains=q) |
                Q(reference__icontains=q) |
                Q(reference_oem__icontains=q) |
                Q(marque__icontains=q) |
                Q(categorie__nom__icontains=q) |
                Q(fournisseur__nom_entreprise__icontains=q)
            )

        # Détection des doublons par référence OEM / nom + fournisseur
        seen = {}
        duplicate_ids = set()
        for p in produits:
            key = (p.reference_oem or '').lower() or (p.nom or '').lower()
            if key and key != p.nom.lower():
                if key in seen:
                    duplicate_ids.add(p.id)
                    duplicate_ids.add(seen[key])
                else:
                    seen[key] = p.id

        data = [build_produit_admin_data(p, duplicate_ids) for p in produits]
        return Response(data)


class AdminProduitToggleActiveView(APIView):
    """Active / désactive un produit"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            produit = Produit.all_objects.get(pk=pk)
            statut = request.data.get('statut', 'actif')
            produit.statut = 'actif' if statut == 'actif' else 'inactif'
            if produit.statut == 'actif':
                produit.signale = False
                produit.motif_rejet = ''

                # Notifier tous les clients que le produit est maintenant disponible
                try:
                    clients = Client.objects.filter(user__is_active=True)
                    for client in clients:
                        creer_notification_client(
                            client_id=client.user.id,
                            type_notif='ADMIN_ALERT',
                            titre='Nouveau produit disponible',
                            message=f"Le produit {produit.nom} est maintenant disponible sur AutoMecaStore.",
                            lien=f'/produits?id={produit.id}',
                            importance='success',
                            objet_type='Produit',
                            objet_id=produit.id
                        )
                except Exception:
                    pass

            produit.save()
            return Response(map_produit_to_admin(produit))
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


class AdminProduitSignalView(APIView):
    """Signale / retire le signalement d'un produit"""
    authentication_classes = [JWTAuthentication]
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
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            produit = Produit.all_objects.get(pk=pk)
            return Response(build_produit_admin_data(produit))
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
    authentication_classes = [JWTAuthentication]
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
            produit.est_vedette = bool(data.get('featured', produit.est_vedette))
            produit.est_recommande = bool(data.get('recommended', produit.est_recommande))
            produit.save()
            return Response(map_produit_to_admin(produit))
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


class AdminProduitEnAttenteListView(APIView):
    """Liste les produits en attente d'approbation"""
    authentication_classes = [JWTAuthentication]
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
    authentication_classes = [JWTAuthentication]
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

                # Notifier tous les clients que le produit est approuvé
                try:
                    clients = Client.objects.filter(user__is_active=True)
                    for client in clients:
                        creer_notification_client(
                            client_id=client.user.id,
                            type_notif='ADMIN_ALERT',
                            titre='Nouveau produit disponible',
                            message=f"Le produit {produit.nom} est maintenant disponible sur AutoMecaStore.",
                            lien=f'/produits?id={produit.id}',
                            importance='success',
                            objet_type='Produit',
                            objet_id=produit.id
                        )
                except Exception:
                    pass
            elif statut == 'rejete':
                produit.statut_approbation = 'rejete'
                produit.statut = 'inactif'
                produit.motif_rejet = motif or ''
            else:
                return Response({'error': 'Statut invalide. Utilisez approuve ou rejete.'}, status=400)
            produit.save()
            return Response(build_produit_admin_data(produit))
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


def _notify_fournisseur_produit(produit, titre, message, lien=''):
    if produit and produit.fournisseur:
        creer_notification_fournisseur(
            fournisseur_id=produit.fournisseur.user_id,
            type_notif='produit',
            titre=titre,
            message=message,
            lien=lien or f'/fournisseur/produits/{produit.id}'
        )


class AdminProduitValidationView(APIView):
    """Validation complète d'un produit (publier, corriger, masquer, refuser, supprimer)"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            produit = Produit.all_objects.get(pk=pk)
            action = request.data.get('action')
            motif = (request.data.get('motif') or request.data.get('motif_rejet') or '').strip()

            if action == 'publier':
                produit.statut_approbation = 'approuve'
                produit.statut = 'actif'
                produit.signale = False
                produit.motif_rejet = ''
                produit.is_active = True
                produit.date_suppression = None
                _notify_fournisseur_produit(produit, 'Produit publié', f'Votre produit "{produit.nom}" a été publié.')

                # Notifier tous les clients que le produit est publié
                try:
                    clients = Client.objects.filter(user__is_active=True)
                    for client in clients:
                        creer_notification_client(
                            client_id=client.user.id,
                            type_notif='ADMIN_ALERT',
                            titre='Nouveau produit disponible',
                            message=f"Le produit {produit.nom} est maintenant disponible sur AutoMecaStore.",
                            lien=f'/produits?id={produit.id}',
                            importance='success',
                            objet_type='Produit',
                            objet_id=produit.id
                        )
                except Exception:
                    pass

            elif action == 'demander_correction':
                if not motif:
                    return Response({'error': 'Un motif est obligatoire pour demander des corrections.'}, status=400)
                produit.signale = True
                produit.statut = 'inactif'
                produit.motif_rejet = motif
                _notify_fournisseur_produit(produit, 'Corrections demandées', f'Corrections demandées pour "{produit.nom}" : {motif}')

            elif action == 'masquer':
                produit.is_active = False
                _notify_fournisseur_produit(produit, 'Produit masqué', f'Votre produit "{produit.nom}" a été masqué par un administrateur.')

            elif action == 'refuser':
                if not motif:
                    return Response({'error': 'Un motif est obligatoire pour refuser un produit.'}, status=400)
                produit.statut_approbation = 'rejete'
                produit.statut = 'inactif'
                produit.signale = False
                produit.motif_rejet = motif
                _notify_fournisseur_produit(produit, 'Produit refusé', f'Votre produit "{produit.nom}" a été refusé : {motif}')

            elif action == 'supprimer':
                produit.soft_delete()
                _notify_fournisseur_produit(produit, 'Produit retiré', f'Votre produit "{produit.nom}" a été retiré du catalogue.')
                return Response({'message': 'Produit retiré avec succès', 'id': pk})

            else:
                return Response({'error': 'Action invalide. Utilisez publier, demander_correction, masquer, refuser ou supprimer.'}, status=400)

            produit.save()
            return Response(build_produit_admin_data(produit))

        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


class AdminFournisseurListView(generics.ListAPIView):
    """Liste tous les fournisseurs / magasins pour l'admin"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        fournisseurs = Fournisseur.objects.select_related('user', 'magasin').all()
        data = []
        for f in fournisseurs:
            magasin = getattr(f, 'magasin', None)
            nb_commandes = self._count_commandes(f)
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
                'magasin': {
                    'nom_magasin': magasin.nom_magasin if magasin else f.nom_entreprise,
                    'logo': magasin.logo.url if magasin and magasin.logo else (f.logo.url if f.logo else None),
                    'telephone': magasin.telephone if magasin and magasin.telephone else f.user.telephone,
                    'email': magasin.email if magasin and magasin.email else f.user.email,
                    'ville': magasin.ville if magasin else '',
                    'region': magasin.region if magasin else '',
                    'adresse_complete': magasin.adresse_complete if magasin else (f.user.adresse or ''),
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
                'nombre_commandes': nb_commandes,
                'chiffre_affaires': f.chiffre_affaires,
                'nom_complet': f.nom_complet,
                'raison_refus': f.raison_refus or '',
                'date_validation': f.date_validation,
            })
        return Response(data)

    def _count_commandes(self, fournisseur):
        try:
            return LigneCommande.objects.filter(produit__fournisseur=fournisseur).values('commande_id').distinct().count()
        except Exception:
            return 0


class AdminFournisseurDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request, user_id):
        try:
            f = Fournisseur.objects.select_related('user', 'magasin').get(user_id=user_id)
            magasin = getattr(f, 'magasin', None)
            nb_commandes = AdminFournisseurListView()._count_commandes(f)
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
                'magasin': {
                    'nom_magasin': magasin.nom_magasin if magasin else f.nom_entreprise,
                    'logo': magasin.logo.url if magasin and magasin.logo else (f.logo.url if f.logo else None),
                    'photo_couverture': magasin.photo_couverture.url if magasin and magasin.photo_couverture else None,
                    'telephone': magasin.telephone if magasin and magasin.telephone else f.user.telephone,
                    'whatsapp': magasin.whatsapp if magasin else '',
                    'email': magasin.email if magasin and magasin.email else f.user.email,
                    'ville': magasin.ville if magasin else '',
                    'region': magasin.region if magasin else '',
                    'adresse_complete': magasin.adresse_complete if magasin else (f.user.adresse or ''),
                    'horaires_ouverture': magasin.horaires_ouverture if magasin else {},
                    'jours_ouverture': magasin.jours_ouverture if magasin else '',
                    'livraison_disponible': magasin.livraison_disponible if magasin else False,
                    'retrait_magasin': magasin.retrait_magasin if magasin else False,
                    'rayon_livraison_km': magasin.rayon_livraison_km if magasin else None,
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
                'nombre_commandes': nb_commandes,
                'chiffre_affaires': f.chiffre_affaires,
                'nom_complet': f.nom_complet,
                'raison_refus': f.raison_refus or '',
                'date_validation': f.date_validation,
            })
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)


class AdminFournisseurMagasinView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def _get_or_create_magasin(self, fournisseur):
        magasin, _ = Magasin.objects.get_or_create(
            fournisseur=fournisseur,
            defaults={
                'nom_magasin': fournisseur.nom_entreprise,
                'description': fournisseur.description or '',
            }
        )
        return magasin

    def get(self, request, user_id):
        try:
            f = Fournisseur.objects.select_related('user').get(user_id=user_id)
            magasin = self._get_or_create_magasin(f)
            return Response(MagasinSerializer(magasin, context={'request': request}).data)
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)

    def put(self, request, user_id):
        try:
            f = Fournisseur.objects.select_related('user').get(user_id=user_id)
            magasin = self._get_or_create_magasin(f)
            data = request.data.copy() if hasattr(request.data, 'copy') else request.data
            if 'fournisseur' in data:
                data['fournisseur'] = f.id
            serializer = MagasinSerializer(magasin, data=data, partial=True, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)


class AdminFournisseurValidationView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        try:
            from django.utils import timezone
            f = Fournisseur.objects.select_related('user', 'magasin').get(user_id=user_id)
            action = request.data.get('action')
            motif = request.data.get('commentaire') or request.data.get('motif') or ''

            if action not in ('valider', 'refuser', 'suspendre', 'reactiver'):
                return Response({'error': 'Action invalide. Utilisez valider, refuser, suspendre ou reactiver.'}, status=400)

            if action in ('refuser', 'suspendre') and not motif.strip():
                return Response({'error': 'Le motif est obligatoire pour refuser ou suspendre un magasin.'}, status=400)

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
            elif action == 'refuser':
                f.statut = 'desactive'
                f.user.is_active = False
                f.raison_refus = motif
            elif action == 'suspendre':
                f.statut = 'suspendu'
                f.user.is_active = True
                f.raison_refus = motif
            elif action == 'reactiver':
                f.statut = 'actif'
                f.user.is_active = True
                f.date_validation = now
                f.validated_by = administrateur
                f.raison_refus = ''

            f.save()
            f.user.save()

            FournisseurStatusHistory.objects.create(
                fournisseur=f,
                statut=f.statut,
                changed_by=administrateur,
                commentaire=motif
            )

            self._notify_fournisseur_status(f, action, motif)
            self._notifier_fournisseur_in_app(f, action, motif)

            return Response({
                'message': f"Statut du fournisseur mis à jour : {f.statut}",
                'statut': f.statut,
                'statut_label': f.get_statut_display(),
                'user_id': f.user.id,
                'old_statut': old_statut
            })
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)

    def _notify_fournisseur_status(self, fournisseur, action, motif):
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
            elif action in ('refuser', 'suspendre'):
                subject = 'Votre demande de compte fournisseur AutoMecaStore'
                html = render_to_string('emails/fournisseur_rejected.html', {
                    'nom': f"{user.prenom or ''} {user.nom or ''}".strip() or user.email,
                    'prenom': user.prenom or '',
                    'entreprise': fournisseur.nom_entreprise,
                    'email': user.email,
                    'raison': motif or "Aucune raison donnée.",
                    'site_name': 'AutoMecaStore'
                })
                plain = (
                    f"Bonjour {user.prenom or ''},\n\n"
                    f"Votre compte fournisseur {fournisseur.nom_entreprise} a été {'refusé' if action == 'refuser' else 'suspendu'}.\n"
                    f"Raison : {motif or 'Aucune raison donnée'}\n\n"
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
        except Exception:
            logger.exception("Erreur envoi email fournisseur")

    def _notifier_fournisseur_in_app(self, fournisseur, action, motif):
        from fournisseur.models import creer_notification_fournisseur

        libelles = {
            'valider': ('Magasin validé', f'Votre magasin "{fournisseur.nom_entreprise}" a été validé par l\'administrateur.', '/fournisseur/dashboard'),
            'refuser': ('Magasin refusé', f'Votre magasin "{fournisseur.nom_entreprise}" a été refusé. Motif : {motif or "non précisé"}', '/fournisseur/parametres'),
            'suspendre': ('Magasin suspendu', f'Votre magasin "{fournisseur.nom_entreprise}" a été suspendu. Motif : {motif or "non précisé"}', '/fournisseur/parametres'),
            'reactiver': ('Magasin réactivé', f'Votre magasin "{fournisseur.nom_entreprise}" a été réactivé.', '/fournisseur/dashboard'),
        }

        titre, message, lien = libelles.get(action, ('Mise à jour magasin', 'Le statut de votre magasin a été modifié.', '/fournisseur/dashboard'))

        try:
            creer_notification_fournisseur(
                fournisseur_id=fournisseur.user.id,
                type_notif='systeme',
                titre=titre,
                message=message,
                lien=lien
            )
        except Exception:
            logger.exception("Erreur création notification fournisseur")


class AdminFournisseurDeleteView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def delete(self, request, user_id):
        try:
            f = Fournisseur.objects.select_related('user').get(user_id=user_id)
            if f.user == request.user:
                return Response({'error': 'Vous ne pouvez pas supprimer votre propre compte.'}, status=status.HTTP_400_BAD_REQUEST)
            if f.statut == 'desactive':
                return Response({'error': 'Ce fournisseur est déjà désactivé.'}, status=status.HTTP_400_BAD_REQUEST)

            f.statut = 'desactive'
            f.user.is_active = False
            f.raison_refus = request.data.get('motif', '')
            f.save()
            f.user.save()

            FournisseurStatusHistory.objects.create(
                fournisseur=f,
                statut='desactive',
                changed_by=getattr(request.user, 'administrateur', None),
                commentaire=f.raison_refus
            )

            return Response({'message': f'Fournisseur {f.user.email} désactivé avec succès'})
        except Fournisseur.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)


class AdminFournisseurCommandesView(APIView):
    authentication_classes = [JWTAuthentication]
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
    authentication_classes = [JWTAuthentication]
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
    authentication_classes = [JWTAuthentication]
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


# -----------------------------
# Gestion catégories et marques
# -----------------------------
class AdminCategorieReorderView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def post(self, request):
        items = request.data.get('items', [])
        updated = 0
        for item in items:
            try:
                cat = Categorie.objects.get(pk=item.get('id'))
                cat.ordre = item.get('ordre', cat.ordre)
                cat.save(update_fields=['ordre'])
                updated += 1
            except Categorie.DoesNotExist:
                continue
        return Response({'updated': updated})


class AdminMarqueReorderView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def post(self, request):
        items = request.data.get('items', [])
        updated = 0
        for item in items:
            try:
                marque = Marque.objects.get(pk=item.get('id'))
                marque.ordre = item.get('ordre', marque.ordre)
                marque.save(update_fields=['ordre'])
                updated += 1
            except Marque.DoesNotExist:
                continue
        return Response({'updated': updated})


# -----------------------------
# Gestion des commandes admin
# -----------------------------
class AdminCommandeListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone

        qs = Commande.objects.prefetch_related(
            'lignes__produit__fournisseur__magasin',
            'lignes__produit__fournisseur__user',
            'client__user',
            'historique__utilisateur',
            'livraisons__livreur__user'
        ).order_by('-date_commande')

        statut = request.query_params.get('statut')
        periode = request.query_params.get('periode')
        mode_paiement = request.query_params.get('mode_paiement')
        mode_reception = request.query_params.get('mode_reception')
        magasin = request.query_params.get('magasin')
        client = request.query_params.get('client')
        q = request.query_params.get('q', '').strip()

        if statut:
            qs = qs.filter(statut=statut)

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
        elif periode == 'preparation':
            qs = qs.filter(statut__in=['en_preparation', 'prete_a_retirer', 'en_cours_livraison'])
        elif periode == 'annulees':
            qs = qs.filter(statut='annulee')

        if mode_paiement:
            qs = qs.filter(mode_paiement=mode_paiement)
        if mode_reception:
            qs = qs.filter(mode_reception=mode_reception)

        if magasin:
            qs = qs.filter(
                Q(lignes__produit__fournisseur__magasin__nom_magasin__icontains=magasin) |
                Q(lignes__produit__fournisseur__nom_entreprise__icontains=magasin)
            ).distinct()

        if client:
            qs = qs.filter(
                Q(client__user__nom__icontains=client) |
                Q(client__user__prenom__icontains=client)
            ).distinct()

        if q:
            qs = qs.filter(
                Q(reference__icontains=q) |
                Q(client__user__nom__icontains=q) |
                Q(client__user__prenom__icontains=q) |
                Q(client__user__telephone__icontains=q) |
                Q(lignes__produit__fournisseur__magasin__nom_magasin__icontains=q) |
                Q(lignes__produit__fournisseur__nom_entreprise__icontains=q)
            ).distinct()

        serializer = CommandeAdminListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


class AdminCommandeDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            commande = Commande.objects.prefetch_related(
                'lignes__produit__fournisseur__magasin',
                'lignes__produit__fournisseur__user',
                'client__user',
                'historique__utilisateur',
                'livraisons__livreur__user'
            ).get(pk=pk)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande non trouvée'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CommandeAdminDetailSerializer(commande, context={'request': request})
        return Response(serializer.data)


class AdminCommandeStatsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone

        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        total = Commande.objects.count()
        aujourdhui = Commande.objects.filter(date_commande__date=today).count()
        terminees = Commande.objects.filter(statut='terminee').count()
        annulees = Commande.objects.filter(statut='annulee').count()
        en_preparation = Commande.objects.filter(statut__in=['en_preparation', 'prete_a_retirer', 'en_cours_livraison']).count()

        montant_total = float(Commande.objects.aggregate(total=Sum('montant_total'))['total'] or 0)
        panier_moyen = float(Commande.objects.aggregate(avg=Avg('montant_total'))['avg'] or 0)

        # Temps moyen de traitement (date_commande -> dernier historique terminee/livree)
        finished = Commande.objects.filter(statut__in=['terminee', 'livree'])
        total_seconds = 0
        count_finished = 0
        for cmd in finished:
            last = cmd.historique.filter(statut__in=['terminee', 'livree']).order_by('-date').first()
            if last:
                total_seconds += (last.date - cmd.date_commande).total_seconds()
                count_finished += 1
        temps_moyen_heures = round(total_seconds / count_finished / 3600, 1) if count_finished > 0 else 0

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
            'temps_moyen_heures': temps_moyen_heures,
            'montant_jour': montant_jour,
            'montant_semaine': montant_semaine,
            'montant_mois': montant_mois
        })


class AdminCommandeAlertsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        alertes = []
        qs = Commande.objects.prefetch_related('client__user', 'reclamation_set').all()

        for commande in qs:
            delta = now - commande.date_commande
            statuts_bloques = {'nouvelle_commande', 'en_attente_confirmation'}
            if commande.statut in statuts_bloques and delta > timedelta(hours=2):
                alertes.append({
                    'id': f"{commande.id}-bloquee",
                    'commande_id': commande.id,
                    'reference': commande.reference,
                    'type': 'bloquee',
                    'label': 'Commande bloquée',
                    'severity': 'high',
                    'client': commande.client and f"{commande.client.user.nom} {commande.client.user.prenom}".strip() or 'Client inconnu'
                })

            if commande.statut == 'en_preparation' and delta > timedelta(hours=24):
                alertes.append({
                    'id': f"{commande.id}-retard-prep",
                    'commande_id': commande.id,
                    'reference': commande.reference,
                    'type': 'retard',
                    'label': 'Préparation en retard',
                    'severity': 'medium',
                    'client': commande.client and f"{commande.client.user.nom} {commande.client.user.prenom}".strip() or 'Client inconnu'
                })
            elif commande.statut == 'en_cours_livraison' and delta > timedelta(hours=48):
                alertes.append({
                    'id': f"{commande.id}-retard-liv",
                    'commande_id': commande.id,
                    'reference': commande.reference,
                    'type': 'retard',
                    'label': 'Livraison en retard',
                    'severity': 'medium',
                    'client': commande.client and f"{commande.client.user.nom} {commande.client.user.prenom}".strip() or 'Client inconnu'
                })

            if commande.statut == 'annulee':
                alertes.append({
                    'id': f"{commande.id}-annulee",
                    'commande_id': commande.id,
                    'reference': commande.reference,
                    'type': 'annulee',
                    'label': 'Commande annulée',
                    'severity': 'high',
                    'client': commande.client and f"{commande.client.user.nom} {commande.client.user.prenom}".strip() or 'Client inconnu'
                })

            for r in commande.reclamation_set.filter(statut='EN_ATTENTE'):
                alertes.append({
                    'id': f"{commande.id}-litige-{r.id}",
                    'commande_id': commande.id,
                    'reference': commande.reference,
                    'type': 'litige',
                    'label': 'Litige ouvert',
                    'severity': 'high',
                    'client': commande.client and f"{commande.client.user.nom} {commande.client.user.prenom}".strip() or 'Client inconnu'
                })

        return Response(alertes)


class AdminCommandeActionView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            commande = Commande.objects.get(pk=pk)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande non trouvée'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        message = request.data.get('message', '').strip()
        statut = request.data.get('statut')
        motif = request.data.get('motif', '').strip()

        if action == 'note':
            HistoriqueCommande.objects.create(
                commande=commande,
                commentaire=message or 'Note ajoutée',
                motif='',
                utilisateur=request.user,
                utilisateur_nom=f"{request.user.prenom or ''} {request.user.nom or ''}".strip() or request.user.email
            )
            return Response({'message': 'Note ajoutée'})

        elif action == 'intervention':
            HistoriqueCommande.objects.create(
                commande=commande,
                commentaire=f"Intervention : {message}" if message else 'Intervention créée',
                motif='',
                utilisateur=request.user,
                utilisateur_nom=f"{request.user.prenom or ''} {request.user.nom or ''}".strip() or request.user.email
            )
            return Response({'message': 'Intervention créée'})

        elif action == 'contact_fournisseur':
            fournisseurs = set()
            for ligne in commande.lignes.select_related('produit__fournisseur__user'):
                if ligne.produit and ligne.produit.fournisseur:
                    fournisseurs.add(ligne.produit.fournisseur)

            if not fournisseurs:
                return Response({'error': 'Aucun fournisseur trouvé pour cette commande.'}, status=status.HTTP_400_BAD_REQUEST)

            subject = f"AutoMeca — Contact administrateur | Commande {commande.reference}"
            body = (
                f"Bonjour,\n\n"
                f"L'administrateur vous contacte au sujet de la commande {commande.reference}.\n\n"
                f"Message :\n{message or 'Aucun message supplémentaire.'}\n\n"
                f"Cordialement,\nL'équipe AutoMeca"
            )
            for fournisseur in fournisseurs:
                email = getattr(fournisseur.user, 'email', None) or fournisseur.email
                if email:
                    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=True)

            HistoriqueCommande.objects.create(
                commande=commande,
                commentaire=f"Contact fournisseur : {message}" if message else 'Fournisseur contacté',
                motif='',
                utilisateur=request.user,
                utilisateur_nom=f"{request.user.prenom or ''} {request.user.nom or ''}".strip() or request.user.email
            )
            return Response({'message': f'Contact fournisseur enregistré ({len(fournisseurs)} fournisseur(s)).'})

        elif action == 'contact_client':
            if not commande.client or not commande.client.user or not commande.client.user.email:
                return Response({'error': 'Le client ne possède pas d\'adresse e-mail.'}, status=status.HTTP_400_BAD_REQUEST)

            subject = f"AutoMeca — Contact administrateur | Commande {commande.reference}"
            body = (
                f"Bonjour {commande.client.user.prenom or ''},\n\n"
                f"L'administrateur vous contacte au sujet de votre commande {commande.reference}.\n\n"
                f"Message :\n{message or 'Aucun message supplémentaire.'}\n\n"
                f"Cordialement,\nL'équipe AutoMeca"
            )
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [commande.client.user.email], fail_silently=True)

            HistoriqueCommande.objects.create(
                commande=commande,
                commentaire=f"Contact client : {message}" if message else 'Client contacté',
                motif='',
                utilisateur=request.user,
                utilisateur_nom=f"{request.user.prenom or ''} {request.user.nom or ''}".strip() or request.user.email
            )
            return Response({'message': 'Client contacté par e-mail.'})

        elif action == 'exception_status':
            if not motif:
                return Response({'error': 'Un motif est obligatoire pour une mise à jour exceptionnelle.'}, status=status.HTTP_400_BAD_REQUEST)
            if not statut:
                return Response({'error': 'Statut manquant.'}, status=status.HTTP_400_BAD_REQUEST)

            old = commande.statut
            commande.statut = statut
            commande.save(update_fields=['statut'])
            HistoriqueCommande.objects.create(
                commande=commande,
                statut=statut,
                commentaire=f"Mise à jour exceptionnelle du statut {old} -> {statut}",
                motif=motif,
                utilisateur=request.user,
                utilisateur_nom=f"{request.user.prenom or ''} {request.user.nom or ''}".strip() or request.user.email
            )
            return Response({'message': 'Statut mis à jour (procédure exceptionnelle)'})

        return Response({'error': 'Action non reconnue'}, status=status.HTTP_400_BAD_REQUEST)


class AdminCommandeExportView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        import csv
        from django.utils import timezone
        from datetime import timedelta

        fmt = request.query_params.get('format', 'csv')
        statut = request.query_params.get('statut')
        periode = request.query_params.get('periode')

        qs = Commande.objects.prefetch_related(
            'client__user',
            'lignes__produit__fournisseur__magasin'
        ).order_by('-date_commande')

        if statut:
            qs = qs.filter(statut=statut)
        today = timezone.now().date()
        if periode == 'today':
            qs = qs.filter(date_commande__date=today)
        elif periode == 'week':
            start = today - timedelta(days=today.weekday())
            qs = qs.filter(date_commande__date__gte=start)
        elif periode == 'month':
            qs = qs.filter(date_commande__year=today.year, date_commande__month=today.month)

        if fmt == 'csv':
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = 'attachment; filename="commandes.csv"'
            response.write('\ufeff')  # BOM for Excel
            writer = csv.writer(response, delimiter=';', quoting=csv.QUOTE_MINIMAL)
            writer.writerow(['Référence', 'Date', 'Client', 'Magasins', 'Produits', 'Montant', 'Frais livraison', 'Mode paiement', 'Mode réception', 'Statut'])
            for c in qs:
                client = c.client and f"{c.client.user.prenom or ''} {c.client.user.nom or ''}".strip() or 'Client inconnu'
                def _magasin_nom(l):
                    if not l.produit or not l.produit.fournisseur:
                        return None
                    fournisseur = l.produit.fournisseur
                    magasin = getattr(fournisseur, 'magasin', None)
                    return magasin.nom_magasin if magasin else fournisseur.nom_entreprise
                magasins = ', '.join(filter(None, {_magasin_nom(l) for l in c.lignes.all()}))
                nb_produits = sum(l.quantite for l in c.lignes.all())
                writer.writerow([
                    c.reference, c.date_commande.strftime('%d/%m/%Y %H:%M'), client, magasins,
                    nb_produits, float(c.montant_total or 0), float(c.frais_livraison or 0),
                    c.get_mode_paiement_display(), c.get_mode_reception_display(),
                    c.get_statut_display()
                ])
            return response

        # Fallback PDF : retourne une page HTML prête à imprimer
        html = '<html><head><meta charset="utf-8"><title>Commandes</title>'
        html += '<style>body{font-family:Arial,sans-serif;padding:24px;color:#333}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px;font-size:12px}th{background:#f3f4f6}</style>'
        html += '</head><body><h2>Liste des commandes</h2><table><thead><tr>'
        html += '<th>Référence</th><th>Date</th><th>Client</th><th>Magasins</th><th>Produits</th><th>Montant</th><th>Statut</th>'
        html += '</tr></thead><tbody>'
        for c in qs:
            client = c.client and f"{c.client.user.prenom or ''} {c.client.user.nom or ''}".strip() or 'Client inconnu'
            def _magasin_nom(l):
                if not l.produit or not l.produit.fournisseur:
                    return None
                fournisseur = l.produit.fournisseur
                magasin = getattr(fournisseur, 'magasin', None)
                return magasin.nom_magasin if magasin else fournisseur.nom_entreprise
            magasins = ', '.join(filter(None, {_magasin_nom(l) for l in c.lignes.all()}))
            nb_produits = sum(l.quantite for l in c.lignes.all())
            html += f"<tr><td>{c.reference}</td><td>{c.date_commande.strftime('%d/%m/%Y %H:%M')}</td><td>{client}</td><td>{magasins}</td><td>{nb_produits}</td><td>{float(c.montant_total or 0)}</td><td>{c.get_statut_display()}</td></tr>"
        html += '</tbody></table></body></html>'
        response = HttpResponse(html, content_type='text/html')
        response['Content-Disposition'] = 'inline; filename="commandes.html"'
        return response


# -----------------------------
# Utilisateurs admin
# -----------------------------

class AdminUtilisateurListView(APIView):
    """Liste unifiée de tous les utilisateurs (clients, fournisseurs, administrateurs)."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = Utilisateur.objects.select_related(
            'client', 'fournisseur', 'administrateur', 'fournisseur__magasin'
        ).filter(role__in=['client', 'fournisseur', 'admin'])

        role = request.query_params.get('role')
        if role and role != 'tous':
            qs = qs.filter(role=role)

        statut = request.query_params.get('statut')
        if statut and statut != 'tous':
            if statut == 'actif':
                qs = qs.filter(
                    Q(role='fournisseur', fournisseur__statut='actif') |
                    Q(role__in=['client', 'admin'], is_active=True)
                )
            elif statut == 'attente':
                qs = qs.filter(role='fournisseur', fournisseur__statut='attente')
            elif statut == 'suspendu':
                qs = qs.filter(
                    Q(role='fournisseur', fournisseur__statut='suspendu') |
                    Q(role__in=['client', 'admin'], is_active=False)
                )
            elif statut == 'desactive':
                qs = qs.filter(
                    Q(role='fournisseur', fournisseur__statut='desactive') |
                    Q(role__in=['client', 'admin'], is_active=False)
                )

        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(
                Q(nom__icontains=q) | Q(prenom__icontains=q) | Q(email__icontains=q) |
                Q(telephone__icontains=q) | Q(adresse__icontains=q) |
                Q(fournisseur__nom_entreprise__icontains=q) |
                Q(fournisseur__magasin__ville__icontains=q) |
                Q(fournisseur__magasin__nom_magasin__icontains=q)
            )

        periode = request.query_params.get('periode')
        if periode:
            from django.utils import timezone
            from datetime import timedelta
            now = timezone.now()
            if periode == 'today':
                qs = qs.filter(date_joined__date=now.date())
            elif periode == 'week':
                start = now - timedelta(days=now.weekday())
                qs = qs.filter(date_joined__date__gte=start.date())
            elif periode == 'month':
                qs = qs.filter(date_joined__year=now.year, date_joined__month=now.month)

        ordering = request.query_params.get('ordering', '-date_joined')
        if ordering in ['date_joined', '-date_joined', 'nom', '-nom', 'prenom', '-prenom', 'email', '-email']:
            qs = qs.order_by(ordering)

        serializer = UtilisateurAdminListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


class AdminUtilisateurDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get_user(self, pk):
        try:
            return Utilisateur.objects.select_related(
                'client', 'fournisseur', 'administrateur', 'fournisseur__magasin'
            ).get(pk=pk)
        except Utilisateur.DoesNotExist:
            raise NotFound(detail="Utilisateur non trouvé")

    def get(self, request, pk):
        user = self.get_user(pk)
        serializer = UtilisateurAdminDetailSerializer(user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, pk):
        user = self.get_user(pk)
        champs_autorises = ['nom', 'prenom', 'email', 'telephone', 'adresse']
        updated = False
        for champ in champs_autorises:
            if champ in request.data:
                if champ == 'email' and request.data[champ] != user.email:
                    if Utilisateur.objects.filter(email__iexact=request.data[champ]).exclude(pk=user.pk).exists():
                        return Response({'error': 'Cet email est déjà utilisé.'}, status=status.HTTP_400_BAD_REQUEST)
                setattr(user, champ, request.data[champ])
                updated = True

        if not updated:
            return Response({'error': 'Aucune donnée à mettre à jour.'}, status=status.HTTP_400_BAD_REQUEST)

        user.save()

        # Log admin
        try:
            from django.contrib.admin.models import LogEntry
            from django.contrib.contenttypes.models import ContentType
            LogEntry.objects.log_action(
                user_id=request.user.id,
                content_type_id=ContentType.objects.get_for_model(Utilisateur).pk,
                object_id=user.pk,
                object_repr=str(user),
                action_flag=2,
                change_message='Modification des informations générales via admin.'
            )
        except Exception:
            pass

        serializer = UtilisateurAdminDetailSerializer(user, context={'request': request})
        return Response(serializer.data)


class AdminUtilisateurStatsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        today = now.date()
        month_start = today.replace(day=1)

        qs = Utilisateur.objects.filter(role__in=['client', 'fournisseur', 'admin'])
        total = qs.count()
        clients = qs.filter(role='client').count()
        fournisseurs = qs.filter(role='fournisseur').count()
        admins = qs.filter(role='admin').count()
        nouveaux_mois = qs.filter(date_joined__date__gte=month_start).count()
        actifs_aujourdhui = qs.filter(last_login__date=today).count()

        return Response({
            'total': total,
            'clients': clients,
            'fournisseurs': fournisseurs,
            'administrateurs': admins,
            'nouveaux_mois': nouveaux_mois,
            'actifs_aujourdhui': actifs_aujourdhui
        })


class AdminUtilisateurActionView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            user = Utilisateur.objects.select_related('client', 'fournisseur').get(pk=pk)
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if not action:
            return Response({'error': 'Action manquante.'}, status=status.HTTP_400_BAD_REQUEST)

        # Empêcher l'admin de s'auto-suspendre/supprimer via cette vue
        if user == request.user and action in ('suspendre', 'desactiver', 'supprimer'):
            return Response({'error': 'Vous ne pouvez pas effectuer cette action sur votre propre compte.'}, status=status.HTTP_400_BAD_REQUEST)

        fournisseur = getattr(user, 'fournisseur', None)

        if action == 'suspendre':
            user.is_active = False
            if fournisseur:
                fournisseur.statut = 'suspendu'
                fournisseur.raison_refus = request.data.get('motif', '')
                fournisseur.save()
            user.save()
            self._log_action(request, user, 'Compte suspendu')
            return Response({'message': 'Compte suspendu avec succès.'})

        if action == 'reactiver':
            user.is_active = True
            if fournisseur:
                fournisseur.statut = 'actif'
                fournisseur.raison_refus = ''
                fournisseur.save()
            user.save()
            self._log_action(request, user, 'Compte réactivé')
            return Response({'message': 'Compte réactivé avec succès.'})

        if action == 'desactiver':
            user.is_active = False
            if fournisseur:
                fournisseur.statut = 'desactive'
                fournisseur.raison_refus = request.data.get('motif', '')
                fournisseur.save()
            user.save()
            self._log_action(request, user, 'Compte désactivé')
            return Response({'message': 'Compte désactivé avec succès.'})

        if action == 'reset_password':
            import secrets
            new_password = request.data.get('new_password') or f"AutoMeca-{secrets.token_urlsafe(6)}"
            user.set_password(new_password)
            user.password_changed_at = timezone.now()
            user.save()

            subject = 'AutoMeca — Réinitialisation de votre mot de passe'
            body = (
                f"Bonjour {user.prenom or ''} {user.nom or ''},\n\n"
                f"Un administrateur a réinitialisé votre mot de passe.\n"
                f"Votre nouveau mot de passe est : {new_password}\n\n"
                f"Nous vous recommandons de le changer dès votre prochaine connexion.\n\n"
                f"Cordialement,\nL'équipe AutoMeca"
            )
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)

            self._log_action(request, user, 'Réinitialisation du mot de passe')
            return Response({'message': 'Mot de passe réinitialisé et envoyé par e-mail.'})

        if action == 'supprimer':
            if user.role == 'admin':
                return Response({'error': 'La suppression des administrateurs n\'est pas autorisée ici.'}, status=status.HTTP_400_BAD_REQUEST)

            if not user.is_active:
                return Response({'error': 'Ce compte est déjà inactif.'}, status=status.HTTP_400_BAD_REQUEST)

            user.is_active = False
            if fournisseur:
                fournisseur.statut = 'desactive'
                fournisseur.raison_refus = request.data.get('motif', '')
                fournisseur.save()
            user.save()

            self._log_action(request, user, 'Compte désactivé (suppression demandée)')
            return Response({'message': f'Utilisateur {user.email} désactivé avec succès.'})

        if action == 'notifier':
            sujet = request.data.get('sujet', 'Message de l\'administrateur AutoMeca')
            message = request.data.get('message', '').strip()
            if not message:
                return Response({'error': 'Le message est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

            body = (
                f"Bonjour {user.prenom or ''} {user.nom or ''},\n\n"
                f"{message}\n\n"
                f"Cordialement,\nL'équipe AutoMeca"
            )
            send_mail(sujet, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)

            # Notification in-app fournisseur si applicable
            if user.role == 'fournisseur' and fournisseur:
                try:
                    creer_notification_fournisseur(
                        fournisseur_id=user.id,
                        type_notif='systeme',
                        titre=sujet,
                        message=message,
                        lien='/fournisseur/notifications'
                    )
                except Exception:
                    pass

            self._log_action(request, user, f'Notification envoyée : {sujet}')
            return Response({'message': 'Notification envoyée.'})

        return Response({'error': 'Action non reconnue.'}, status=status.HTTP_400_BAD_REQUEST)

    def _log_action(self, request, user, message):
        try:
            from django.contrib.admin.models import LogEntry
            from django.contrib.contenttypes.models import ContentType
            LogEntry.objects.log_action(
                user_id=request.user.id,
                content_type_id=ContentType.objects.get_for_model(Utilisateur).pk,
                object_id=user.pk,
                object_repr=str(user),
                action_flag=2,
                change_message=message
            )
        except Exception:
            pass


class AdminUtilisateurActiviteView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            user = Utilisateur.objects.get(pk=pk)
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)

        # Activités de sécurité (connexions, actions)
        security_qs = SecurityActivity.objects.filter(user=user).order_by('-timestamp')[:50]

        # Logs admin (actions manuelles)
        from django.contrib.admin.models import LogEntry
        from django.contrib.contenttypes.models import ContentType
        ct = ContentType.objects.get_for_model(Utilisateur)
        logs = LogEntry.objects.filter(content_type=ct, object_id=str(user.pk)).select_related('user').order_by('-action_time')[:30]
        logs_data = [
            {
                'id': l.id,
                'type': 'admin',
                'action': 'Mise à jour',
                'detail': l.change_message,
                'utilisateur': f"{l.user.prenom or ''} {l.user.nom or ''}".strip() or l.user.email,
                'date': l.action_time
            }
            for l in logs
        ]

        return Response({
            'securite': SecurityActivityAdminSerializer(security_qs, many=True).data,
            'admin': logs_data
        })


class AdminUtilisateurNotificationView(APIView):
    """Envoi de notification groupée (tous, clients, fournisseurs, administrateurs)."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def post(self, request):
        cible = request.data.get('cible')
        sujet = request.data.get('sujet', 'Message de l\'administrateur AutoMeca')
        message = request.data.get('message', '').strip()

        if not message:
            return Response({'error': 'Le message est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)
        if cible not in ('tous', 'clients', 'fournisseurs', 'administrateurs'):
            return Response({'error': 'Cible invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        qs = Utilisateur.objects.filter(is_active=True, role__in=['client', 'fournisseur', 'admin'])
        if cible == 'clients':
            qs = qs.filter(role='client')
        elif cible == 'fournisseurs':
            qs = qs.filter(role='fournisseur')
        elif cible == 'administrateurs':
            qs = qs.filter(role='admin')

        emails = [u.email for u in qs if u.email]

        # Envoi par lots
        batch_size = 50
        sent = 0
        for i in range(0, len(emails), batch_size):
            batch = emails[i:i+batch_size]
            send_mail(
                sujet,
                f"{message}\n\nCordialement,\nL'équipe AutoMeca",
                settings.DEFAULT_FROM_EMAIL,
                batch,
                fail_silently=True
            )
            sent += len(batch)

        return Response({
            'message': f'Notification envoyée à {sent} destinataire(s).',
            'cible': cible,
            'nombre': sent
        })
