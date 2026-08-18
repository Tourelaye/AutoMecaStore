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
    FournisseurCommandeDetailView,
    FournisseurCommandeCommentaireView,
    FournisseurCommandeUpdateStatutView,
    FournisseurStockListView,
    FournisseurStockUpdateView,
    FournisseurStockMouvementView,
    FournisseurMouvementStockListView,
    FournisseurVenteListView,
    FournisseurPromotionListCreateView,
    FournisseurPromotionDetailView,
    FournisseurPromotionStatsView,
    FournisseurPromotionDuplicateView,
    FournisseurPromotionToggleView,
    FournisseurAvisListView,
    FournisseurAvisRepondreView,
    FournisseurAvisSignalerView,
    FournisseurAvisStatsView,
    FournisseurStatsView,
    FournisseurMagasinView
)

urlpatterns = [
    # Profil
    path('profil/', FournisseurProfileView.as_view(), name='fournisseur_profil'),

    # Mon magasin
    path('magasin/', FournisseurMagasinView.as_view(), name='fournisseur_magasin'),

    # Statistiques
    path('stats/', FournisseurStatsView.as_view(), name='fournisseur_stats'),

    # Produits
    path('produits/', FournisseurProduitListCreateView.as_view(), name='fournisseur_produits'),
    path('produits/<int:pk>/', FournisseurProduitDetailView.as_view(), name='fournisseur_produit_detail'),

    # Commandes
    path('commandes/', FournisseurCommandeListView.as_view(), name='fournisseur_commandes'),
    path('commandes/<int:pk>/', FournisseurCommandeDetailView.as_view(), name='fournisseur_commande_detail'),
    path('commandes/<int:pk>/statut/', FournisseurCommandeUpdateStatutView.as_view(), name='fournisseur_commande_statut'),
    path('commandes/<int:pk>/commentaire/', FournisseurCommandeCommentaireView.as_view(), name='fournisseur_commande_commentaire'),

    # Stock
    path('stock/', FournisseurStockListView.as_view(), name='fournisseur_stock'),
    path('stock/<int:pk>/', FournisseurStockUpdateView.as_view(), name='fournisseur_stock_update'),
    path('stock/<int:pk>/mouvement/', FournisseurStockMouvementView.as_view(), name='fournisseur_stock_mouvement'),
    path('stock/mouvements/', FournisseurMouvementStockListView.as_view(), name='fournisseur_stock_mouvements'),

    # Ventes
    path('ventes/', FournisseurVenteListView.as_view(), name='fournisseur_ventes'),

    # Promotions
    path('promotions/', FournisseurPromotionListCreateView.as_view(), name='fournisseur_promotions'),
    path('promotions/stats/', FournisseurPromotionStatsView.as_view(), name='fournisseur_promotions_stats'),
    path('promotions/<int:pk>/', FournisseurPromotionDetailView.as_view(), name='fournisseur_promotion_detail'),
    path('promotions/<int:pk>/duplicate/', FournisseurPromotionDuplicateView.as_view(), name='fournisseur_promotion_duplicate'),
    path('promotions/<int:pk>/toggle/', FournisseurPromotionToggleView.as_view(), name='fournisseur_promotion_toggle'),

    # Avis
    path('avis/', FournisseurAvisListView.as_view(), name='fournisseur_avis'),
    path('avis/stats/', FournisseurAvisStatsView.as_view(), name='fournisseur_avis_stats'),
    path('avis/<int:pk>/repondre/', FournisseurAvisRepondreView.as_view(), name='fournisseur_avis_repondre'),
    path('avis/<int:pk>/signaler/', FournisseurAvisSignalerView.as_view(), name='fournisseur_avis_signaler'),

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
