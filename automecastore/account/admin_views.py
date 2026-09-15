"""
Views pour l'espace administrateur (gestion fournisseurs, validation, journal)
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions, filters
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import timedelta
import logging

from .models import Utilisateur, FournisseurProfile, JournalActivite
from .serializers import (
    FournisseurListSerializer,
    FournisseurProfileSerializer,
    FournisseurValidationSerializer,
    JournalActiviteSerializer
)
from .permissions import IsAdmin
from catalog.models import Produit
from catalog.serializers import ProduitSerializer as CatalogProduitSerializer
from orders.models import Commande, LigneCommande

logger = logging.getLogger(__name__)


# ==============================
# GESTION DES FOURNISSEURS (ADMIN)
# ==============================

class AdminFournisseurListView(generics.ListAPIView):
    """Liste tous les fournisseurs pour l'administration"""
    queryset = FournisseurProfile.objects.all().select_related('user').order_by('-date_inscription')
    serializer_class = FournisseurListSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom_entreprise', 'user__nom', 'user__prenom', 'user__email', 'siret']
    ordering_fields = ['date_inscription', 'nom_entreprise', 'statut', 'chiffre_affaires']
    ordering = ['-date_inscription']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtrer par statut si spécifié
        statut = self.request.query_params.get('statut')
        if statut and statut != 'tous':
            queryset = queryset.filter(statut=statut)
        return queryset


class AdminFournisseurDetailView(APIView):
    """Détail d'un fournisseur pour l'admin"""
    permission_classes = [IsAdmin]

    def get(self, request, user_id):
        try:
            profile = FournisseurProfile.objects.get(user_id=user_id)
            serializer = FournisseurProfileSerializer(profile)
            
            # Ajouter des stats supplémentaires
            data = serializer.data
            data['commandes_count'] = self._get_commandes_count(profile)
            data['produits_en_attente'] = self._get_produits_en_attente(profile)
            
            return Response(data)
        except FournisseurProfile.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)

    def _get_commandes_count(self, profile):
        from catalog.models import FournisseurProduit
        produit_ids = FournisseurProduit.objects.filter(
            fournisseur__user_id=profile.user_id
        ).values_list('produit_id', flat=True)
        return LigneCommande.objects.filter(
            produit_id__in=produit_ids
        ).values('commande_id').distinct().count()

    def _get_produits_en_attente(self, profile):
        from catalog.models import FournisseurProduit
        produit_ids = FournisseurProduit.objects.filter(
            fournisseur__user_id=profile.user_id
        ).values_list('produit_id', flat=True)
        return Produit.objects.filter(
            id__in=produit_ids,
            is_active=False
        ).count()


class AdminFournisseurValidationView(APIView):
    """Valider, suspendre ou réactiver un fournisseur"""
    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        serializer = FournisseurValidationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        try:
            profile = FournisseurProfile.objects.get(user_id=user_id)
            action = serializer.validated_data['action']
            commentaire = serializer.validated_data.get('commentaire', '')

            if action == 'valider':
                profile.statut = 'actif'
                profile.date_validation = timezone.now()
                profile.valide_par = request.user
                # Activer l'utilisateur
                profile.user.is_active = True
                profile.user.save()
                message = f"Fournisseur {profile.nom_entreprise} validé avec succès"
                journal_categorie = 'vendeurs'
                journal_action = 'validation'

            elif action == 'suspendre':
                profile.statut = 'suspendu'
                profile.user.is_active = False
                profile.user.save()
                message = f"Fournisseur {profile.nom_entreprise} suspendu"
                journal_categorie = 'vendeurs'
                journal_action = 'suspension'

            elif action == 'reactiver':
                profile.statut = 'actif'
                profile.user.is_active = True
                profile.user.save()
                message = f"Fournisseur {profile.nom_entreprise} réactivé"
                journal_categorie = 'vendeurs'
                journal_action = 'validation'

            profile.save()

            # Journaliser
            description = f"{message}"
            if commentaire:
                description += f" - Motif: {commentaire}"
            
            JournalActivite.objects.create(
                utilisateur=request.user,
                categorie=journal_categorie,
                action=journal_action,
                description=description,
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response({
                'message': message,
                'statut': profile.statut,
                'user_id': user_id
            })

        except FournisseurProfile.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)


