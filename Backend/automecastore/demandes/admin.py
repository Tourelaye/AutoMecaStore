from django.contrib import admin
from .models import DemandePiece, OffreFournisseur


@admin.register(DemandePiece)
class DemandePieceAdmin(admin.ModelAdmin):
    list_display = ['reference', 'piece_recherchee', 'client', 'ville', 'statut', 'date_creation']
    list_filter = ['statut', 'date_creation']
    search_fields = ['reference', 'piece_recherchee', 'marque_vehicule', 'modele_vehicule']
    readonly_fields = ['reference', 'date_creation', 'date_mise_a_jour']


@admin.register(OffreFournisseur)
class OffreFournisseurAdmin(admin.ModelAdmin):
    list_display = ['fournisseur', 'demande', 'prix', 'etat', 'disponibilite', 'statut', 'date_creation']
    list_filter = ['statut', 'etat', 'disponibilite', 'date_creation']
    search_fields = ['demande__reference', 'fournisseur__nom_entreprise']
