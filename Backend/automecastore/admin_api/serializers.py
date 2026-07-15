from rest_framework import serializers
from .models import FinanceConfig, PaymentGateway, RolePermission, ApiConfig


class FinanceConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceConfig
        fields = ['id', 'commission_rate', 'vat_rate', 'base_shipping_fee']


class PaymentGatewaySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentGateway
        fields = ['id', 'key', 'name', 'description', 'icon', 'enabled']


class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermission
        fields = ['id', 'title', 'description', 'role_key']


class ApiConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiConfig
        fields = ['id', 'auth_method', 'database_routing']


class AdminProfileSerializer(serializers.Serializer):
    full_name = serializers.CharField()
    email = serializers.EmailField()


class LogEntrySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    action_time = serializers.DateTimeField()
    user = serializers.CharField()
    content_type = serializers.CharField()
    object_repr = serializers.CharField()
    action_flag = serializers.IntegerField()
