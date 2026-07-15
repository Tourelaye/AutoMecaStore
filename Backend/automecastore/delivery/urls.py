from django.urls import path
from .views import (
    AdresseCreateView,
    CreerLivraisonView,
    UpdateStatutLivraisonView,
    AdminLivraisonListView,
    AdminLivraisonDetailView,
    AdminLivraisonUpdateStatutView
)

urlpatterns = [
    path('adresse/create/', AdresseCreateView.as_view(), name='adresse_create'),
    path('livraison/create/', CreerLivraisonView.as_view(), name='livraison_create'),
    path('livraison/<int:pk>/statut/', UpdateStatutLivraisonView.as_view(), name='livraison_update_statut'),
    # Admin - Gestion livraisons
    path('admin/livraisons/', AdminLivraisonListView.as_view(), name='admin_livraison_list'),
    path('admin/livraisons/<int:pk>/', AdminLivraisonDetailView.as_view(), name='admin_livraison_detail'),
    path('admin/livraisons/<int:pk>/statut/', AdminLivraisonUpdateStatutView.as_view(), name='admin_livraison_update_statut'),
]