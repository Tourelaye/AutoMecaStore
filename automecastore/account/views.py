from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer, UtilisateurSerializer, CategorieSerializer, ProduitSerializer, MyTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import generics, permissions
from .models import Utilisateur 
from catalog.models import Categorie, Produit
from account.permissions import IsAdmin
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

# Create your views here.
class RegisterView(APIView):
    def post(self, request):
        print(f"DEBUG: Inscription - Données reçues: {request.data}")
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            print(f"DEBUG: Inscription - Serializer validé")
            user = serializer.save()
            print(f"DEBUG: Inscription - Utilisateur créé: {user.email}, ID: {user.id}")
            print(f"DEBUG: Inscription - Utilisateur actif: {user.is_active}")
            return Response(
                {"message": "Inscription réussie"},
                status=status.HTTP_201_CREATED
            )
        else:
            print(f"DEBUG: Inscription - Erreurs validation: {serializer.errors}")
        return Response(serializer.errors, status=400)
    
# Liste & Création
class CategorieListCreateView(generics.ListCreateAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer

    def get_permissions(self):
        if self.request.method in ['POST']:
            return [IsAdmin()]
        return [permissions.AllowAny()]

# Détail, Update, Delete
class CategorieDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdmin()]
        return [permissions.AllowAny()]
    
class ProduitListCreateView(generics.ListCreateAPIView):
    queryset = Produit.objects.all()
    serializer_class = ProduitSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]  # Seul Admin peut créer
        return [permissions.AllowAny()]  # Tous peuvent lire

# Détail, Update, Delete
class ProduitDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Produit.objects.all()
    serializer_class = ProduitSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdmin()]  # Seul Admin peut modifier/supprimer
        return [permissions.AllowAny()]  # Tous peuvent lire

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class UtilisateurDetailView(generics.RetrieveAPIView):
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer