from django.urls import path
from .views import (
    TicketCreateView,
    MessageCreateView,
    ReclamationCreateView,
    AvisCreateView,
)
from admin_api.views import DemandePartenariatCreateView

urlpatterns = [
    # Client - Création
    path('ticket/create/', TicketCreateView.as_view(), name='ticket_create'),
    path('message/create/', MessageCreateView.as_view(), name='message_create'),
    path('reclamation/create/', ReclamationCreateView.as_view(), name='reclamation_create'),
    path('avis/create/', AvisCreateView.as_view(), name='avis_create'),

    # Public - Demande de partenariat
    path('partenariat/create/', DemandePartenariatCreateView.as_view(), name='partenariat_create'),
]
