from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import Livraison, Adresse, PartenaireLivraison
from .serializers import (
    LivraisonSerializer, AdresseSerializer,
    PartenaireLivraisonSerializer
)
from orders.models import Commande, HistoriqueCommande, STATUT_COMMANDE
from account.permissions import IsAdmin, IsClient, IsClientOrAdmin, IsFournisseur
from fournisseur.models import creer_notification_client


# -----------------------------
# Adresses client
# -----------------------------
class ClientAdresseListCreateView(generics.ListCreateAPIView):
    serializer_class = AdresseSerializer
    permission_classes = [IsClientOrAdmin]

    def get_queryset(self):
        return Adresse.objects.filter(client=self.request.user.client)

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)


class ClientAdresseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdresseSerializer
    permission_classes = [IsClientOrAdmin]

    def get_queryset(self):
        return Adresse.objects.filter(client=self.request.user.client)


# -----------------------------
# Livraisons du client connecté
# -----------------------------
class ClientLivraisonListView(generics.ListAPIView):
    serializer_class = LivraisonSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return Livraison.objects.filter(client=self.request.user.client).select_related(
            'commande', 'magasin', 'adresse'
        )


# -----------------------------
# Fournisseur - Livraisons de ses magasins
# -----------------------------
class FournisseurLivraisonListView(generics.ListAPIView):
    serializer_class = LivraisonSerializer
    permission_classes = [IsFournisseur]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['statut', 'responsable_type']
    ordering_fields = ['date_creation']
    ordering = ['-date_creation']

    def get_queryset(self):
        return Livraison.objects.filter(
            Q(fournisseur=self.request.user.fournisseur) |
            Q(magasin__fournisseur=self.request.user.fournisseur)
        ).select_related('commande', 'client__user', 'magasin', 'adresse')


class FournisseurLivraisonDetailView(generics.RetrieveAPIView):
    serializer_class = LivraisonSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        return Livraison.objects.filter(
            Q(fournisseur=self.request.user.fournisseur) |
            Q(magasin__fournisseur=self.request.user.fournisseur)
        ).select_related('commande', 'client__user', 'magasin', 'adresse')


class FournisseurLivraisonPrendreEnChargeView(generics.UpdateAPIView):
    """Permet au fournisseur de se désigner responsable de la livraison."""
    serializer_class = LivraisonSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        return Livraison.objects.filter(
            Q(fournisseur=self.request.user.fournisseur) |
            Q(magasin__fournisseur=self.request.user.fournisseur)
        )

    def patch(self, request, *args, **kwargs):
        livraison = self.get_object()
        if livraison.responsable_type != 'non_attribue':
            return Response({"error": "Cette livraison est déjà attribuée"}, status=status.HTTP_400_BAD_REQUEST)

        livraison.responsable_type = 'magasin'
        livraison.fournisseur = request.user.fournisseur
        livraison.magasin = livraison.magasin or request.user.fournisseur.magasin
        livraison.date_attribution = timezone.now()
        livraison.statut = 'livraison_attribuee'
        livraison.save()

        HistoriqueCommande.objects.create(
            commande=livraison.commande,
            statut=livraison.commande.statut,
            commentaire=f"Livraison {livraison.id} attribuée au magasin",
            utilisateur=request.user,
            utilisateur_nom=f"{request.user.prenom or ''} {request.user.nom or ''}".strip()
        )

        if livraison.client:
            creer_notification_client(
                client_id=livraison.client.user.id,
                type_notif='commande',
                titre='Livraison attribuée',
                message=f"La livraison de votre commande {livraison.commande.reference} est prise en charge par le magasin.",
                lien=f'/mes-commandes/{livraison.commande.id}'
            )

        return Response(LivraisonSerializer(livraison).data)


