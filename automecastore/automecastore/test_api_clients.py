#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automecastore.settings')
django.setup()

from account.models import Client
from account.serializers import ClientSerializer

print('=== TEST API /api/clients/ ===')

# Simuler la requête API ClientListView
clients_queryset = Client.objects.filter(user__role='client').select_related('user').order_by('-date_inscription')
serializer = ClientSerializer(clients_queryset, many=True)

print(f'Nombre de clients retournés par l\'API: {len(serializer.data)}')

print('\n=== DONNÉES RETOURNÉES PAR L\'API ===')
for client_data in serializer.data:
    print(f"Client: {client_data['nom_complet']} - Email: {client_data.get('user_email', 'N/A')} - Statut: {client_data['statut']}")

print('\n=== VÉRIFICATION DES CHAMPS ===')
for client_data in serializer.data:
    required_fields = ['user', 'date_inscription', 'nom_complet', 'statut']
    missing_fields = [field for field in required_fields if field not in client_data]
    if missing_fields:
        print(f"⚠️  Champs manquants pour {client_data.get('nom_complet', 'Inconnu')}: {missing_fields}")
    else:
        print(f"✅ Tous les champs présents pour {client_data['nom_complet']}")
