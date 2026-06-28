from rest_framework import generics, permissions
from .models import Ticket, MessageSupport, Reclamation, Avis
from .serializers import TicketSerializer, MessageSupportSerializer, ReclamationSerializer, AvisSerializer


# -----------------------------
# Ticket
# -----------------------------
class TicketCreateView(generics.CreateAPIView):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)


# -----------------------------
# Message
# -----------------------------
class MessageCreateView(generics.CreateAPIView):
    serializer_class = MessageSupportSerializer
    permission_classes = [permissions.IsAuthenticated]


# -----------------------------
# Réclamation
# -----------------------------
class ReclamationCreateView(generics.CreateAPIView):
    serializer_class = ReclamationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)


# -----------------------------
# Avis
# -----------------------------
class AvisCreateView(generics.CreateAPIView):
    serializer_class = AvisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)