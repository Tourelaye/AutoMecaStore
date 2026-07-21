from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import (
    RegisterSerializer, RegisterFournisseurSerializer,
    UtilisateurSerializer, CategorieSerializer, ProduitSerializer,
    MyTokenObtainPairSerializer, ClientSerializer, ClientDetailSerializer
)
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import generics, permissions, filters
from .models import Utilisateur, Client, Fournisseur
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
            
            # Créer automatiquement le profil Client pour les utilisateurs avec role='client'
            if user.role == 'client':
                try:
                    from django.utils import timezone
                    Client.objects.create(
                        user=user,
                        date_inscription=timezone.now(),
                        point_fidelite=0
                    )
                    print(f"DEBUG: Profil Client créé automatiquement pour: {user.email}")
                except Exception as e:
                    print(f"DEBUG: Erreur lors de la création du profil Client: {e}")
            
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
    


class RegisterFournisseurView(APIView):
    """
    Inscription publique d'un fournisseur.
    Le compte est créé avec le statut 'attente' et doit être validé par un admin.
    """
    def post(self, request):
        serializer = RegisterFournisseurSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Notifier l'admin qu'un nouveau fournisseur est en attente de validation
            try:
                from django.core.cache import cache

                notification_data = {
                    'type': 'fournisseur',
                    'message': f"Nouveau fournisseur en attente : {user.nom} {user.prenom} ({user.email})",
                    'fournisseur_id': user.id,
                    'timestamp': user.date_joined.isoformat(),
                    'data': {
                        'nom': user.nom,
                        'prenom': user.prenom,
                        'email': user.email,
                        'telephone': user.telephone,
                        'nom_entreprise': user.fournisseur.nom_entreprise,
                        'date_inscription': user.date_joined.isoformat()
                    }
                }

                notifications = cache.get('admin_notifications', [])
                notifications.insert(0, notification_data)
                cache.set('admin_notifications', notifications[:50], timeout=3600)
            except Exception as e:
                print(f"DEBUG: Erreur notification fournisseur: {e}")

            return Response(
                {
                    "message": "Inscription réussie. Votre compte sera examiné et validé par un administrateur.",
                    "email": user.email,
                    "role": user.role
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
    lookup_field = 'user'
    lookup_url_kwarg = 'user_id'

class ClientToggleActiveView(APIView):
    """
    Activer/Désactiver un client
    """
    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        try:
            client = Client.objects.get(user_id=user_id)
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

    def delete(self, request, user_id):
        try:
            client = Client.objects.get(user_id=user_id)
            user = client.user
            email = user.email
            
            # Supprimer d'abord le client, puis l'utilisateur
            client.delete()
            user.delete()
            
            return Response({
                'message': f'Client {email} supprimé avec succès'
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
            from django.utils import timezone
            from datetime import timedelta
            from catalog.models import Produit
            from orders.models import Commande
            from django.core.cache import cache
            
            notifications = []
            
            # Notifications temps réel en cache (inscriptions fournisseurs, clients...)
            cached_notifications = cache.get('admin_notifications', [])
            notified_fournisseur_ids = set()
            for n in cached_notifications:
                notifications.append({
                    'id': f"cache_{n.get('type', 'info')}_{n.get('fournisseur_id') or n.get('client_id')}",
                    'message': n.get('message', 'Notification'),
                    'time': 'À l\'instant',
                    'type': n.get('type', 'info'),
                    'read': False,
                    'data': n.get('data', {})
                })
                if n.get('type') == 'fournisseur' and n.get('fournisseur_id'):
                    notified_fournisseur_ids.add(int(n.get('fournisseur_id')))

            # Fournisseurs en attente de validation
            pending_suppliers = Fournisseur.objects.filter(statut='attente').select_related('user')
            for f in pending_suppliers:
                if f.user_id in notified_fournisseur_ids:
                    continue
                notifications.append({
                    'id': f'fournisseur_{f.user_id}',
                    'message': f"Fournisseur en attente : {f.user.nom} {f.user.prenom} ({f.user.email})",
                    'time': 'À l\'instant',
                    'type': 'fournisseur',
                    'read': False,
                    'data': {
                        'nom': f.user.nom,
                        'prenom': f.user.prenom,
                        'email': f.user.email,
                        'telephone': f.user.telephone,
                        'nom_entreprise': f.nom_entreprise,
                        'date_inscription': f.date_inscription.isoformat() if f.date_inscription else None
                    }
                })
            
            # Vérifier les nouvelles commandes (dernières 24h)
            recent_orders = Commande.objects.filter(
                date_commande__gte=timezone.now() - timedelta(hours=24)
            ).count()
            
            if recent_orders > 0:
                notifications.append({
                    'id': 'orders_count',
                    'message': f'{recent_orders} nouvelle(s) commande(s) en attente',
                    'time': 'Il y a quelques minutes',
                    'type': 'order',
                    'read': False
                })
            
            # Vérifier les stocks critiques
            low_stock_products = Produit.objects.filter(
                stock__lte=5,
                is_active=True
            ).count()
            
            if low_stock_products > 0:
                notifications.append({
                    'id': 'stock_count',
                    'message': f'{low_stock_products} produit(s) en stock critique',
                    'time': 'Il y a quelques minutes',
                    'type': 'stock',
                    'read': False
                })
            
            # Vérifier les nouveaux clients (dernières 24h)
            new_clients = Client.objects.filter(
                date_inscription__gte=timezone.now() - timedelta(hours=24)
            ).count()
            
            if new_clients > 0:
                notifications.append({
                    'id': 'clients_count',
                    'message': f'{new_clients} nouveau(x) client(s) inscrit(s)',
                    'time': 'Il y a quelques minutes',
                    'type': 'client',
                    'read': False
                })
            
            # Produits en attente d'approbation
            produits_attente = Produit.objects.filter(statut_approbation='en_attente').count()
            if produits_attente > 0:
                notifications.append({
                    'id': 'produits_attente',
                    'message': f'{produits_attente} produit(s) en attente d\'approbation',
                    'time': 'À l\'instant',
                    'type': 'produit',
                    'read': False
                })
            
            # Si aucune notification réelle, ajouter une notification système par défaut
            if not notifications:
                notifications.append({
                    'id': 'system',
                    'message': 'Système opérationnel',
                    'time': 'Il y a 1h',
                    'type': 'system',
                    'read': True
                })
            
            unread_count = sum(1 for n in notifications if not n['read'])
            
            return Response({
                'notifications': notifications,
                'count': unread_count
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