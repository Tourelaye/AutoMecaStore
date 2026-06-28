from django.contrib import admin
from .models import Utilisateur, Client

admin.site.register(Utilisateur)
admin.site.register(Client)