from django.urls import path
from .views import (
    AdminDashboardStatsView,
    LogEntryListView,
    LogEntryDetailView,
    AdminProfileView,
    FinanceConfigView,
    PaymentGatewayListView,
    PaymentGatewayDetailView,
    PaymentGatewayToggleView,
    RolePermissionListView,
    ApiConfigView
)

urlpatterns = [
    # Dashboard stats
    path('dashboard/stats/', AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),
    
    # Journal d'activités
    path('journal/', LogEntryListView.as_view(), name='admin-journal'),
    path('journal/<int:pk>/', LogEntryDetailView.as_view(), name='admin-journal-detail'),
    
    # Profil admin
    path('profil/', AdminProfileView.as_view(), name='admin-profil'),
    
    # Configuration financière
    path('parametres/finance/', FinanceConfigView.as_view(), name='admin-finance-config'),
    
    # Passerelles de paiement
    path('parametres/gateways/', PaymentGatewayListView.as_view(), name='admin-payment-gateways'),
    path('parametres/gateways/<int:pk>/', PaymentGatewayDetailView.as_view(), name='admin-payment-gateway-detail'),
    path('parametres/gateways/<int:pk>/toggle/', PaymentGatewayToggleView.as_view(), name='admin-payment-gateway-toggle'),
    
    # Rôles et permissions
    path('parametres/roles/', RolePermissionListView.as_view(), name='admin-roles'),
    
    # Configuration API
    path('parametres/api/', ApiConfigView.as_view(), name='admin-api-config'),
]
