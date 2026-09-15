from django.urls import path
from .views import (
    AdminUtilisateurListView,
    AdminUtilisateurDetailView,
    AdminUtilisateurStatsView,
    AdminUtilisateurActionView,
    AdminUtilisateurActiviteView,
    AdminUtilisateurNotificationView,
    AdminProfileView,
    FinanceConfigView,
    PaymentGatewayListView,
    PaymentGatewayToggleView,
    RolePermissionListView,
    ApiConfigView,
    AdminPaiementListView,
    AdminPaiementDetailView,
    AdminPaiementActionView,
    AdminLivraisonListView,
    AdminLivraisonStatutView,
    AdminAvisListView,
    AdminAvisDetailView,
    AdminAvisStatsView,
    AdminAvisActionView,
    AdminReclamationListView,
    AdminReclamationDetailView,
    AdminReclamationStatsView,
    AdminReclamationActionView,
    AdminReclamationMessageView,
    AdminReclamationAttachmentView,
    AdminReclamationHistoriqueView,
    AdminPartenariatListView,
    AdminPartenariatDetailView,
    AdminPartenariatStatsView,
    AdminPartenariatActionView,
    AdminMessageListView,
    AdminMessageDetailView,
    AdminMessageStatsView,
    AdminMessageActionView,
    AdminProduitEnAttenteListView,
    AdminProduitApprobationView,
    AdminCommandeExportView,
    AdminFournisseurMagasinView,
    AdminAnalyticsView,
    AdminAnalyticsFiltersView,
    AdminAnalyticsExportView,
    AdminCommandeListView,
    AdminCommandeDetailView,
    AdminCommandeStatsView,
    AdminCommandeAlertsView,
    AdminCommandeActionView,
    AdminProduitListView,
    AdminProduitDetailView,
    AdminProduitDeleteView,
)

# NOTE: fournisseurs/, dashboard-stats/, journal/, produits/<id>/validation/
# are already served by account.urls (included under /api/).
# Only add endpoints that are NOT in account.urls.

