from django.urls import path
from .views import (
    TicketCreateView,
    MessageCreateView,
    ReclamationCreateView,
    AvisCreateView,
    AvisProductListView,
    AvisMagasinListView,
    ClientAvisListView,
    SignalementAvisCreateView,
    AdminAvisListView,
    AdminAvisDetailView,
    AdminAvisToggleApproveView,
    AdminAvisActionView,
    AdminSignalementAvisListView,
    AdminSignalementAvisUpdateStatutView,
)
from .admin_views import (
    AdminReclamationListView,
    AdminReclamationDetailView,
    AdminReclamationStatsView,
    AdminReclamationActionView,
    AdminReclamationMessageView,
    AdminReclamationAttachmentView,
    AdminReclamationHistoriqueView,
)

urlpatterns = [
    # Client - Création
    path('ticket/create/', TicketCreateView.as_view(), name='ticket_create'),
    path('message/create/', MessageCreateView.as_view(), name='message_create'),
    path('reclamation/create/', ReclamationCreateView.as_view(), name='reclamation_create'),
    path('avis/create/', AvisCreateView.as_view(), name='avis_create'),
    path('avis/moi/', ClientAvisListView.as_view(), name='client_avis_list'),

    # Public
    path('avis/produit/<int:produit_id>/', AvisProductListView.as_view(), name='avis_produit_list'),
    path('avis/magasin/<int:magasin_id>/', AvisMagasinListView.as_view(), name='avis_magasin_list'),

    # Signalement
    path('avis/<int:avis_id>/signaler/', SignalementAvisCreateView.as_view(), name='avis_signaler'),

    # Admin - Gestion avis
    path('admin/avis/', AdminAvisListView.as_view(), name='admin_avis_list'),
    path('admin/avis/<int:pk>/', AdminAvisDetailView.as_view(), name='admin_avis_detail'),
    path('admin/avis/<int:pk>/toggle-approve/', AdminAvisToggleApproveView.as_view(), name='admin_avis_toggle_approve'),
    path('admin/avis/<int:pk>/action/', AdminAvisActionView.as_view(), name='admin_avis_action'),

    # Admin - Signalements
    path('admin/signalements-avis/', AdminSignalementAvisListView.as_view(), name='admin_signalements_avis_list'),
    path('admin/signalements-avis/<int:pk>/', AdminSignalementAvisUpdateStatutView.as_view(), name='admin_signalements_avis_update'),

    # Admin - Gestion réclamations
    path('admin/reclamations/', AdminReclamationListView.as_view(), name='admin_reclamation_list'),
    path('admin/reclamations/stats/', AdminReclamationStatsView.as_view(), name='admin_reclamation_stats'),
    path('admin/reclamations/<int:pk>/', AdminReclamationDetailView.as_view(), name='admin_reclamation_detail'),
    path('admin/reclamations/<int:pk>/action/', AdminReclamationActionView.as_view(), name='admin_reclamation_action'),
    path('admin/reclamations/<int:pk>/messages/', AdminReclamationMessageView.as_view(), name='admin_reclamation_messages'),
    path('admin/reclamations/<int:pk>/attachments/', AdminReclamationAttachmentView.as_view(), name='admin_reclamation_attachments'),
    path('admin/reclamations/<int:pk>/historique/', AdminReclamationHistoriqueView.as_view(), name='admin_reclamation_historique'),
]
