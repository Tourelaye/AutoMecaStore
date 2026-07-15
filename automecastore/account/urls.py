from django.urls import path
from .views import (
    RegisterView, MyTokenObtainPairView, UtilisateurDetailView, 
    CategorieListCreateView, CategorieDetailView, ProduitListCreateView, ProduitDetailView,
    ClientListView, ClientDetailView, ClientToggleActiveView, ClientDeleteView, ClientStatsView,
    AdminNotificationsView, CreateAdminView
)
from .mon_compte_views import MeView, MesCommandesView, FavorisView, PanierView
from .fournisseur_views import (
    RegisterFournisseurView,
    FournisseurProfileView,
    FournisseurProduitsView,
    FournisseurProduitDetailView,
    FournisseurCommandesView,
    FournisseurCommandeDetailView,
    FournisseurStatsView,
    FournisseurStocksView,
    FournisseurPromotionsView,
    FournisseurVentesView,
)
from .admin_views import (
    AdminFournisseurListView,
    AdminFournisseurDetailView,
    AdminFournisseurValidationView,
    AdminFournisseurDeleteView,
    AdminProduitsEnAttenteView,
    AdminValidationProduitView,
    AdminJournalListView,
    AdminJournalClearView,
    AdminDashboardStatsView,
    AdminFournisseurCommandesView,
    AdminFournisseurProduitsView,
    AdminFournisseurStatsView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # ===== AUTH =====
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'), 
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UtilisateurDetailView.as_view(), name='utilisateur_detail'),
    
    # ===== CATEGORIES & PRODUITS (via account) =====
    path('categories/', CategorieListCreateView.as_view(), name='categorie_list_create'),
    path('categories/<int:pk>/', CategorieDetailView.as_view(), name='categorie_detail'),
    path('produits/', ProduitListCreateView.as_view(), name='produit_list_create'),
    path('produits/<int:pk>/', ProduitDetailView.as_view(), name='produit_detail'),
    
    # ===== GESTION CLIENTS (ADMIN) =====
    path('clients/', ClientListView.as_view(), name='client_list'),
    path('clients/<int:user_id>/', ClientDetailView.as_view(), name='client_detail'),
    path('clients/<int:user_id>/toggle-active/', ClientToggleActiveView.as_view(), name='client_toggle_active'),
    path('clients/<int:user_id>/delete/', ClientDeleteView.as_view(), name='client_delete'),
    path('clients/stats/', ClientStatsView.as_view(), name='client_stats'),
    
    # ===== NOTIFICATIONS ADMIN =====
    path('notifications/', AdminNotificationsView.as_view(), name='admin_notifications'),
    
    # ===== CRÉATION ADMIN =====
    path('create-admin/', CreateAdminView.as_view(), name='create_admin'),
    
    # ===== MON COMPTE (CLIENT) =====
    path('me/', MeView.as_view(), name='me'),
    path('mes-commandes/', MesCommandesView.as_view(), name='mes_commandes'),
    path('favoris/', FavorisView.as_view(), name='favoris'),
    path('panier/', PanierView.as_view(), name='panier'),
    path('panier/add/', PanierView.as_view(), name='panier_add'),
    path('panier/<int:item_id>/', PanierView.as_view(), name='panier_item'),
    
    # ===== ESPACE FOURNISSEUR =====
    # Inscription
    path('fournisseur/register/', RegisterFournisseurView.as_view(), name='fournisseur_register'),
    # Profil
    path('fournisseur/profile/', FournisseurProfileView.as_view(), name='fournisseur_profile'),
    # Produits
    path('fournisseur/produits/', FournisseurProduitsView.as_view(), name='fournisseur_produits'),
    path('fournisseur/produits/<int:pk>/', FournisseurProduitDetailView.as_view(), name='fournisseur_produit_detail'),
    # Commandes
    path('fournisseur/commandes/', FournisseurCommandesView.as_view(), name='fournisseur_commandes'),
    path('fournisseur/commandes/<int:pk>/', FournisseurCommandeDetailView.as_view(), name='fournisseur_commande_detail'),
    # Statistiques
    path('fournisseur/stats/', FournisseurStatsView.as_view(), name='fournisseur_stats'),
    # Stocks
    path('fournisseur/stocks/', FournisseurStocksView.as_view(), name='fournisseur_stocks'),
    path('fournisseur/stocks/<int:pk>/', FournisseurStocksView.as_view(), name='fournisseur_stock_update'),
    # Promotions
    path('fournisseur/promotions/', FournisseurPromotionsView.as_view(), name='fournisseur_promotions'),
    path('fournisseur/promotions/<int:pk>/', FournisseurPromotionsView.as_view(), name='fournisseur_promotion_delete'),
    # Ventes
    path('fournisseur/ventes/', FournisseurVentesView.as_view(), name='fournisseur_ventes'),
    
    # ===== ESPACE ADMIN =====
    # Gestion des fournisseurs
    path('admin/fournisseurs/', AdminFournisseurListView.as_view(), name='admin_fournisseurs'),
    path('admin/fournisseurs/<int:user_id>/', AdminFournisseurDetailView.as_view(), name='admin_fournisseur_detail'),
    path('admin/fournisseurs/<int:user_id>/validation/', AdminFournisseurValidationView.as_view(), name='admin_fournisseur_validation'),
    path('admin/fournisseurs/<int:user_id>/delete/', AdminFournisseurDeleteView.as_view(), name='admin_fournisseur_delete'),
    # Commandes des fournisseurs (NOUVEAU)
    path('admin/fournisseurs/<int:fournisseur_id>/commandes/', AdminFournisseurCommandesView.as_view(), name='admin_fournisseur_commandes'),
    # Produits des fournisseurs (NOUVEAU)
    path('admin/fournisseurs/<int:fournisseur_id>/produits/', AdminFournisseurProduitsView.as_view(), name='admin_fournisseur_produits'),
    # Statistiques détaillées du fournisseur (NOUVEAU)
    path('admin/fournisseurs/<int:fournisseur_id>/stats/', AdminFournisseurStatsView.as_view(), name='admin_fournisseur_stats'),
    # Validation des produits
    path('admin/produits/attente/', AdminProduitsEnAttenteView.as_view(), name='admin_produits_attente'),
    path('admin/produits/<int:pk>/validation/', AdminValidationProduitView.as_view(), name='admin_produit_validation'),
    # Journal d'activité
    path('admin/journal/', AdminJournalListView.as_view(), name='admin_journal'),
    path('admin/journal/clear/', AdminJournalClearView.as_view(), name='admin_journal_clear'),
    # Dashboard stats
    path('admin/dashboard-stats/', AdminDashboardStatsView.as_view(), name='admin_dashboard_stats'),
]