urlpatterns = [
    # Profil admin
    path('profil/', AdminProfileView.as_view(), name='admin-profil'),

    # Parametres
    path('parametres/finance/', FinanceConfigView.as_view(), name='admin-finance-config'),
    path('parametres/gateways/', PaymentGatewayListView.as_view(), name='admin-payment-gateways'),
    path('parametres/gateways/<int:pk>/toggle/', PaymentGatewayToggleView.as_view(), name='admin-payment-gateway-toggle'),
    path('parametres/roles/', RolePermissionListView.as_view(), name='admin-roles'),
    path('parametres/api/', ApiConfigView.as_view(), name='admin-api-config'),

    # Utilisateurs
    path('utilisateurs/', AdminUtilisateurListView.as_view(), name='admin-utilisateurs'),
    path('utilisateurs/stats/', AdminUtilisateurStatsView.as_view(), name='admin-utilisateurs-stats'),
    path('utilisateurs/notifications/', AdminUtilisateurNotificationView.as_view(), name='admin-utilisateurs-notifications'),
    path('utilisateurs/<int:pk>/', AdminUtilisateurDetailView.as_view(), name='admin-utilisateur-detail'),
    path('utilisateurs/<int:pk>/action/', AdminUtilisateurActionView.as_view(), name='admin-utilisateur-action'),
    path('utilisateurs/<int:pk>/activite/', AdminUtilisateurActiviteView.as_view(), name='admin-utilisateur-activite'),

    # Paiements
    path('paiements/', AdminPaiementListView.as_view(), name='admin-paiements'),
    path('paiements/<int:pk>/', AdminPaiementDetailView.as_view(), name='admin-paiement-detail'),
    path('paiements/<int:pk>/action/', AdminPaiementActionView.as_view(), name='admin-paiement-action'),

    # Livraisons
    path('livraisons/', AdminLivraisonListView.as_view(), name='admin-livraisons'),
    path('livraisons/<int:pk>/statut/', AdminLivraisonStatutView.as_view(), name='admin-livraison-statut'),

    # Avis
    path('avis/v2/', AdminAvisListView.as_view(), name='admin-avis-list-v2'),
    path('avis/stats/', AdminAvisStatsView.as_view(), name='admin-avis-stats'),
    path('avis/<int:pk>/detail/', AdminAvisDetailView.as_view(), name='admin-avis-detail-v2'),
    path('avis/<int:pk>/action/', AdminAvisActionView.as_view(), name='admin-avis-action-v2'),

    # Reclamations
    path('reclamations/', AdminReclamationListView.as_view(), name='admin-reclamations'),
    path('reclamations/stats/', AdminReclamationStatsView.as_view(), name='admin-reclamations-stats'),
    path('reclamations/<int:pk>/', AdminReclamationDetailView.as_view(), name='admin-reclamation-detail'),
    path('reclamations/<int:pk>/action/', AdminReclamationActionView.as_view(), name='admin-reclamation-action'),
    path('reclamations/<int:pk>/messages/', AdminReclamationMessageView.as_view(), name='admin-reclamation-messages'),
    path('reclamations/<int:pk>/attachments/', AdminReclamationAttachmentView.as_view(), name='admin-reclamation-attachments'),
    path('reclamations/<int:pk>/historique/', AdminReclamationHistoriqueView.as_view(), name='admin-reclamation-historique'),

    # Partenariats
    path('partenariats/', AdminPartenariatListView.as_view(), name='admin-partenariats'),
    path('partenariats/stats/', AdminPartenariatStatsView.as_view(), name='admin-partenariats-stats'),
    path('partenariats/<int:pk>/', AdminPartenariatDetailView.as_view(), name='admin-partenariat-detail'),
    path('partenariats/<int:pk>/action/', AdminPartenariatActionView.as_view(), name='admin-partenariat-action'),

    # Messages support
    path('messages/', AdminMessageListView.as_view(), name='admin-messages'),
    path('messages/stats/', AdminMessageStatsView.as_view(), name='admin-messages-stats'),
    path('messages/<int:pk>/', AdminMessageDetailView.as_view(), name='admin-message-detail'),
    path('messages/<int:pk>/action/', AdminMessageActionView.as_view(), name='admin-message-action'),

    # Produits admin (supplementaires - not in account.urls)
    path('produits/', AdminProduitListView.as_view(), name='admin-produit-list'),
    path('produits/en-attente/', AdminProduitEnAttenteListView.as_view(), name='admin-produits-en-attente'),
    path('produits/<int:pk>/', AdminProduitDetailView.as_view(), name='admin-produit-detail'),
    path('produits/<int:pk>/approbation/', AdminProduitApprobationView.as_view(), name='admin-produit-approbation'),

    # Commandes admin
    path('commandes/', AdminCommandeListView.as_view(), name='admin-commandes'),
    path('commandes/stats/', AdminCommandeStatsView.as_view(), name='admin-commandes-stats'),
    path('commandes/alerts/', AdminCommandeAlertsView.as_view(), name='admin-commandes-alerts'),
    path('commandes/<int:pk>/', AdminCommandeDetailView.as_view(), name='admin-commande-detail'),
    path('commandes/<int:pk>/action/', AdminCommandeActionView.as_view(), name='admin-commande-action'),
    path('commandes/export/', AdminCommandeExportView.as_view(), name='admin-commandes-export'),

    # Fournisseur magasin (not in account.urls)
    path('fournisseurs/<int:user_id>/magasin/', AdminFournisseurMagasinView.as_view(), name='admin-fournisseur-magasin'),

    # Analytics
    path('analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    path('analytics/filters/', AdminAnalyticsFiltersView.as_view(), name='admin-analytics-filters'),
    path('analytics/export/', AdminAnalyticsExportView.as_view(), name='admin-analytics-export'),
]
