from django.urls import path
from .views import (
    CategorieListCreateView,
    CategorieDetailView,
    ProduitListCreateView,
    ProduitDetailView,
    ProduitFavorisListCreateView
)

urlpatterns = [
    path('categories/', CategorieListCreateView.as_view(), name='categorie_list_create'),
    path('categories/<int:pk>/', CategorieDetailView.as_view(), name='categorie_detail'),
    path('produits/', ProduitListCreateView.as_view(), name='produit_list_create'),
    path('produits/<int:pk>/', ProduitDetailView.as_view(), name='produit_detail'),
    path('produits/favoris/', ProduitFavorisListCreateView.as_view(), name='produit_favoris_create'),
]