from django.urls import path
from .views import (
    CategorieListCreateView,
    CategorieDetailView,
    ProduitListCreateView,
    ProduitDetailView,
    ProduitFavorisListCreateView,
    ProduitRestaurerView,
    ProduitVerifierUtilisationView,
    SousCategorieListCreateView,
    SousCategorieDetailView
)

urlpatterns = [
    path('categories/', CategorieListCreateView.as_view(), name='categorie_list_create'),
    path('categories/<int:pk>/', CategorieDetailView.as_view(), name='categorie_detail'),
    path('sous-categories/', SousCategorieListCreateView.as_view(), name='sous_categorie_list_create'),
    path('sous-categories/<int:pk>/', SousCategorieDetailView.as_view(), name='sous_categorie_detail'),
    path('produits/', ProduitListCreateView.as_view(), name='produit_list_create'),
    path('produits/<int:pk>/', ProduitDetailView.as_view(), name='produit_detail'),
    path('produits/<int:pk>/restaurer/', ProduitRestaurerView.as_view(), name='produit_restaurer'),
    path('produits/<int:pk>/verifier-utilisation/', ProduitVerifierUtilisationView.as_view(), name='produit_verifier_utilisation'),
    path('produits/favoris/', ProduitFavorisListCreateView.as_view(), name='produit_favoris_create'),
]