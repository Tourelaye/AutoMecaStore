from django.db import models


class FinanceConfig(models.Model):
    """Configuration financière globale (commission, TVA, frais de livraison)"""
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    base_shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=5.90)

    class Meta:
        verbose_name = 'Configuration financière'
        verbose_name_plural = 'Configurations financières'

    def __str__(self):
        return f'Commission {self.commission_rate}% - TVA {self.vat_rate}%'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class PaymentGateway(models.Model):
    """Passerelles de paiement activables"""
    key = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    enabled = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Passerelle de paiement'
        verbose_name_plural = 'Passerelles de paiement'

    def __str__(self):
        return self.name


class RolePermission(models.Model):
    """Description des rôles utilisateurs"""
    title = models.CharField(max_length=100)
    description = models.TextField()
    role_key = models.CharField(max_length=30, unique=True)

    class Meta:
        verbose_name = 'Rôle et permission'
        verbose_name_plural = 'Rôles et permissions'

    def __str__(self):
        return self.title


class ApiConfig(models.Model):
    """Configuration technique de l'API"""
    auth_method = models.CharField(max_length=100, default='Token Authentication (HTTP Bearer)')
    database_routing = models.CharField(max_length=100, default='PostgreSQL')

    class Meta:
        verbose_name = 'Configuration API'
        verbose_name_plural = 'Configurations API'

    def __str__(self):
        return self.auth_method

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