class AdminFournisseurDeleteView(APIView):
    """Supprimer un fournisseur"""
    permission_classes = [IsAdmin]

    def delete(self, request, user_id):
        try:
            profile = FournisseurProfile.objects.get(user_id=user_id)
            user = profile.user
            nom = profile.nom_entreprise or f"{user.nom} {user.prenom}"
            
            # Journaliser avant suppression
            JournalActivite.objects.create(
                utilisateur=request.user,
                categorie='vendeurs',
                action='suppression',
                description=f"Fournisseur supprimé: {nom} ({user.email})",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            profile.delete()
            user.delete()
            
            return Response({'message': f'Fournisseur {nom} supprimé avec succès'})
        except FournisseurProfile.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)


# ==============================
# VALIDATION DES PRODUITS (ADMIN)
# ==============================

class AdminProduitsEnAttenteView(generics.ListAPIView):
    """Liste des produits en attente de validation"""
    serializer_class = CatalogProduitSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return Produit.objects.filter(is_active=False).order_by('-date_suppression')


class AdminValidationProduitView(APIView):
    """Valider ou refuser un produit soumis par un fournisseur"""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        action = request.data.get('action')
        if action not in ['valider', 'refuser']:
            return Response({'error': 'Action invalide'}, status=400)

        try:
            produit = Produit.all_objects.get(pk=pk)
            
            if action == 'valider':
                produit.is_active = True
                produit.date_suppression = None
                produit.save()
                message = f"Produit {produit.nom} validé et mis en ligne"
            else:
                message = f"Produit {produit.nom} refusé"
            
            # Journaliser
            JournalActivite.objects.create(
                utilisateur=request.user,
                categorie='produits',
                action='validation',
                description=message,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            return Response({'message': message})
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


# ==============================
# JOURNAL D'ACTIVITÉ (ADMIN)
# ==============================

class AdminJournalListView(generics.ListAPIView):
    """Liste des entrées du journal d'activité"""
    queryset = JournalActivite.objects.all().select_related('utilisateur')
    serializer_class = JournalActiviteSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description', 'utilisateur__nom', 'utilisateur__prenom', 'utilisateur__email', 'ip_address']
    ordering_fields = ['date_creation']
    ordering = ['-date_creation']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtrer par catégorie
        categorie = self.request.query_params.get('categorie')
        if categorie and categorie != 'toutes':
            queryset = queryset.filter(categorie=categorie)
        # Filtrer par action
        action = self.request.query_params.get('action')
        if action and action != 'toutes':
            queryset = queryset.filter(action=action)
        return queryset

    def delete(self, request):
        """Vider le journal d'activité"""
        count = JournalActivite.objects.count()
        JournalActivite.objects.all().delete()
        JournalActivite.objects.create(
            utilisateur=request.user,
            categorie='systeme',
            action='suppression',
            description=f"Journal d'activité vidé ({count} entrées supprimées)",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({'message': f'Journal vidé ({count} entrées supprimées)'})


class AdminJournalClearView(APIView):
    """Vider le journal d'activité"""
    permission_classes = [IsAdmin]

    def delete(self, request):
        count = JournalActivite.objects.count()
        JournalActivite.objects.all().delete()
        
        JournalActivite.objects.create(
            utilisateur=request.user,
            categorie='systeme',
            action='suppression',
            description=f"Journal d'activité vidé ({count} entrées supprimées)",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return Response({'message': f'Journal vidé ({count} entrées supprimées)'})


# ==============================
# STATISTIQUES DASHBOARD ADMIN
# ==============================

class AdminDashboardStatsView(APIView):
    """Statistiques du dashboard admin - format attendu par le frontend"""
    permission_classes = [IsAdmin]

    def get(self, request):
        from datetime import date, datetime, time, timedelta
        from calendar import monthrange
        from .models import Client
        from support.models import Avis, Reclamation

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

            # ---- Donnees brutes ----
            clients_total = Client.objects.count()
            clients_mois = Client.objects.filter(date_inscription__gte=this_month_start).count()
            clients_mois_prev = Client.objects.filter(
                date_inscription__gte=last_month_start,
                date_inscription__lt=this_month_start
            ).count()

            fournisseurs_total = FournisseurProfile.objects.count()
            fournisseurs_attente = FournisseurProfile.objects.filter(statut='en_attente').count()
            fournisseurs_mois = FournisseurProfile.objects.filter(date_inscription__gte=this_month_start).count()
            fournisseurs_mois_prev = FournisseurProfile.objects.filter(
                date_inscription__gte=last_month_start,
                date_inscription__lt=this_month_start
            ).count()

            produits_total = Produit.objects.count()
            produits_mois = 0
            produits_mois_prev = 0

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
                    'label': "Commandes aujourd'hui",
                    'icon': 'bi-cart-check',
                    'currency': False
                },
                {
                    'key': 'ca_global',
                    'value': round(ca_total, 2),
                    'variation': variation(ca_mois, ca_mois_prev),
                    'label': "Chiffre d'affaires global",
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
                    'label': 'Reclamations ouvertes',
                    'icon': 'bi-exclamation-triangle',
                    'currency': False,
                    'alert': reclamations_ouvertes > 0
                },
            ]

            # ---- Evolutions mensuelles (12 derniers mois) ----
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

            # ---- Repartition categories ----
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
                    'nom': row['produit__categorie__nom'] or 'Non categorise',
                    'ventes': int(row['ventes'] or 0),
                    'ca': ca,
                    'pct': round((ca / total_cat_ca) * 100, 1) if total_cat_ca else 0
                })

            # ---- Ventes par region (vide car pas de magasin avec region) ----
            ventes_par_region = []

            # ---- Top categories ----
            top_categories = repartition_categories[:5]

            # ---- Activite recente ----
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

            for f in FournisseurProfile.objects.select_related('user').order_by('-date_inscription')[:3]:
                add_activite(f.date_inscription, 'magasin', 'bi-shop',
                             f'Nouveau magasin <strong>{f.nom_entreprise}</strong> inscrit',
                             '/admin/fournisseurs', f.user_id)

            for p in Produit.objects.select_related('categorie').order_by('-id')[:3]:
                add_activite(now, 'produit', 'bi-box-seam',
                             f'Nouveau produit <strong>{p.nom}</strong> ajoute',
                             '/admin/produits', p.id)

            for cmd in Commande.objects.select_related('client__user').order_by('-date_commande')[:3]:
                client = ''
                if cmd.client_id:
                    try:
                        client = f"{cmd.client.user.prenom} {cmd.client.user.nom}".strip()
                    except Exception:
                        client = 'Client'
                add_activite(cmd.date_commande, 'commande', 'bi-cart-check',
                             f'Nouvelle commande <strong>{cmd.reference}</strong> de {client}',
                             '/admin/commandes', cmd.id)

            for c in Client.objects.select_related('user').order_by('-date_inscription')[:3]:
                nom = f"{c.user.prenom} {c.user.nom}".strip()
                add_activite(c.date_inscription, 'client', 'bi-person-plus',
                             f'Nouveau client <strong>{nom}</strong> inscrit',
                             '/admin/clients', c.user_id)

            for avis in Avis.objects.select_related('client__user', 'produit').order_by('-date')[:3]:
                client = ''
                if avis.client_id:
                    try:
                        client = f"{avis.client.user.prenom} {avis.client.user.nom}".strip()
                    except Exception:
                        pass
                produit = avis.produit.nom if avis.produit_id else 'Produit'
                add_activite(avis.date, 'avis', 'bi-chat-left-text',
                             f'Nouvel avis <strong>{avis.note}/5</strong> sur {produit} par {client}',
                             '/admin/avis', avis.id)

            for rec in Reclamation.objects.select_related('client__user').order_by('-date_soumission')[:3]:
                client = ''
                if rec.client_id:
                    try:
                        client = f"{rec.client.user.prenom} {rec.client.user.nom}".strip()
                    except Exception:
                        pass
                add_activite(rec.date_soumission, 'reclamation', 'bi-exclamation-circle',
                             f'Reclamation <strong>{rec.objet}</strong> creee par {client}',
                             '/admin/avis', rec.id)

            activites.sort(key=lambda x: x['date'], reverse=True)
            activites = activites[:12]

            # ---- Alertes ----
            alertes = []

            for p in Produit.objects.filter(is_active=False)[:5]:
                alertes.append({
                    'type': 'produit_en_attente',
                    'severity': 'warning',
                    'message': f'{p.nom} est en attente de validation',
                    'lien': '/admin/approbation-produits',
                    'id': p.id
                })

            for f in FournisseurProfile.objects.filter(statut='en_attente').select_related('user')[:5]:
                alertes.append({
                    'type': 'magasin_a_verifier',
                    'severity': 'warning',
                    'message': f'Le magasin {f.nom_entreprise} est en attente de validation',
                    'lien': '/admin/fournisseurs',
                    'id': f.user_id
                })

            for p in Produit.objects.filter(stock=0, is_active=True)[:5]:
                alertes.append({
                    'type': 'stock_critique',
                    'severity': 'error',
                    'message': f'Stock critique pour {p.nom} ({p.stock} restants)',
                    'lien': '/admin/produits',
                    'id': p.id
                })

            alertes.append({
                'type': 'systeme',
                'severity': 'info',
                'message': 'Aucune erreur systeme detectee',
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
            for f in FournisseurProfile.objects.select_related('user').order_by('-date_inscription')[:5]:
                derniers_magasins.append({
                    'id': f.user_id,
                    'nom': f.nom_entreprise,
                    'fournisseur': f.nom_entreprise,
                    'ville': '',
                    'region': '',
                    'logo': image_url(f.logo) if f.logo else None,
                    'date': f.date_inscription.isoformat() if f.date_inscription else None,
                    'statut': f.statut
                })

            derniers_produits = []
            for p in Produit.objects.select_related('categorie').order_by('-id')[:5]:
                image = image_url(p.image) if p.image else None
                derniers_produits.append({
                    'id': p.id,
                    'nom': p.nom,
                    'categorie': p.categorie.nom if p.categorie else '',
                    'prix': float(p.prix),
                    'statut': 'approuve' if p.is_active else 'en_attente',
                    'image': image,
                    'date': None,
                    'fournisseur': ''
                })

            dernieres_commandes = []
            for cmd in Commande.objects.select_related('client__user').order_by('-date_commande')[:5]:
                client = user_full_name(cmd.client.user) if cmd.client_id and cmd.client and cmd.client.user else 'Client'
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
                'error': f'Erreur lors de la recuperation des statistiques: {str(e)}',
                'detail': traceback.format_exc()
            }, status=500)


