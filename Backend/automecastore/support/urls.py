from django.urls import path
from .views import (
    TicketCreateView,
    MessageCreateView,
    ReclamationCreateView,
    AvisCreateView,
    AdminAvisListView,
    AdminAvisDetailView,
    AdminAvisToggleApproveView,
    AdminReclamationListView,
    AdminReclamationDetailView,
    AdminReclamationUpdateStatutView
)

urlpatterns = [
    # Client - Création
    path('ticket/create/', TicketCreateView.as_view(), name='ticket_create'),
    path('message/create/', MessageCreateView.as_view(), name='message_create'),
    path('reclamation/create/', ReclamationCreateView.as_view(), name='reclamation_create'),
    path('avis/create/', AvisCreateView.as_view(), name='avis_create'),
    
    # Admin - Gestion avis
    path('admin/avis/', AdminAvisListView.as_view(), name='admin_avis_list'),
    path('admin/avis/<int:pk>/', AdminAvisDetailView.as_view(), name='admin_avis_detail'),
    path('admin/avis/<int:pk>/toggle-approve/', AdminAvisToggleApproveView.as_view(), name='admin_avis_toggle_approve'),
    
    # Admin - Gestion réclamations
    path('admin/reclamations/', AdminReclamationListView.as_view(), name='admin_reclamation_list'),
    path('admin/reclamations/<int:pk>/', AdminReclamationDetailView.as_view(), name='admin_reclamation_detail'),
    path('admin/reclamations/<int:pk>/statut/', AdminReclamationUpdateStatutView.as_view(), name='admin_reclamation_update_statut'),
]
