from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        # Vérification stricte : doit être authentifié, avoir le rôle 'admin' ET être staff
        return (
            request.user.is_authenticated and 
            request.user.role == 'admin' and 
            request.user.is_staff
        )

class IsClient(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'client'

class IsClientOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        is_authenticated = request.user.is_authenticated
        role = getattr(request.user, 'role', 'N/A')
        print(f"🔍 IsClientOrAdmin check - Authenticated: {is_authenticated}, Role: {role}")
        result = is_authenticated and role in ['client', 'admin', 'administrateur']
        print(f"🔍 IsClientOrAdmin result: {result}")
        return result

class IsLivreur(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'livreur'

class IsFournisseur(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'fournisseur' and
            getattr(request.user, 'fournisseur', None) is not None
        )