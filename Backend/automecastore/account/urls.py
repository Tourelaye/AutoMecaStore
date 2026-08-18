from django.urls import path
from .views import (
    RegisterView, RegisterFournisseurView, MyTokenObtainPairView,
    CategorieListCreateView, CategorieDetailView, ProduitListCreateView, ProduitDetailView,
    ClientListView, ClientDetailView, ClientToggleActiveView, ClientDeleteView, ClientStatsView,
    AdminNotificationsView, CreateAdminView
)
from .mon_compte_views import (
    MeView, MesCommandesView, MaCommandeDetailView, MaCommandeAnnulerView,
    MesNotificationsListView, MesNotificationCountView, MesNotificationDetailView,
    MesNotificationMarkAllReadView,
    FavorisView, PanierView
)
from .security_views import (
    SecurityOverviewView, ChangePasswordView, TwoFactorView,
    SecurityActivityView, SessionsListView, RegisterSessionView,
    RevokeSessionView, RevokeOtherSessionsView, APITokenListCreateView,
    APITokenRevokeView, LogoutAllDevicesView, DeactivateAccountView
)
from .vehicule_views import VehiculeClientListCreateView, VehiculeClientDetailView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('register-fournisseur/', RegisterFournisseurView.as_view(), name='register_fournisseur'),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('categories/', CategorieListCreateView.as_view(), name='categorie_list_create'),
    path('categories/<int:pk>/', CategorieDetailView.as_view(), name='categorie_detail'),
    path('produits/', ProduitListCreateView.as_view(), name='produit_list_create'),
    path('produits/<int:pk>/', ProduitDetailView.as_view(), name='produit_detail'),
    
    # URLs pour la gestion des clients (admin)
    path('clients/', ClientListView.as_view(), name='client_list'),
    path('clients/<int:user_id>/', ClientDetailView.as_view(), name='client_detail'),
    path('clients/<int:user_id>/toggle-active/', ClientToggleActiveView.as_view(), name='client_toggle_active'),
    path('clients/<int:user_id>/delete/', ClientDeleteView.as_view(), name='client_delete'),
    path('clients/stats/', ClientStatsView.as_view(), name='client_stats'),
    
    # URL pour la création d'administrateurs (sécurisée)
    path('create-admin/', CreateAdminView.as_view(), name='create_admin'),
    
    # URLs pour la page "Mon Compte"
    path('me/', MeView.as_view(), name='me'),
    path('mes-commandes/', MesCommandesView.as_view(), name='mes_commandes'),
    path('mes-commandes/<int:pk>/', MaCommandeDetailView.as_view(), name='ma_commande_detail'),
    path('mes-commandes/<int:pk>/annuler/', MaCommandeAnnulerView.as_view(), name='ma_commande_annuler'),
    
    # Notifications unifiées (client, fournisseur, admin)
    path('notifications/', MesNotificationsListView.as_view(), name='mes_notifications'),
    path('notifications/count/', MesNotificationCountView.as_view(), name='mes_notification_count'),
    path('notifications/mark-all-read/', MesNotificationMarkAllReadView.as_view(), name='mes_notification_mark_all_read'),
    path('notifications/<int:pk>/', MesNotificationDetailView.as_view(), name='mes_notification_detail'),
    path('favoris/', FavorisView.as_view(), name='favoris'),
    path('panier/', PanierView.as_view(), name='panier'),
    path('panier/add/', PanierView.as_view(), name='panier_add'),
    path('panier/<int:item_id>/', PanierView.as_view(), name='panier_item'),

    # URLs pour les véhicules du client
    path('vehicules/', VehiculeClientListCreateView.as_view(), name='vehicules_list_create'),
    path('vehicules/<int:pk>/', VehiculeClientDetailView.as_view(), name='vehicules_detail'),

    # URLs pour la sécurité du compte
    path('security/overview/', SecurityOverviewView.as_view(), name='security_overview'),
    path('security/change-password/', ChangePasswordView.as_view(), name='security_change_password'),
    path('security/two-factor/', TwoFactorView.as_view(), name='security_two_factor'),
    path('security/activity/', SecurityActivityView.as_view(), name='security_activity'),
    path('security/sessions/', SessionsListView.as_view(), name='security_sessions'),
    path('security/sessions/register/', RegisterSessionView.as_view(), name='security_register_session'),
    path('security/sessions/revoke-others/', RevokeOtherSessionsView.as_view(), name='security_revoke_other_sessions'),
    path('security/sessions/<str:session_key>/revoke/', RevokeSessionView.as_view(), name='security_revoke_session'),
    path('security/tokens/', APITokenListCreateView.as_view(), name='security_tokens'),
    path('security/tokens/<int:token_id>/', APITokenRevokeView.as_view(), name='security_revoke_token'),
    path('security/logout-all/', LogoutAllDevicesView.as_view(), name='security_logout_all'),
    path('security/deactivate/', DeactivateAccountView.as_view(), name='security_deactivate'),
]