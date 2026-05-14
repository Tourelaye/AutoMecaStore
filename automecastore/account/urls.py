from django.urls import path
from .views import (
    RegisterView, MyTokenObtainPairView, UtilisateurDetailView, 
    CategorieListCreateView, CategorieDetailView, ProduitListCreateView, ProduitDetailView,
    ClientListView, ClientDetailView, ClientToggleActiveView, ClientDeleteView, ClientStatsView,
    AdminNotificationsView, CreateAdminView
)
from .mon_compte_views import MeView, MesCommandesView, FavorisView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'), 
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UtilisateurDetailView.as_view(), name='utilisateur_detail'),
    path('categories/', CategorieListCreateView.as_view(), name='categorie_list_create'),
    path('categories/<int:pk>/', CategorieDetailView.as_view(), name='categorie_detail'),
    path('produits/', ProduitListCreateView.as_view(), name='produit_list_create'),
    path('produits/<int:pk>/', ProduitDetailView.as_view(), name='produit_detail'),
    
    # URLs pour la gestion des clients (admin)
    path('clients/', ClientListView.as_view(), name='client_list'),
    path('clients/<int:pk>/', ClientDetailView.as_view(), name='client_detail'),
    path('clients/<int:pk>/toggle-active/', ClientToggleActiveView.as_view(), name='client_toggle_active'),
    path('clients/<int:pk>/delete/', ClientDeleteView.as_view(), name='client_delete'),
    path('clients/stats/', ClientStatsView.as_view(), name='client_stats'),
    
    # URLs pour les notifications admin
    path('notifications/', AdminNotificationsView.as_view(), name='admin_notifications'),
    
    # URL pour la création d'administrateurs (sécurisée)
    path('create-admin/', CreateAdminView.as_view(), name='create_admin'),
    
    # URLs pour la page "Mon Compte" (client)
    path('me/', MeView.as_view(), name='me'),
    path('mes-commandes/', MesCommandesView.as_view(), name='mes_commandes'),
    path('favoris/', FavorisView.as_view(), name='favoris'),
]