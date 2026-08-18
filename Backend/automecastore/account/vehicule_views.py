from rest_framework import generics, status
from rest_framework.response import Response
from .models import Client, VehiculeClient
from .serializers import VehiculeClientSerializer
from .permissions import IsClient


class VehiculeClientListCreateView(generics.ListCreateAPIView):
    """Liste et création des véhicules du client connecté"""
    serializer_class = VehiculeClientSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return VehiculeClient.objects.filter(client=self.request.user.client)

    def perform_create(self, serializer):
        client, _ = Client.objects.get_or_create(
            user=self.request.user,
            defaults={'point_fidelite': 0}
        )
        serializer.save(client=client)


class VehiculeClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Récupération, modification et suppression d'un véhicule client"""
    serializer_class = VehiculeClientSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return VehiculeClient.objects.filter(client=self.request.user.client)
