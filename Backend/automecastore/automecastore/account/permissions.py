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



class IsLivreur(permissions.BasePermission):

    def has_permission(self, request, view):

        return request.user.is_authenticated and request.user.role == 'livreur'


class IsFournisseur(permissions.BasePermission):

    def has_permission(self, request, view):

        return request.user.is_authenticated and request.user.role == 'fournisseur'