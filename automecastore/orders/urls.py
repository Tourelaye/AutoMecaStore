from django.urls import path
from .views import (
    PanierView,
    AjouterAuPanierView,
    CommandeListView,
    CommandeDetailView,
    CommandeCreateView,
    LigneCommandeCreateView,
    CreerCommandeDepuisPanierView,
    DashboardStatsView,
    WeeklySalesView,
    RecentOrdersView,
    KPIView
)

urlpatterns = [
    path('panier/', PanierView.as_view(), name='panier'),
    path('panier/ajouter/', AjouterAuPanierView.as_view(), name='ajouter_au_panier'),
    path('commandes/', CommandeListView.as_view(), name='commande_list'),
    path('commandes/<int:pk>/', CommandeDetailView.as_view(), name='commande_detail'),
    path('commandes/create/', CommandeCreateView.as_view(), name='commande_create'),
    path('ligne-commande/', LigneCommandeCreateView.as_view(), name='ligne_commande_create'),
    path('commande/panier/', CreerCommandeDepuisPanierView.as_view(), name='commande_depuis_panier'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('dashboard/weekly-sales/', WeeklySalesView.as_view(), name='weekly_sales'),
    path('dashboard/recent-orders/', RecentOrdersView.as_view(), name='recent_orders'),
    path('dashboard/kpi/', KPIView.as_view(), name='kpi'),
]