class FournisseurLivraisonUpdateStatutView(generics.UpdateAPIView):
    """Met à jour le statut d'une livraison par le fournisseur."""
    serializer_class = LivraisonSerializer
    permission_classes = [IsFournisseur]

    def get_queryset(self):
        return Livraison.objects.filter(
            Q(fournisseur=self.request.user.fournisseur) |
            Q(magasin__fournisseur=self.request.user.fournisseur)
        )

    def patch(self, request, *args, **kwargs):
        livraison = self.get_object()
        nouveau = request.data.get('statut')
        if nouveau not in [c[0] for c in Livraison.STATUT_LIVRAISON]:
            return Response({"error": "Statut invalide"}, status=status.HTTP_400_BAD_REQUEST)

        commande = livraison.commande
        if commande and nouveau == 'livree':
            if not commande.lignes.exists():
                commande.statut = 'livree'
                commande.save()
            else:
                lignes = commande.lignes.filter(
                    Q(fournisseur=livraison.fournisseur) | Q(magasin=livraison.magasin)
                )
                lignes.exclude(statut__in=['annulee', 'refusee']).update(statut='livree')

                statuts = [l.statut for l in commande.lignes.all() if l.statut not in ('annulee', 'refusee')]
                if statuts:
                    ordre = [s[0] for s in STATUT_COMMANDE]
                    commande.statut = min(statuts, key=lambda s: ordre.index(s) if s in ordre else 99)
                else:
                    commande.statut = 'annulee' if commande.lignes.filter(statut='annulee').exists() else 'refusee'
                commande.save()

        livraison.statut = nouveau
        if nouveau in ['livree', 'echec_livraison']:
            livraison.date_livraison = timezone.now()
        livraison.save()

        HistoriqueCommande.objects.create(
            commande=livraison.commande,
            statut=livraison.commande.statut if livraison.commande else '',
            commentaire=f"Statut livraison mis à jour : {livraison.get_statut_display()}",
            utilisateur=request.user,
            utilisateur_nom=f"{request.user.prenom or ''} {request.user.nom or ''}".strip()
        )

        if livraison.client:
            creer_notification_client(
                client_id=livraison.client.user.id,
                type_notif='commande',
                titre='Suivi de livraison',
                message=f"Mise à jour de votre livraison : {livraison.get_statut_display()}.",
                lien=f'/mes-commandes/{livraison.commande.id}'
            )

        return Response(LivraisonSerializer(livraison).data)


# -----------------------------
# Admin - Gestion des livraisons
# -----------------------------
class AdminLivraisonListView(generics.ListAPIView):
    serializer_class = LivraisonSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut', 'responsable_type', 'mode_tarif']
    search_fields = ['commande__reference', 'client__user__nom', 'client__user__email', 'magasin__nom_magasin']
    ordering_fields = ['date_creation', 'date_livraison', 'frais_livraison']
    ordering = ['-date_creation']

    def get_queryset(self):
        return Livraison.objects.all().select_related(
            'commande', 'client__user', 'adresse', 'magasin', 'fournisseur', 'partenaire', 'livreur__user'
        )


class AdminLivraisonDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = LivraisonSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return Livraison.objects.all().select_related(
            'commande', 'client__user', 'adresse', 'magasin', 'fournisseur', 'partenaire', 'livreur__user'
        )


class AdminLivraisonUpdateStatutView(generics.UpdateAPIView):
    serializer_class = LivraisonSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return Livraison.objects.all()

    def patch(self, request, *args, **kwargs):
        livraison = self.get_object()
        nouveau = request.data.get('statut')

        if nouveau in [c[0] for c in Livraison.STATUT_LIVRAISON]:
            livraison.statut = nouveau
            if nouveau == 'livree':
                livraison.date_livraison = timezone.now()
                if livraison.commande:
                    livraison.commande.statut = 'livree'
                    livraison.commande.save()
            livraison.save()

        return Response(LivraisonSerializer(livraison).data)


# -----------------------------
# Admin / Partenaires de livraison
# -----------------------------
class PartenaireLivraisonListCreateView(generics.ListCreateAPIView):
    serializer_class = PartenaireLivraisonSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['nom', 'identifiant']

    def get_queryset(self):
        return PartenaireLivraison.objects.all()


class PartenaireLivraisonDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PartenaireLivraisonSerializer
    permission_classes = [IsAdmin]
    queryset = PartenaireLivraison.objects.all()