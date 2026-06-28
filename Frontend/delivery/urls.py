from django.urls import path
from .views import (
    AdresseCreateView,
    CreerLivraisonView,
    UpdateStatutLivraisonView
)

urlpatterns = [
    path('adresse/create/', AdresseCreateView.as_view(), name='adresse_create'),
    path('livraison/create/', CreerLivraisonView.as_view(), name='livraison_create'),
    path('livraison/<int:pk>/statut/', UpdateStatutLivraisonView.as_view(), name='livraison_update_statut'),
]