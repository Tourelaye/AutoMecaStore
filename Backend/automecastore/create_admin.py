import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automecastore.settings')
django.setup()

from account.models import Utilisateur

admin_email = os.environ.get('ADMIN_EMAIL', 'admin@automeca.com')
admin_password = os.environ.get('ADMIN_PASSWORD', '')

if not admin_password:
    print('ERROR: Set ADMIN_PASSWORD env var before running this script.')
    exit(1)

try:
    admin = Utilisateur.objects.create_user(
        email=admin_email,
        password=admin_password,
        nom=os.environ.get('ADMIN_NOM', 'Admin'),
        prenom=os.environ.get('ADMIN_PRENOM', 'Super'),
        role='admin'
    )
    admin.is_staff = True
    admin.is_superuser = True
    admin.save()
    print(f'Admin user created: {admin_email}')
except Exception as e:
    print(f'Error: {e}')
