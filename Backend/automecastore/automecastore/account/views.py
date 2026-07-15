from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer, UtilisateurSerializer, CategorieSerializer, ProduitSerializer, MyTokenObtainPairSerializer, ClientSerializer, ClientDetailSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import generics, permissions, filters
from .models import Utilisateur, Client
from catalog.models import Categorie, Produit
from orders.models import Commande, LigneCommande
from account.permissions import IsAdmin, IsClient
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django_filters.rest_framework import DjangoFilterBackend

# Create your views here.
class CreateAdminView(APIView):
    """
    Vue sécurisée pour créer des administrateurs
    Uniquement accessible par les superusers existants
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Vérifier si l'utilisateur actuel est un superuser
        if not request.user.is_superuser:
            return Response(
                {'error': 'Accès non autorisé - Réservé aux superadministrateurs'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Récupérer les données de création d'admin
        email = request.data.get('email')
        password = request.data.get('password')
        nom = request.data.get('nom')
        prenom = request.data.get('prenom')
        telephone = request.data.get('telephone', '')
        adresse = request.data.get('adresse', '')
        
        if not all([email, password, nom, prenom]):
            return Response(
                {'error': 'Champs obligatoires manquants'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Créer l'utilisateur admin
            admin_user = Utilisateur.objects.create_user(
                email=email,
                password=password,
                nom=nom,
                prenom=prenom,
                telephone=telephone,
                adresse=adresse,
                role='admin',  # Rôle explicite
                is_staff=True,  # Accès admin Django
                is_active=True
            )
            
            # Créer l'entrée Administrateur
            from django.utils import timezone
            Administrateur.objects.create(
                user=admin_user,
                date_embauche=timezone.now().date()
            )
            
            return Response({
                'message': 'Administrateur créé avec succès',
                'admin_id': admin_user.id,
                'email': admin_user.email
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la création de l\'administrateur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RegisterView(APIView):
    def post(self, request):
        print(f"DEBUG: Inscription - Données reçues: {request.data}")
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            print(f"DEBUG: Inscription - Serializer validé")
            user = serializer.save()
            print(f"DEBUG: Inscription - Utilisateur créé: {user.email}, ID: {user.id}")
            print(f"DEBUG: Inscription - Utilisateur actif: {user.is_active}")
            
            # Notifier l'admin du nouveau client inscrit
            try:
                from django.core.cache import cache
                import json
                
                # Ajouter le nouveau client à la liste des notifications
                notification_data = {
                    'type': 'new_client',
                    'message': f"Nouveau client inscrit : {user.nom} {user.prenom} ({user.email})",
                    'client_id': user.id,
                    'timestamp': user.date_joined.isoformat(),
                    'data': {
                        'nom': user.nom,
                        'prenom': user.prenom,
                        'email': user.email,
                        'telephone': user.telephone,
                        'date_inscription': user.date_joined.isoformat()
                    }
                }
                
                # Stocker dans le cache pour notification temps réel
                notifications = cache.get('admin_notifications', [])
                notifications.insert(0, notification_data)  # Ajouter au début
                cache.set('admin_notifications', notifications[:50], timeout=3600)  # Garder max 50 notifications
                
                print(f"DEBUG: Notification admin créée pour nouveau client: {user.email}")
                
            except Exception as e:
                print(f"DEBUG: Erreur lors de la création de la notification: {e}")
            
            return Response(
                {"message": "Inscription réussie"},
                status=status.HTTP_201_CREATED
            )
        else:
            print(f"DEBUG: Inscription - Erreurs validation: {serializer.errors}")
        return Response(serializer.errors, status=400)
    
# Liste & Création
class CategorieListCreateView(generics.ListCreateAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer

    def get_permissions(self):
        if self.request.method in ['POST']:
            return [IsAdmin()]
        return [permissions.AllowAny()]

# Détail, Update, Delete
class CategorieDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdmin()]
        return [permissions.AllowAny()]
    
class ProduitListCreateView(generics.ListCreateAPIView):
    queryset = Produit.objects.all()
    serializer_class = ProduitSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]  # Seul Admin peut créer
        return [permissions.AllowAny()]  # Tous peuvent lire

# Détail, Update, Delete
class ProduitDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Produit.objects.all()
    serializer_class = ProduitSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdmin()]  # Seul Admin peut modifier/supprimer
        return [permissions.AllowAny()]  # Tous peuvent lire

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class UtilisateurDetailView(generics.RetrieveAPIView):
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer

# ==============================
# VIEWS POUR LA GESTION DES CLIENTS
# ==============================

class ClientListView(generics.ListAPIView):
    """
    Liste tous les clients pour l'administration (uniquement les vrais clients)
    """
    queryset = Client.objects.filter(user__role='client').select_related('user').order_by('-date_inscription')
    serializer_class = ClientSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user__is_active']
    search_fields = ['user__nom', 'user__prenom', 'user__email', 'user__telephone']
    ordering_fields = ['date_inscription', 'user__nom', 'user__email']
    ordering = ['-date_inscription']

class ClientDetailView(generics.RetrieveAPIView):
    """
    Détail d'un client spécifique
    """
    queryset = Client.objects.all().select_related('user')
    serializer_class = ClientDetailSerializer
    permission_classes = [IsAdmin]

class ClientToggleActiveView(APIView):
    """
    Activer/Désactiver un client
    """
    permission_classes = [IsAdmin]
    
    def post(self, request, pk):
        try:
            client = Client.objects.get(pk=pk)
            user = client.user
            user.is_active = not user.is_active
            user.save()
            
            statut = 'actif' if user.is_active else 'inactif'
            message = f"Client {user.nom} {user.prenom} {'activé' if user.is_active else 'désactivé'} avec succès"
            
            return Response({
                'message': message,
                'statut': statut,
                'user_id': user.id
            }, status=status.HTTP_200_OK)
            
        except Client.DoesNotExist:
            return Response(
                {'error': 'Client non trouvé'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class ClientDeleteView(APIView):
    """
    Supprimer un client (optionnel - avec confirmation)
    """
    permission_classes = [IsAdmin]
    
    def delete(self, request, pk):
        try:
            client = Client.objects.get(pk=pk)
            user = client.user
            email = user.email
            
            # Supprimer d'abord le client, puis l'utilisateur
            client.delete()
            user.delete()
            
            return Response({
                'message': f'Client {user_email} supprimé avec succès'
            }, status=status.HTTP_200_OK)
            
        except Client.DoesNotExist:
            return Response(
                {'error': 'Client non trouvé'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class ClientStatsView(APIView):
    """
    Statistiques sur les clients
    """
    permission_classes = [IsAdmin]
    
    def get(self, request):
        total_clients = Client.objects.count()
        clients_actifs = Client.objects.filter(user__is_active=True).count()
        clients_inactifs = total_clients - clients_actifs
        
        # Clients du mois
        from django.utils import timezone
        from datetime import datetime
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        nouveaux_clients = Client.objects.filter(date_inscription__gte=month_start).count()
        
        return Response({
            'total_clients': total_clients,
            'clients_actifs': clients_actifs,
            'clients_inactifs': clients_inactifs,
            'nouveaux_clients_ce_mois': nouveaux_clients,
            'taux_activation': round((clients_actifs / total_clients * 100) if total_clients > 0 else 0, 2)
        })

class AdminNotificationsView(APIView):
    """
    Récupérer les notifications admin pour le temps réel
    """
    permission_classes = [IsAdmin]
    
    def get(self, request):
        try:
            from django.core.cache import cache
            
            notifications = cache.get('admin_notifications', [])
            
            return Response({
                'notifications': notifications,
                'count': len(notifications)
            })
            
        except Exception as e:
            return Response(
                {'error': 'Erreur lors de la récupération des notifications'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request):
        """
        Vider les notifications
        """
        try:
            from django.core.cache import cache
            
            cache.delete('admin_notifications')
            
            return Response({
                'message': 'Notifications vidées avec succès'
            })
            
        except Exception as e:
            return Response(
                {'error': 'Erreur lors du vidage des notifications'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminDashboardStatsView(APIView):
    """
    Statistiques pour le dashboard admin
    """
    permission_classes = [IsAdmin]
    
    def get(self, request):
        try:
            from django.utils import timezone
            from datetime import timedelta
            from catalog.models import Categorie, Produit, Fournisseur
            from account.models import Client
            from orders.models import Commande, LigneCommande
            
            now = timezone.now()
            today = now.date()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            period = request.query_params.get('period', '7 jours')
            if period == '30 jours':
                since = now - timedelta(days=30)
            elif period == '90 jours':
                since = now - timedelta(days=90)
            elif period == 'Tout':
                since = None
            else:
                since = now - timedelta(days=7)
            
            # Statistiques produits
            produits_total = Produit.all_objects.count()
            produits_actifs = Produit.all_objects.filter(is_active=True).count()
            attente_validation = 0  # pas de workflow d'approbation dans ce modèle actuel
            ruptures_stock = Produit.all_objects.filter(stock__lt=5).count()
            produits_signales = Produit.all_objects.filter(is_active=False).count()
            
            # Statistiques fournisseurs
            fournisseurs_total = Fournisseur.objects.count()
            fournisseurs_actifs = Fournisseur.objects.filter(contrat_actif=True).count()
            fournisseurs_attente = Fournisseur.objects.filter(contrat_actif=False).count()
            fournisseurs_suspendus = Fournisseur.objects.filter(contrat_actif=False).count()
            
            # Statistiques clients
            clients_total = Client.objects.count()
            
            # Statistiques commandes
            commandes_jour = Commande.objects.filter(date_commande__date=today).count()
            commandes_mois = Commande.objects.filter(date_commande__gte=month_start).count()

            commandes_qs = Commande.objects.all()
            if since:
                commandes_qs = commandes_qs.filter(date_commande__gte=since)
            
            # Statistiques ventes (CA)
            lignes_commande_qs = LigneCommande.objects.select_related('commande')
            if since:
                lignes_commande_qs = lignes_commande_qs.filter(commande__date_commande__gte=since)
            ca_cumule = sum(float(ligne.prix_unitaire * ligne.quantite) for ligne in lignes_commande_qs)
            commissions = ca_cumule * 0.10  # 10% de commission
            
            # Réclamations (simulé pour l'instant)
            reclamations_actives = 0
            
            # Top catégories
            categories_stats = []
            for cat in Categorie.objects.all():
                qty = Produit.all_objects.filter(categorie=cat, is_active=True).count()
                if qty > 0:
                    categories_stats.append({
                        'name': cat.nom,
                        'qty': qty,
                        'pct': round(qty / produits_total * 100) if produits_total > 0 else 0,
                        'color': 'violet'
                    })
            
            # Graphique CA par mois basé sur les commandes réelles
            chart = []
            for offset in range(6):
                month_date = now - timedelta(days=30 * (5 - offset))
                start_of_month = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if start_of_month.month == 12:
                    next_month = start_of_month.replace(year=start_of_month.year + 1, month=1, day=1)
                else:
                    next_month = start_of_month.replace(month=start_of_month.month + 1, day=1)

                monthly_total = sum(
                    float(command.montant_total)
                    for command in Commande.objects.filter(
                        date_commande__gte=start_of_month,
                        date_commande__lt=next_month
                    )
                )
                chart.append({
                    'label': start_of_month.strftime('%b'),
                    'value': round(monthly_total)
                })
            
            top_fournisseurs = []
            for i, fournisseur in enumerate(Fournisseur.objects.all()[:5], 1):
                top_fournisseurs.append({
                    'rank': i,
                    'name': fournisseur.nom_entreprise,
                    'vendor': '',
                    'orders': 0,
                    'revenue': 0,
                    'rating': 0,
                    'reviews': 0
                })
            
            top_produits = []
            for i, produit in enumerate(
                Produit.all_objects.filter(is_active=True).order_by('-nombre_ventes')[:5],
                1
            ):
                top_produits.append({
                    'rank': i,
                    'name': produit.nom,
                    'ref': produit.reference or '',
                    'category': produit.categorie.nom if produit.categorie else '',
                    'sales': int(produit.nombre_ventes or 0),
                    'price': float(produit.prix)
                })
            
            return Response({
                'caCumule': round(ca_cumule, 2),
                'commissions': round(commissions, 2),
                'fournisseursTotal': fournisseurs_total,
                'fournisseursActifs': fournisseurs_actifs,
                'fournisseursAttente': fournisseurs_attente,
                'clientsTotal': clients_total,
                'produitsTotal': produits_total,
                'produitsActifs': produits_actifs,
                'attenteValidation': attente_validation,
                'commandesJour': commandes_jour,
                'commandesMois': commandes_mois,
                'reclamationsActives': reclamations_actives,
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
            return Response(
                {'error': f'Erreur lors de la récupération des statistiques: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminJournalActiviteView(APIView):
    """
    Journal d'activités pour l'administration
    """
    permission_classes = [IsAdmin]
    
    def get(self, request):
        try:
            from django.utils import timezone
            from datetime import timedelta
            
            # Récupérer les activités récentes
            # Pour l'instant, on simule avec les données existantes
            activities = []
            
            # Nouveaux clients
            from account.models import Client
            nouveaux_clients = Client.objects.filter(
                date_inscription__gte=timezone.now() - timedelta(days=7)
            ).order_by('-date_inscription')[:10]
            
            for client in nouveaux_clients:
                activities.append({
                    'id': f'client_{client.id}',
                    'type': 'nouveau_client',
                    'titre': f'Nouveau client inscrit',
                    'detail': f'{client.user.nom} {client.user.prenom}',
                    'date': client.date_inscription.isoformat(),
                    'user': client.user.email
                })
            
            # Nouveaux produits
            from catalog.models import Produit
            nouveaux_produits = Produit.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=7)
            ).order_by('-created_at')[:10]
            
            for produit in nouveaux_produits:
                activities.append({
                    'id': f'produit_{produit.id}',
                    'type': 'nouveau_produit',
                    'titre': f'Nouveau produit ajouté',
                    'detail': produit.nom,
                    'date': produit.created_at.isoformat(),
                    'user': produit.fournisseur.nom_entreprise if produit.fournisseur else 'Admin'
                })
            
            # Nouvelles commandes
            from orders.models import Commande
            nouvelles_commandes = Commande.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=7)
            ).order_by('-created_at')[:10]
            
            for commande in nouvelles_commandes:
                activities.append({
                    'id': f'commande_{commande.id}',
                    'type': 'nouvelle_commande',
                    'titre': f'Nouvelle commande',
                    'detail': f'Réf: {commande.reference} - {commande.montant_total} FCFA',
                    'date': commande.created_at.isoformat(),
                    'user': commande.client.user.email
                })
            
            # Trier par date
            activities.sort(key=lambda x: x['date'], reverse=True)
            
            return Response({
                'activities': activities[:50],  # Limiter à 50 activités
                'total': len(activities)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la récupération du journal: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )