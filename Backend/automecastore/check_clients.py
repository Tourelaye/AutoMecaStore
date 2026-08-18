#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automecastore.settings')
django.setup()

from account.models import Utilisateur, Client

print('=== UTILISATEURS ===')
users = Utilisateur.objects.all()
for u in users:
    print(f'ID: {u.id}, Email: {u.email}, Role: {u.role}, Actif: {u.is_active}')

print('\n=== CLIENTS ===')
clients = Client.objects.all().select_related('user')
for c in clients:
    print(f'User ID: {c.user.id}, User: {c.user.email}, User Role: {c.user.role}, Date: {c.date_inscription}')

print('\n=== VÉRIFICATION SYNCHRONISATION ===')
# Vérifier si tous les utilisateurs avec role='client' ont un profil Client
client_users = Utilisateur.objects.filter(role='client')
print(f'Utilisateurs avec role="client": {client_users.count()}')

client_profiles = Client.objects.all()
print(f'Profils Client dans la base: {client_profiles.count()}')

# Vérifier les utilisateurs sans profil client
users_without_profile = []
for user in client_users:
    if not Client.objects.filter(user=user).exists():
        users_without_profile.append(user.email)

if users_without_profile:
    print(f'⚠️  Utilisateurs sans profil Client: {users_without_profile}')
else:
    print(' Tous les utilisateurs clients ont un profil Client')
