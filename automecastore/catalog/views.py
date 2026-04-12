from rest_framework import generics, permissions
from .models import Categorie, Produit, ProduitFavoris
from .serializers import CategorieSerializer, ProduitSerializer, ProduitFavorisSerializer
from account.permissions import IsAdmin

# -----------------------------
# Categorie
# -----------------------------
class CategorieListCreateView(generics.ListCreateAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.AllowAny()]

class CategorieDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdmin()]
        return [permissions.AllowAny()]

# -----------------------------
# Produit
# -----------------------------
class ProduitListCreateView(generics.ListCreateAPIView):
    queryset = Produit.objects.all()
    serializer_class = ProduitSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.AllowAny()]

class ProduitDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Produit.objects.all()
    serializer_class = ProduitSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdmin()]
        return [permissions.AllowAny()]

# -----------------------------
# ProduitFavoris
# -----------------------------
class ProduitFavorisListCreateView(generics.ListCreateAPIView):
    queryset = ProduitFavoris.objects.all()
    serializer_class = ProduitFavorisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)