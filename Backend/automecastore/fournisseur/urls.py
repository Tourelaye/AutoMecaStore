from django.urls import path
from .views import (
    TransactionListView,
    TransactionDetailView,
    HistoriqueActiviteListView,
    NotificationListView,
    NotificationDetailView,
    NotificationCountView,
    NotificationMarkAllReadView,
    FournisseurProfileView,
    FournisseurProduitListCreateView,
    FournisseurProduitDetailView,
    FournisseurCommandeListView,
    FournisseurCommandeUpdateStatutView,
    FournisseurStockListView,
    FournisseurStockUpdateView,
    FournisseurVenteListView,
    FournisseurPromotionListCreateView,
    FournisseurPromotionDetailView,
    FournisseurAvisListView,
    FournisseurStatsView
)

urlpatterns = [
    # Profil
    path('profil/', FournisseurProfileView.as_view(), name='fournisseur_profil'),

    # Statistiques
    path('stats/', FournisseurStatsView.as_view(), name='fournisseur_stats'),

    # Produits
    path('produits/', FournisseurProduitListCreateView.as_view(), name='fournisseur_produits'),
    path('produits/<int:pk>/', FournisseurProduitDetailView.as_view(), name='fournisseur_produit_detail'),

    # Commandes
    path('commandes/', FournisseurCommandeListView.as_view(), name='fournisseur_commandes'),
    path('commandes/<int:pk>/statut/', FournisseurCommandeUpdateStatutView.as_view(), name='fournisseur_commande_statut'),

    # Stock
    path('stock/', FournisseurStockListView.as_view(), name='fournisseur_stock'),
    path('stock/<int:pk>/', FournisseurStockUpdateView.as_view(), name='fournisseur_stock_update'),

    # Ventes
    path('ventes/', FournisseurVenteListView.as_view(), name='fournisseur_ventes'),

    # Promotions
    path('promotions/', FournisseurPromotionListCreateView.as_view(), name='fournisseur_promotions'),
    path('promotions/<int:pk>/', FournisseurPromotionDetailView.as_view(), name='fournisseur_promotion_detail'),

    # Avis
    path('avis/', FournisseurAvisListView.as_view(), name='fournisseur_avis'),

    # Transactions
    path('transactions/', TransactionListView.as_view(), name='fournisseur_transactions'),
    path('transactions/<int:pk>/', TransactionDetailView.as_view(), name='fournisseur_transaction_detail'),

    # Historique d'activité
    path('historique/', HistoriqueActiviteListView.as_view(), name='fournisseur_historique'),

    # Notifications
    path('notifications/', NotificationListView.as_view(), name='fournisseur_notifications'),
    path('notifications/count/', NotificationCountView.as_view(), name='fournisseur_notification_count'),
    path('notifications/mark-all-read/', NotificationMarkAllReadView.as_view(), name='fournisseur_notification_mark_all_read'),
    path('notifications/<int:pk>/', NotificationDetailView.as_view(), name='fournisseur_notification_detail'),
]
