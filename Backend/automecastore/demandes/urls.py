from django.urls import path
from .views import (
    DemandePieceCreateView,
    ClientDemandeListView,
    ClientDemandeDetailView,
    ClientOffreListView,
    ClientAccepterOffreView,
    FournisseurDemandeListView,
    FournisseurDemandeDetailView,
    FournisseurOffreCreateView,
    FournisseurOffreListView,
    AdminDemandeListView,
    AdminDemandeDetailView,
    AdminDemandeActionView,
)

urlpatterns = [
    # Public / client
    path('demandes/', DemandePieceCreateView.as_view(), name='demande_create'),
    path('client/demandes/', ClientDemandeListView.as_view(), name='client_demande_list'),
    path('client/demandes/<int:pk>/', ClientDemandeDetailView.as_view(), name='client_demande_detail'),
    path('client/demandes/<int:demande_id>/offres/', ClientOffreListView.as_view(), name='client_offre_list'),
    path('client/demandes/<int:pk>/accepter/', ClientAccepterOffreView.as_view(), name='client_demande_accepter'),

    # Fournisseur
    path('fournisseur/demandes/', FournisseurDemandeListView.as_view(), name='fournisseur_demande_list'),
    path('fournisseur/demandes/<int:pk>/', FournisseurDemandeDetailView.as_view(), name='fournisseur_demande_detail'),
    path('fournisseur/demandes/<int:pk>/offrir/', FournisseurOffreCreateView.as_view(), name='fournisseur_offre_create'),
    path('fournisseur/offres/', FournisseurOffreListView.as_view(), name='fournisseur_offre_list'),

    # Admin
    path('admin/demandes/', AdminDemandeListView.as_view(), name='admin_demande_list'),
    path('admin/demandes/<int:pk>/', AdminDemandeDetailView.as_view(), name='admin_demande_detail'),
    path('admin/demandes/<int:pk>/action/', AdminDemandeActionView.as_view(), name='admin_demande_action'),
]
