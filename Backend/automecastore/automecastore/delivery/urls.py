from django.urls import path
from .views import (
    AdresseCreateView,
    CreerLivraisonView,
    UpdateStatutLivraisonView,
    LivraisonListView,
    LivraisonDetailView,
    LivraisonStatusView,
    LivraisonIncidentView
)

urlpatterns = [
    path('adresse/create/', AdresseCreateView.as_view(), name='adresse_create'),
    path('livraison/create/', CreerLivraisonView.as_view(), name='livraison_create'),
    path('livraison/<int:pk>/statut/', UpdateStatutLivraisonView.as_view(), name='livraison_update_statut'),
    # Admin endpoints
    path('livraisons/', LivraisonListView.as_view(), name='admin_livraisons'),
    path('livraisons/<int:pk>/', LivraisonDetailView.as_view(), name='admin_livraison_detail'),
    path('livraisons/<int:pk>/statut/', LivraisonStatusView.as_view(), name='admin_livraison_statut'),
    path('livraisons/<int:pk>/incident/', LivraisonIncidentView.as_view(), name='admin_livraison_incident'),
]