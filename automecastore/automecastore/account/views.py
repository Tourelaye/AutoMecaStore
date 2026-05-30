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