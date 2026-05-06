from django.urls import path
from .views import (
    PanierView,
    AjouterAuPanierView,
    CommandeListView,
    CommandeCreateView,
    LigneCommandeCreateView,
    CreerCommandeDepuisPanierView
)

urlpatterns = [
    path('panier/', PanierView.as_view(), name='panier'),
    path('panier/ajouter/', AjouterAuPanierView.as_view(), name='ajouter_au_panier'),
    path('commandes/', CommandeListView.as_view(), name='commande_list'),
    path('commandes/create/', CommandeCreateView.as_view(), name='commande_create'),
    path('ligne-commande/', LigneCommandeCreateView.as_view(), name='ligne_commande_create'),
    path('commande/panier/', CreerCommandeDepuisPanierView.as_view(), name='commande_depuis_panier'),
]