# ==============================
# COMMANDES DES FOURNISSEURS (ADMIN)
# ==============================

class AdminFournisseurCommandesView(generics.ListAPIView):
    """Liste toutes les commandes associées aux produits d'un fournisseur"""
    serializer_class = None  # Serializer personnalisé ci-dessous
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['commande__reference', 'commande__client__user__email']
    ordering_fields = ['commande__date_commande', 'commande__montant_total', 'commande__statut']
    ordering = ['-commande__date_commande']
    
    def get_queryset(self):
        from catalog.models import FournisseurProduit
        
        fournisseur_id = self.kwargs.get('fournisseur_id')
        
        try:
            fournisseur = FournisseurProfile.objects.get(user_id=fournisseur_id)
        except FournisseurProfile.DoesNotExist:
            return LigneCommande.objects.none()
        
        # Récupérer tous les produits du fournisseur (via catalog.Fournisseur.user)
        produit_ids = FournisseurProduit.objects.filter(
            fournisseur__user_id=fournisseur_id
        ).values_list('produit_id', flat=True)
        
        # Récupérer toutes les lignes de commande avec ces produits
        return LigneCommande.objects.filter(
            produit_id__in=produit_ids
        ).select_related('commande', 'produit').order_by('-commande__date_commande')
    
    def list(self, request, *args, **kwargs):
        """Override pour retourner un format personnalisé"""
        queryset = self.get_queryset()
        
        # Grouper par commande
        commandes_dict = {}
        for ligne in queryset:
            cmd_id = ligne.commande.id
            if cmd_id not in commandes_dict:
                commandes_dict[cmd_id] = {
                    'id': cmd_id,
                    'reference': ligne.commande.reference,
                    'date': ligne.commande.date_commande.isoformat(),
                    'statut': ligne.commande.statut,
                    'montant_total': float(ligne.commande.montant_total),
                    'client': f"{ligne.commande.client.user.nom} {ligne.commande.client.user.prenom}",
                    'email': ligne.commande.client.user.email,
                    'lignes': []
                }
            
            commandes_dict[cmd_id]['lignes'].append({
                'produit': ligne.produit.nom,
                'quantite': ligne.quantite,
                'prix_unitaire': float(ligne.prix_unitaire),
                'sous_total': float(ligne.sous_total or 0)
            })
        
        commandes = list(commandes_dict.values())
        
        # Ajouter stats
        stats = {
            'total_commandes': len(commandes),
            'montant_cumule': sum(c['montant_total'] for c in commandes),
            'commandes_par_statut': {
                'en_attente': len([c for c in commandes if c['statut'] == 'en_attente']),
                'validee': len([c for c in commandes if c['statut'] == 'validee']),
                'expediee': len([c for c in commandes if c['statut'] == 'expediee']),
                'livree': len([c for c in commandes if c['statut'] == 'livree']),
                'annulee': len([c for c in commandes if c['statut'] == 'annulee']),
            }
        }
        
        return Response({
            'stats': stats,
            'commandes': commandes
        })


