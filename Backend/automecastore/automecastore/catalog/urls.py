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

    SousCategorieDetailView,

    ProduitApprobationView,

    ProduitsEnAttenteListView,

    AdminProduitListView,
    AdminProduitDetailView,
    AdminProduitToggleActiveView,
    AdminProduitSignalView

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

    # Admin - Approbation produits
    path('produits/<int:pk>/approbation/', ProduitApprobationView.as_view(), name='produit_approbation'),

    path('produits/en-attente/', ProduitsEnAttenteListView.as_view(), name='produits_en_attente'),

    # Admin - Gestion produits
    path('admin/produits/', AdminProduitListView.as_view(), name='admin_produit_list'),
    path('admin/produits/<int:pk>/', AdminProduitDetailView.as_view(), name='admin_produit_detail'),
    path('admin/produits/<int:pk>/toggle-active/', AdminProduitToggleActiveView.as_view(), name='admin_produit_toggle_active'),
    path('admin/produits/<int:pk>/signal/', AdminProduitSignalView.as_view(), name='admin_produit_signal'),

]