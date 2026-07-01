import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automecastore.settings')
django.setup()

from account.models import Utilisateur

# Create admin user
try:
    admin = Utilisateur.objects.create_user(
        email='admin@automeca.com',
        password='Admin123@',
        nom='Toure',
        prenom='Abdoulaye',
        role='admin'
    )
    admin.is_staff = True
    admin.is_superuser = True
    admin.save()
    print('✅ Admin user created successfully')
    print('📧 Email: admin@automeca.com')
    print('🔑 Password: Admin123@')
except Exception as e:
    print(f'❌ Error creating admin user: {e}')