# ==============================
# PRODUITS DES FOURNISSEURS (ADMIN)
# ==============================

class AdminFournisseurProduitsView(generics.ListAPIView):
    """Liste tous les produits d'un fournisseur"""
    serializer_class = CatalogProduitSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'description', 'reference', 'marque']
    ordering_fields = ['nom', 'prix', 'stock', 'is_active', 'nombre_ventes']
    ordering = ['-nombre_ventes']
    
    def get_queryset(self):
        from catalog.models import FournisseurProduit
        
        fournisseur_id = self.kwargs.get('fournisseur_id')
        
        try:
            fournisseur = FournisseurProfile.objects.get(user_id=fournisseur_id)
        except FournisseurProfile.DoesNotExist:
            return Produit.objects.none()
        
        # Récupérer tous les produits associés au fournisseur (via catalog.Fournisseur.user)
        produit_ids = FournisseurProduit.objects.filter(
            fournisseur__user_id=fournisseur_id
        ).values_list('produit_id', flat=True)
        
        return Produit.all_objects.filter(
            id__in=produit_ids
        ).select_related('categorie', 'type_piece').order_by('-nombre_ventes')
    
    def list(self, request, *args, **kwargs):
        """Override pour ajouter des stats par produit"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        # Ajouter les stats des produits
        produits_data = serializer.data
        stats = {
            'total_produits': queryset.count(),
            'produits_actifs': queryset.filter(is_active=True).count(),
            'produits_inactifs': queryset.filter(is_active=False).count(),
            'total_ventes': sum(p.get('nombre_ventes', 0) for p in produits_data),
            'total_stock': sum(p.get('stock', 0) for p in produits_data),
            'produits_rupture': queryset.filter(stock=0, is_active=True).count(),
        }
        
        return Response({
            'stats': stats,
            'produits': produits_data
        })


# ==============================
# STATISTIQUES DÉTAILLÉES FOURNISSEUR (ADMIN)
# ==============================

class AdminFournisseurStatsView(APIView):
    """Statistiques détaillées d'un fournisseur"""
    permission_classes = [IsAdmin]
    
    def get(self, request, fournisseur_id):
        from catalog.models import FournisseurProduit
        
        try:
            fournisseur = FournisseurProfile.objects.get(user_id=fournisseur_id)
        except FournisseurProfile.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)
        
        # Produits du fournisseur (via catalog.Fournisseur.user)
        produit_ids = FournisseurProduit.objects.filter(
            fournisseur__user_id=fournisseur_id
        ).values_list('produit_id', flat=True)
        
        produits = Produit.all_objects.filter(id__in=produit_ids)
        
        # Commandes
        lignes = LigneCommande.objects.filter(produit_id__in=produit_ids)
        commandes_count = lignes.values('commande_id').distinct().count()
        
        # Statistiques détaillées
        stats = {
            'fournisseur': {
                'id': fournisseur.user_id,
                'nom': fournisseur.nom_entreprise,
                'email': fournisseur.user.email,
                'statut': fournisseur.statut,
                'date_inscription': fournisseur.date_inscription.isoformat(),
                'siret': fournisseur.siret,
                'note_moyenne': float(fournisseur.note_moyenne or 0),
                'nombre_avis': fournisseur.nombre_avis,
            },
            'produits': {
                'total': produits.count(),
                'actifs': produits.filter(is_active=True).count(),
                'inactifs': produits.filter(is_active=False).count(),
                'total_stock': sum(p.stock for p in produits),
                'ruptures': produits.filter(stock=0, is_active=True).count(),
                'prix_moyen': float(produits.aggregate(
                    avg_price=Sum('prix') / Count('id')
                )['avg_price'] or 0) if produits.exists() else 0,
            },
            'commandes': {
                'total': commandes_count,
                'total_lignes': lignes.count(),
                'montant_cumule': float(lignes.aggregate(
                    total=Sum('sous_total')
                )['total'] or 0),
                'quantite_totale': lignes.aggregate(
                    total=Sum('quantite')
                )['total'] or 0,
            },
            'ventes': {
                'total_ventes': produits.aggregate(
                    total=Sum('nombre_ventes')
                )['total'] or 0,
                'total_favoris': produits.aggregate(
                    total=Sum('nombre_favoris')
                )['total'] or 0,
                'total_vues': produits.aggregate(
                    total=Sum('nombre_vues')
                )['total'] or 0,
            }
        }
        
        return Response(stats)