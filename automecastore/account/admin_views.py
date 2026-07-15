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
            fournisseur=profile
        ).values_list('produit_id', flat=True)
        return LigneCommande.objects.filter(
            produit_id__in=produit_ids
        ).values('commande_id').distinct().count()

    def _get_produits_en_attente(self, profile):
        from catalog.models import FournisseurProduit
        produit_ids = FournisseurProduit.objects.filter(
            fournisseur=profile
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
    """Statistiques pour le dashboard admin"""
    permission_classes = [IsAdmin]

    def get(self, request):
        # Fournisseurs
        total_fournisseurs = FournisseurProfile.objects.count()
        fournisseurs_actifs = FournisseurProfile.objects.filter(statut='actif').count()
        fournisseurs_attente = FournisseurProfile.objects.filter(statut='en_attente').count()
        fournisseurs_suspendus = FournisseurProfile.objects.filter(statut='suspendu').count()
        
        # Produits
        total_produits = Produit.objects.filter(is_active=True).count()
        produits_attente = Produit.objects.filter(is_active=False).exclude(is_active=None).count()
        produits_signales = 0  # À implémenter si besoin
        ruptures_stock = Produit.objects.filter(stock=0, is_active=True).count()
        
        # Commandes
        commandes_jour = Commande.objects.filter(
            date_commande__date=timezone.now().date()
        ).count()
        commandes_mois = Commande.objects.filter(
            date_commande__gte=timezone.now().replace(day=1)
        ).count()
        
        # Chiffre d'affaires
        ca_cumule = Commande.objects.aggregate(
            total=Sum('montant_total')
        )['total'] or 0
        
        # Clients
        from .models import Client
        total_clients = Client.objects.count()
        
        # Réclamations (à implémenter)
        reclamations_actives = 0
        
        # Top fournisseurs par chiffre d'affaires
        top_fournisseurs = self._get_top_fournisseurs()
        
        # Top produits par nombre de ventes
        top_produits = self._get_top_produits()
        
        return Response({
            'caCumule': float(ca_cumule),
            'commissions': float(ca_cumule) * 0.1,
            'fournisseursTotal': total_fournisseurs,
            'fournisseursActifs': fournisseurs_actifs,
            'fournisseursAttente': fournisseurs_attente,
            'fournisseursSuspendus': fournisseurs_suspendus,
            'clientsTotal': total_clients,
            'produitsTotal': total_produits,
            'produitsActifs': total_produits,
            'attenteValidation': produits_attente,
            'commandesJour': commandes_jour,
            'commandesMois': commandes_mois,
            'reclamationsActives': reclamations_actives,
            'rupturesStock': ruptures_stock,
            'produitsSignales': produits_signales,
            'commissionRate': '10% standard',
            'evolutionPct': 15.4,
            'categories': [],
            'chart': [],
            'topFournisseurs': top_fournisseurs,
            'topProduits': top_produits
        })
    
    def _get_top_fournisseurs(self):
        """Récupère les top 5 fournisseurs par chiffre d'affaires"""
        from catalog.models import FournisseurProduit
        
        top_fournisseurs = []
        fournisseurs = FournisseurProfile.objects.filter(statut='actif').order_by('-chiffre_affaires')[:5]
        
        for fournisseur in fournisseurs:
            top_fournisseurs.append({
                'id': fournisseur.user_id,
                'nom': fournisseur.nom_entreprise,
                'ca': float(fournisseur.chiffre_affaires or 0),
                'produits': fournisseur.nombre_produits,
                'ventes': fournisseur.nombre_ventes,
                'note': float(fournisseur.note_moyenne or 0),
                'statut': fournisseur.statut
            })
        
        return top_fournisseurs
    
    def _get_top_produits(self):
        """Récupère les top 5 produits par nombre de ventes"""
        top_produits = []
        produits = Produit.objects.filter(is_active=True).order_by('-nombre_ventes')[:5]
        
        for produit in produits:
            top_produits.append({
                'id': produit.id,
                'nom': produit.nom,
                'prix': float(produit.prix),
                'ventes': produit.nombre_ventes,
                'stock': produit.stock,
                'categorie': str(produit.categorie) if produit.categorie else 'N/A'
            })
        
        return top_produits


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
        
        # Récupérer tous les produits du fournisseur
        produit_ids = FournisseurProduit.objects.filter(
            fournisseur=fournisseur
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
        
        # Récupérer tous les produits associés au fournisseur
        produit_ids = FournisseurProduit.objects.filter(
            fournisseur=fournisseur
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
        
        # Produits du fournisseur
        produit_ids = FournisseurProduit.objects.filter(
            fournisseur=fournisseur
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