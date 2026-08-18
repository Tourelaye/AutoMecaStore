from django.urls import path
from .views import (
    ClientAdresseListCreateView,
    ClientAdresseDetailView,
    ClientLivraisonListView,
    FournisseurLivraisonListView,
    FournisseurLivraisonDetailView,
    FournisseurLivraisonPrendreEnChargeView,
    FournisseurLivraisonUpdateStatutView,
    AdminLivraisonListView,
    AdminLivraisonDetailView,
    AdminLivraisonUpdateStatutView,
    PartenaireLivraisonListCreateView,
    PartenaireLivraisonDetailView
)

urlpatterns = [
    # Client
    path('adresses/', ClientAdresseListCreateView.as_view(), name='client_adresses'),
    path('adresses/<int:pk>/', ClientAdresseDetailView.as_view(), name='client_adresse_detail'),
    path('livraisons/', ClientLivraisonListView.as_view(), name='client_livraisons'),

    # Fournisseur
    path('fournisseur/livraisons/', FournisseurLivraisonListView.as_view(), name='fournisseur_livraison_list'),
    path('fournisseur/livraisons/<int:pk>/', FournisseurLivraisonDetailView.as_view(), name='fournisseur_livraison_detail'),
    path('fournisseur/livraisons/<int:pk>/prendre-en-charge/', FournisseurLivraisonPrendreEnChargeView.as_view(), name='fournisseur_livraison_prendre'),
    path('fournisseur/livraisons/<int:pk>/statut/', FournisseurLivraisonUpdateStatutView.as_view(), name='fournisseur_livraison_statut'),

    # Admin
    path('admin/livraisons/', AdminLivraisonListView.as_view(), name='admin_livraison_list'),
    path('admin/livraisons/<int:pk>/', AdminLivraisonDetailView.as_view(), name='admin_livraison_detail'),
    path('admin/livraisons/<int:pk>/statut/', AdminLivraisonUpdateStatutView.as_view(), name='admin_livraison_update_statut'),

    # Partenaires (admin)
    path('admin/partenaires/', PartenaireLivraisonListCreateView.as_view(), name='admin_partenaire_list'),
    path('admin/partenaires/<int:pk>/', PartenaireLivraisonDetailView.as_view(), name='admin_partenaire_detail'),
]