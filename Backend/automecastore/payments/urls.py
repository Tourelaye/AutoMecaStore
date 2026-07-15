from django.urls import path
from .views import CreerPaiementView, AdminPaiementListView, AdminPaiementDetailView

urlpatterns = [
    path('paiement/create/', CreerPaiementView.as_view(), name='paiement_create'),
    # Admin - Gestion paiements
    path('admin/paiements/', AdminPaiementListView.as_view(), name='admin_paiement_list'),
    path('admin/paiements/<int:pk>/', AdminPaiementDetailView.as_view(), name='admin_paiement_detail'),
]