from django.urls import path
from .analytics import AdminAnalyticsView, AdminAnalyticsFiltersView
from .analytics_export import AdminAnalyticsExportView
from .views import (
    AdminDashboardStatsView,
    LogEntryListView,
    LogEntryDetailView,
    AdminProfileView,
    FinanceConfigView,
    PaymentGatewayListView,
    PaymentGatewayDetailView,
    PaymentGatewayToggleView,
    RolePermissionListView,
    ApiConfigView,
    AdminProduitListView,
    AdminProduitToggleActiveView,
    AdminProduitSignalView,
    AdminProduitSectionsView,
    AdminProduitDeleteView,
    AdminProduitEnAttenteListView,
    AdminProduitApprobationView,
    AdminCategorieReorderView,
    AdminMarqueReorderView,
    AdminCommandeListView,
    AdminCommandeDetailView,
    AdminCommandeStatsView,
    AdminCommandeAlertsView,
    AdminCommandeActionView,
    AdminCommandeExportView,
    AdminProduitValidationView,
    AdminFournisseurListView,
    AdminFournisseurDetailView,
    AdminFournisseurMagasinView,
    AdminFournisseurValidationView,
    AdminFournisseurDeleteView,
    AdminFournisseurCommandesView,
    AdminFournisseurProduitsView,
    AdminFournisseurStatsView,
    AdminUtilisateurListView,
    AdminUtilisateurDetailView,
    AdminUtilisateurStatsView,
    AdminUtilisateurActionView,
    AdminUtilisateurActiviteView,
    AdminUtilisateurNotificationView,
)

urlpatterns = [
    # Dashboard stats
    path('dashboard-stats/', AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),
    
    # Journal d'activités
    path('journal/', LogEntryListView.as_view(), name='admin-journal'),
    path('journal/<int:pk>/', LogEntryDetailView.as_view(), name='admin-journal-detail'),
    
    # Profil admin
    path('profil/', AdminProfileView.as_view(), name='admin-profil'),
    
    # Configuration financière
    path('parametres/finance/', FinanceConfigView.as_view(), name='admin-finance-config'),
    
    # Passerelles de paiement
    path('parametres/gateways/', PaymentGatewayListView.as_view(), name='admin-payment-gateways'),
    path('parametres/gateways/<int:pk>/', PaymentGatewayDetailView.as_view(), name='admin-payment-gateway-detail'),
    path('parametres/gateways/<int:pk>/toggle/', PaymentGatewayToggleView.as_view(), name='admin-payment-gateway-toggle'),
    
    # Rôles et permissions
    path('parametres/roles/', RolePermissionListView.as_view(), name='admin-roles'),
    
    # Configuration API
    path('parametres/api/', ApiConfigView.as_view(), name='admin-api-config'),

    # Produits admin
    path('produits/', AdminProduitListView.as_view(), name='admin-produits'),
    path('produits/en-attente/', AdminProduitEnAttenteListView.as_view(), name='admin-produits-en-attente'),
    path('produits/<int:pk>/toggle-active/', AdminProduitToggleActiveView.as_view(), name='admin-produit-toggle-active'),
    path('produits/<int:pk>/signal/', AdminProduitSignalView.as_view(), name='admin-produit-signal'),
    path('produits/<int:pk>/sections/', AdminProduitSectionsView.as_view(), name='admin-produit-sections'),
    path('produits/<int:pk>/approbation/', AdminProduitApprobationView.as_view(), name='admin-produit-approbation'),
    path('produits/<int:pk>/validation/', AdminProduitValidationView.as_view(), name='admin-produit-validation'),
    path('produits/<int:pk>/', AdminProduitDeleteView.as_view(), name='admin-produit-delete'),

    # Catégories et marques admin
    path('categories/reorder/', AdminCategorieReorderView.as_view(), name='admin-categories-reorder'),
    path('marques/reorder/', AdminMarqueReorderView.as_view(), name='admin-marques-reorder'),

    # Commandes admin
    path('commandes/', AdminCommandeListView.as_view(), name='admin-commandes'),
    path('commandes/export/', AdminCommandeExportView.as_view(), name='admin-commandes-export'),
    path('commandes/stats/', AdminCommandeStatsView.as_view(), name='admin-commandes-stats'),
    path('commandes/alerts/', AdminCommandeAlertsView.as_view(), name='admin-commandes-alerts'),
    path('commandes/<int:pk>/', AdminCommandeDetailView.as_view(), name='admin-commande-detail'),
    path('commandes/<int:pk>/action/', AdminCommandeActionView.as_view(), name='admin-commande-action'),

    # Fournisseurs admin
    path('fournisseurs/', AdminFournisseurListView.as_view(), name='admin-fournisseurs'),
    path('fournisseurs/<int:user_id>/', AdminFournisseurDetailView.as_view(), name='admin-fournisseur-detail'),
    path('fournisseurs/<int:user_id>/magasin/', AdminFournisseurMagasinView.as_view(), name='admin-fournisseur-magasin'),
    path('fournisseurs/<int:user_id>/validation/', AdminFournisseurValidationView.as_view(), name='admin-fournisseur-validation'),
    path('fournisseurs/<int:user_id>/delete/', AdminFournisseurDeleteView.as_view(), name='admin-fournisseur-delete'),
    path('fournisseurs/<int:user_id>/commandes/', AdminFournisseurCommandesView.as_view(), name='admin-fournisseur-commandes'),
    path('fournisseurs/<int:user_id>/produits/', AdminFournisseurProduitsView.as_view(), name='admin-fournisseur-produits'),
    path('fournisseurs/<int:user_id>/stats/', AdminFournisseurStatsView.as_view(), name='admin-fournisseur-stats'),

    # Utilisateurs admin
    path('utilisateurs/', AdminUtilisateurListView.as_view(), name='admin-utilisateurs'),
    path('utilisateurs/stats/', AdminUtilisateurStatsView.as_view(), name='admin-utilisateurs-stats'),
    path('utilisateurs/notifications/', AdminUtilisateurNotificationView.as_view(), name='admin-utilisateurs-notifications'),
    path('utilisateurs/<int:pk>/', AdminUtilisateurDetailView.as_view(), name='admin-utilisateur-detail'),
    path('utilisateurs/<int:pk>/action/', AdminUtilisateurActionView.as_view(), name='admin-utilisateur-action'),
    path('utilisateurs/<int:pk>/activite/', AdminUtilisateurActiviteView.as_view(), name='admin-utilisateur-activite'),

    # Centre d'analyse
    path('analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    path('analytics/filters/', AdminAnalyticsFiltersView.as_view(), name='admin-analytics-filters'),
    path('analytics/export/', AdminAnalyticsExportView.as_view(), name='admin-analytics-export'),
]
