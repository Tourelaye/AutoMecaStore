import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automecastore.settings')
django.setup()

from account.models import Utilisateur

# Create admin user
try:
    admin = Utilisateur.objects.create_user(
        email='admin@automecastore.com',
        password='admin123',
        nom='Admin',
        prenom='Super',
        role='admin'
    )
    admin.is_staff = True
    admin.is_superuser = True
    admin.save()
    print('✅ Admin user created successfully')
    print('📧 Email: admin@automecastore.com')
    print('🔑 Password: admin123')
except Exception as e:
    print(f'❌ Error creating admin user: {e}')
