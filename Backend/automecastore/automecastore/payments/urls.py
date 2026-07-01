from django.urls import path
from .views import CreerPaiementView

urlpatterns = [
    path('paiement/create/', CreerPaiementView.as_view(), name='paiement_create'),
]