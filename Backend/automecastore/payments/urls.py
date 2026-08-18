from django.urls import path
from .views import (
    PaiementInitView,
    PaiementDetailView,
    ClientPaiementListView,
    ClientPaiementAnnulerView,
    AdminPaiementListView,
    AdminPaiementDetailView,
    AdminPaiementActionView,
    PaiementWebhookView,
)

urlpatterns = [
    # Client
    path('paiement/initier/', PaiementInitView.as_view(), name='paiement_initier'),
    path('client/paiements/', ClientPaiementListView.as_view(), name='client_paiement_list'),
    path('client/paiements/<int:pk>/', PaiementDetailView.as_view(), name='client_paiement_detail'),
    path('client/paiements/<int:pk>/annuler/', ClientPaiementAnnulerView.as_view(), name='client_paiement_annuler'),

    # Admin
    path('admin/paiements/', AdminPaiementListView.as_view(), name='admin_paiement_list'),
    path('admin/paiements/<int:pk>/', AdminPaiementDetailView.as_view(), name='admin_paiement_detail'),
    path('admin/paiements/<int:pk>/action/', AdminPaiementActionView.as_view(), name='admin_paiement_action'),

    # Webhook réservé à un futur prestataire
    path('provider/webhook/', PaiementWebhookView.as_view(), name='paiement_webhook'),
]