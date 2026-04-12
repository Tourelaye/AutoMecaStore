from django.urls import path
from .views import RegisterView, MyTokenObtainPairView, UtilisateurDetailView, CategorieListCreateView, CategorieDetailView, ProduitListCreateView, ProduitDetailView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'), 
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UtilisateurDetailView.as_view(), name='utilisateur_detail'),
    path('categories/', CategorieListCreateView.as_view(), name='categorie_list_create'),
    path('categories/<int:pk>/', CategorieDetailView.as_view(), name='categorie_detail'),
    path('produits/', ProduitListCreateView.as_view(), name='produit_list_create'),
    path('produits/<int:pk>/', ProduitDetailView.as_view(), name='produit_detail'),
]