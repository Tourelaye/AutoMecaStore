#!/usr/bin/env python
import os
import django
from django.utils import timezone
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automecastore.settings')
django.setup()

from account.models import Utilisateur, Client

print('=== CORRECTION DES PROFILS CLIENTS MANQUANTS ===')

# Trouver tous les utilisateurs avec role='client' qui n'ont pas de profil Client
client_users_without_profile = []
for user in Utilisateur.objects.filter(role='client'):
    if not Client.objects.filter(user=user).exists():
        client_users_without_profile.append(user)

print(f'Utilisateurs sans profil Client: {len(client_users_without_profile)}')

# Créer les profils Client manquants
for user in client_users_without_profile:
    print(f'Création du profil Client pour: {user.email}')
    Client.objects.create(
        user=user,
        date_inscription=timezone.now(),
        point_fidelite=0
    )
    print(f'✅ Profil Client créé pour {user.email}')

# Vérification finale
print('\n=== VÉRIFICATION FINALE ===')
all_client_users = Utilisateur.objects.filter(role='client')
all_client_profiles = Client.objects.all()

print(f'Utilisateurs avec role="client": {all_client_users.count()}')
print(f'Profils Client dans la base: {all_client_profiles.count()}')

if all_client_users.count() == all_client_profiles.count():
    print('✅ SYNCHRONISATION COMPLÈTE !')
else:
    print('⚠️  Problème persiste')
