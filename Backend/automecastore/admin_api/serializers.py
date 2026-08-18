from rest_framework import serializers
from django.db.models import Sum
from .models import FinanceConfig, PaymentGateway, RolePermission, ApiConfig
from orders.models import Commande, LigneCommande, HistoriqueCommande
from delivery.models import Livraison
from account.models import Utilisateur, Client, Fournisseur, Administrateur, SecurityActivity, UserSession
from fournisseur.models import Magasin
from catalog.models import Produit


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


# -----------------------------
# Commandes admin
# -----------------------------
class ProduitCommandeMiniSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Produit
        fields = ['id', 'nom', 'image']

    def get_image(self, obj):
        if obj.image:
            return obj.image.url
        return None


class ClientAdminSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='user.id', read_only=True)
    nom = serializers.CharField(source='user.nom', read_only=True)
    prenom = serializers.CharField(source='user.prenom', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    telephone = serializers.CharField(source='user.telephone', read_only=True)
    adresse = serializers.CharField(source='user.adresse', read_only=True)

    class Meta:
        model = Client
        fields = ['id', 'nom', 'prenom', 'email', 'telephone', 'adresse']


class MagasinMiniSerializer(serializers.ModelSerializer):
    nom = serializers.CharField(source='nom_magasin', read_only=True)
    fournisseur = serializers.CharField(source='fournisseur.nom_entreprise', read_only=True)

    class Meta:
        model = Magasin
        fields = ['id', 'nom', 'fournisseur', 'telephone', 'email', 'adresse_complete']


class LigneCommandeAdminSerializer(serializers.ModelSerializer):
    produit = ProduitCommandeMiniSerializer(read_only=True)
    magasin = serializers.SerializerMethodField()
    sous_total = serializers.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        model = LigneCommande
        fields = ['id', 'produit', 'quantite', 'prix_unitaire', 'sous_total', 'magasin']

    def get_magasin(self, obj):
        if not obj.produit:
            return None
        fournisseur = obj.produit.fournisseur
        if not fournisseur:
            return None
        magasin = getattr(fournisseur, 'magasin', None)
        if magasin:
            return {
                'id': magasin.id,
                'nom': magasin.nom_magasin or fournisseur.nom_entreprise,
                'fournisseur': fournisseur.nom_entreprise
            }
        return {'id': None, 'nom': fournisseur.nom_entreprise, 'fournisseur': fournisseur.nom_entreprise}


class HistoriqueCommandeAdminSerializer(serializers.ModelSerializer):
    utilisateur = serializers.SerializerMethodField()
    statut_label = serializers.SerializerMethodField()

    class Meta:
        model = HistoriqueCommande
        fields = ['id', 'statut', 'statut_label', 'commentaire', 'motif', 'utilisateur', 'date']

    def get_utilisateur(self, obj):
        if obj.utilisateur:
            return f"{obj.utilisateur.prenom or ''} {obj.utilisateur.nom or ''}".strip() or obj.utilisateur.email
        return obj.utilisateur_nom or 'Système'

    def get_statut_label(self, obj):
        return dict(Commande._meta.get_field('statut').choices).get(obj.statut, obj.statut) if obj.statut else ''


class LivraisonAdminSerializer(serializers.ModelSerializer):
    livreur = serializers.SerializerMethodField()

    class Meta:
        model = Livraison
        fields = ['id', 'statut', 'date_livraison', 'frais_livraison', 'remarque', 'livreur']

    def get_livreur(self, obj):
        if obj.livreur and obj.livreur.user:
            return f"{obj.livreur.user.prenom or ''} {obj.livreur.user.nom or ''}".strip()
        return None


def get_commande_alertes(commande, now=None):
    from django.utils import timezone
    from datetime import timedelta

    if now is None:
        now = timezone.now()

    alertes = []
    delta = now - commande.date_commande

    statuts_bloques = {'nouvelle_commande', 'en_attente_confirmation'}
    statuts_retard = {'en_preparation', 'prete_a_retirer', 'en_cours_livraison'}
    statuts_payable = {'especes', 'a_la_livraison'}

    if commande.statut in statuts_bloques and delta > timedelta(hours=2):
        alertes.append({'type': 'bloquee', 'label': 'Commande bloquée', 'severity': 'high'})

    if commande.statut == 'en_preparation' and delta > timedelta(hours=24):
        alertes.append({'type': 'retard', 'label': 'Préparation en retard', 'severity': 'medium'})
    elif commande.statut == 'en_cours_livraison' and delta > timedelta(hours=48):
        alertes.append({'type': 'retard', 'label': 'Livraison en retard', 'severity': 'medium'})

    if commande.statut == 'annulee':
        alertes.append({'type': 'annulee', 'label': 'Commande annulée', 'severity': 'high'})

    if commande.mode_paiement in statuts_payable and commande.statut not in ('terminee', 'livree', 'annulee'):
        alertes.append({'type': 'paiement', 'label': 'Paiement en attente', 'severity': 'low'})

    if hasattr(commande, 'reclamation_set'):
        for r in commande.reclamation_set.all():
            if r.statut == 'EN_ATTENTE':
                alertes.append({'type': 'litige', 'label': 'Litige ouvert', 'severity': 'high'})
                break

    return alertes


class CommandeAdminListSerializer(serializers.ModelSerializer):
    client = ClientAdminSerializer(read_only=True)
    magasins = serializers.SerializerMethodField()
    nombre_produits = serializers.SerializerMethodField()
    montant_total = serializers.DecimalField(max_digits=10, decimal_places=2)
    frais_livraison = serializers.DecimalField(max_digits=10, decimal_places=2)
    alertes = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = [
            'id', 'reference', 'date_commande', 'statut', 'montant_total',
            'frais_livraison', 'mode_paiement', 'mode_reception', 'client',
            'magasins', 'nombre_produits', 'alertes'
        ]

    def get_magasins(self, obj):
        magasins = set()
        for ligne in obj.lignes.all():
            if not ligne.produit:
                continue
            fournisseur = ligne.produit.fournisseur
            if not fournisseur:
                continue
            magasin = getattr(fournisseur, 'magasin', None)
            nom = magasin.nom_magasin if magasin else fournisseur.nom_entreprise
            if nom:
                magasins.add(nom)
        return sorted(magasins)

    def get_nombre_produits(self, obj):
        return sum(l.quantite for l in obj.lignes.all())

    def get_alertes(self, obj):
        return get_commande_alertes(obj)


class CommandeAdminDetailSerializer(serializers.ModelSerializer):
    client = ClientAdminSerializer(read_only=True)
    magasins = serializers.SerializerMethodField()
    lignes = LigneCommandeAdminSerializer(many=True, read_only=True)
    historique = HistoriqueCommandeAdminSerializer(many=True, read_only=True)
    livraison = LivraisonAdminSerializer(read_only=True)
    alertes = serializers.SerializerMethodField()
    reclamations = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = [
            'id', 'reference', 'date_commande', 'statut', 'montant_total',
            'frais_livraison', 'mode_paiement', 'mode_reception',
            'commentaire_fournisseur', 'client', 'magasins', 'lignes',
            'historique', 'livraison', 'alertes', 'reclamations'
        ]

    def get_magasins(self, obj):
        magasins = set()
        for ligne in obj.lignes.all():
            if not ligne.produit:
                continue
            fournisseur = ligne.produit.fournisseur
            if not fournisseur:
                continue
            magasin = getattr(fournisseur, 'magasin', None)
            nom = magasin.nom_magasin if magasin else fournisseur.nom_entreprise
            if nom:
                magasins.add(nom)
        return sorted(magasins)

    def get_alertes(self, obj):
        return get_commande_alertes(obj)

    def get_reclamations(self, obj):
        return [{'id': r.id, 'objet': r.objet, 'statut': r.statut, 'date': r.date_soumission} for r in obj.reclamation_set.all()]


# -----------------------------
# Utilisateurs admin
# -----------------------------

ROLE_CONFIG = {
    'client': {'label': 'Client', 'icon': 'bi-person', 'color': 'blue'},
    'fournisseur': {'label': 'Fournisseur', 'icon': 'bi-shop', 'color': 'amber'},
    'admin': {'label': 'Administrateur', 'icon': 'bi-shield-lock', 'color': 'red'},
}

STATUT_CONFIG = {
    'actif': {'label': 'Actif', 'icon': 'bi-check-circle-fill', 'color': 'green'},
    'attente': {'label': 'En attente', 'icon': 'bi-hourglass-split', 'color': 'amber'},
    'suspendu': {'label': 'Suspendu', 'icon': 'bi-pause-circle-fill', 'color': 'red'},
    'desactive': {'label': 'Désactivé', 'icon': 'bi-x-circle-fill', 'color': 'gray'},
}


def _extraire_ville(user, fournisseur=None):
    if fournisseur and hasattr(fournisseur, 'magasin') and fournisseur.magasin and fournisseur.magasin.ville:
        return fournisseur.magasin.ville
    if user.adresse:
        parts = [p.strip() for p in (user.adresse or '').split(',')]
        if len(parts) > 1:
            return parts[-1]
        return parts[0]
    return None


def _photo_url(user):
    if hasattr(user, 'client') and user.client and user.client.photo:
        return user.client.photo.url
    if hasattr(user, 'fournisseur') and user.fournisseur and user.fournisseur.logo:
        return user.fournisseur.logo.url
    return None


def _statut_unifie(user):
    if user.role == 'fournisseur' and hasattr(user, 'fournisseur') and user.fournisseur:
        return user.fournisseur.statut
    return 'actif' if user.is_active else 'desactive'


class UtilisateurAdminListSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()
    role_label = serializers.SerializerMethodField()
    role_icon = serializers.SerializerMethodField()
    role_color = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    ville = serializers.SerializerMethodField()
    date_inscription = serializers.SerializerMethodField()
    derniere_connexion = serializers.DateTimeField(source='last_login', read_only=True)
    statut = serializers.SerializerMethodField()
    statut_label = serializers.SerializerMethodField()
    statut_color = serializers.SerializerMethodField()
    metadonnees = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'nom', 'prenom', 'nom_complet', 'email', 'telephone', 'adresse', 'ville',
            'role', 'role_label', 'role_icon', 'role_color', 'photo',
            'date_inscription', 'derniere_connexion',
            'statut', 'statut_label', 'statut_color', 'metadonnees'
        ]

    def get_nom_complet(self, obj):
        return f"{obj.prenom or ''} {obj.nom or ''}".strip()

    def get_role_label(self, obj):
        return ROLE_CONFIG.get(obj.role, {}).get('label', obj.role)

    def get_role_icon(self, obj):
        return ROLE_CONFIG.get(obj.role, {}).get('icon', 'bi-person')

    def get_role_color(self, obj):
        return ROLE_CONFIG.get(obj.role, {}).get('color', 'gray')

    def get_photo(self, obj):
        request = self.context.get('request')
        url = _photo_url(obj)
        if url and request:
            return request.build_absolute_uri(url)
        return url

    def get_ville(self, obj):
        fournisseur = getattr(obj, 'fournisseur', None)
        return _extraire_ville(obj, fournisseur)

    def get_date_inscription(self, obj):
        if obj.role == 'fournisseur':
            f = getattr(obj, 'fournisseur', None)
            return f.date_inscription if f else obj.date_joined
        if obj.role == 'client':
            c = getattr(obj, 'client', None)
            return c.date_inscription if c else obj.date_joined
        return obj.date_joined

    def get_statut(self, obj):
        return _statut_unifie(obj)

    def get_statut_label(self, obj):
        return STATUT_CONFIG.get(_statut_unifie(obj), {}).get('label', _statut_unifie(obj))

    def get_statut_color(self, obj):
        return STATUT_CONFIG.get(_statut_unifie(obj), {}).get('color', 'gray')

    def get_metadonnees(self, obj):
        meta = {}
        if obj.role == 'client':
            c = getattr(obj, 'client', None)
            if c:
                meta['point_fidelite'] = c.point_fidelite
                meta['nombre_commandes'] = Commande.objects.filter(client=c).count()
        elif obj.role == 'fournisseur':
            f = getattr(obj, 'fournisseur', None)
            if f:
                meta['nom_entreprise'] = f.nom_entreprise
                meta['nombre_produits'] = f.nombre_produits
                meta['nombre_ventes'] = f.nombre_ventes
                meta['chiffre_affaires'] = float(f.chiffre_affaires or 0)
                meta['note_moyenne'] = float(f.note_moyenne or 0)
        return meta


class CommandeMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Commande
        fields = ['id', 'reference', 'date_commande', 'statut', 'montant_total']


class ProduitMiniSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Produit
        fields = ['id', 'nom', 'reference_oem', 'prix', 'stock', 'image', 'etat']

    def get_image(self, obj):
        if obj.image:
            return obj.image.url
        return None


class SecurityActivityAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityActivity
        fields = ['id', 'action', 'ip_address', 'status', 'metadata', 'timestamp']


class UtilisateurAdminDetailSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()
    role_label = serializers.SerializerMethodField()
    role_icon = serializers.SerializerMethodField()
    role_color = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    ville = serializers.SerializerMethodField()
    date_inscription = serializers.SerializerMethodField()
    derniere_connexion = serializers.DateTimeField(source='last_login', read_only=True)
    statut = serializers.SerializerMethodField()
    statut_label = serializers.SerializerMethodField()
    statut_color = serializers.SerializerMethodField()
    profil = serializers.SerializerMethodField()
    historique_connexions = serializers.SerializerMethodField()
    historique_commandes = serializers.SerializerMethodField()
    produits = serializers.SerializerMethodField()
    statistiques = serializers.SerializerMethodField()
    historique_actions = serializers.SerializerMethodField()
    securite = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'nom', 'prenom', 'nom_complet', 'email', 'telephone', 'adresse', 'ville',
            'role', 'role_label', 'role_icon', 'role_color', 'photo',
            'date_inscription', 'derniere_connexion',
            'statut', 'statut_label', 'statut_color',
            'profil', 'historique_connexions', 'historique_commandes', 'produits',
            'statistiques', 'historique_actions', 'securite'
        ]

    def get_nom_complet(self, obj):
        return f"{obj.prenom or ''} {obj.nom or ''}".strip()

    def get_role_label(self, obj):
        return ROLE_CONFIG.get(obj.role, {}).get('label', obj.role)

    def get_role_icon(self, obj):
        return ROLE_CONFIG.get(obj.role, {}).get('icon', 'bi-person')

    def get_role_color(self, obj):
        return ROLE_CONFIG.get(obj.role, {}).get('color', 'gray')

    def get_photo(self, obj):
        request = self.context.get('request')
        url = _photo_url(obj)
        if url and request:
            return request.build_absolute_uri(url)
        return url

    def get_ville(self, obj):
        fournisseur = getattr(obj, 'fournisseur', None)
        return _extraire_ville(obj, fournisseur)

    def get_date_inscription(self, obj):
        if obj.role == 'fournisseur':
            f = getattr(obj, 'fournisseur', None)
            return f.date_inscription if f else obj.date_joined
        if obj.role == 'client':
            c = getattr(obj, 'client', None)
            return c.date_inscription if c else obj.date_joined
        return obj.date_joined

    def get_statut(self, obj):
        return _statut_unifie(obj)

    def get_statut_label(self, obj):
        return STATUT_CONFIG.get(_statut_unifie(obj), {}).get('label', _statut_unifie(obj))

    def get_statut_color(self, obj):
        return STATUT_CONFIG.get(_statut_unifie(obj), {}).get('color', 'gray')

    def get_profil(self, obj):
        if obj.role == 'client':
            c = getattr(obj, 'client', None)
            if c:
                return {
                    'point_fidelite': c.point_fidelite,
                    'mode_paiement_favoris': c.mode_paiement_favoris,
                    'note_livreur': float(c.note_livreur or 0),
                }
        elif obj.role == 'fournisseur':
            f = getattr(obj, 'fournisseur', None)
            if f:
                magasin = getattr(f, 'magasin', None)
                return {
                    'nom_entreprise': f.nom_entreprise,
                    'siret': f.siret,
                    'description': f.description,
                    'statut_fournisseur': f.statut,
                    'date_validation': f.date_validation,
                    'raison_refus': f.raison_refus,
                    'note_moyenne': float(f.note_moyenne or 0),
                    'nombre_avis': f.nombre_avis,
                    'nombre_produits': f.nombre_produits,
                    'nombre_ventes': f.nombre_ventes,
                    'chiffre_affaires': float(f.chiffre_affaires or 0),
                    'magasin': {
                        'nom_magasin': magasin.nom_magasin if magasin else f.nom_entreprise,
                        'ville': magasin.ville if magasin else None,
                        'adresse_complete': magasin.adresse_complete if magasin else (obj.adresse or ''),
                    } if magasin else None
                }
        elif obj.role == 'admin':
            a = getattr(obj, 'administrateur', None)
            if a:
                return {'date_embauche': a.date_embauche}
        return {}

    def get_historique_connexions(self, obj):
        qs = SecurityActivity.objects.filter(user=obj, action__in=['login', 'logout']).order_by('-timestamp')[:20]
        return SecurityActivityAdminSerializer(qs, many=True).data

    def get_historique_commandes(self, obj):
        if obj.role == 'client':
            c = getattr(obj, 'client', None)
            if c:
                qs = Commande.objects.filter(client=c).order_by('-date_commande')[:20]
                return CommandeMiniSerializer(qs, many=True).data
        return []

    def get_produits(self, obj):
        if obj.role == 'fournisseur':
            f = getattr(obj, 'fournisseur', None)
            if f:
                qs = Produit.objects.filter(fournisseur=f).order_by('-id')[:20]
                return ProduitMiniSerializer(qs, many=True, context=self.context).data
        return []

    def get_statistiques(self, obj):
        stats = {}
        if obj.role == 'client':
            c = getattr(obj, 'client', None)
            if c:
                stats['nombre_commandes'] = Commande.objects.filter(client=c).count()
                stats['montant_total_achats'] = float(
                    (Commande.objects.filter(client=c).aggregate(s=Sum('montant_total'))['s'] or 0)
                )
                stats['panier_moyen'] = round(
                    stats['montant_total_achats'] / (stats['nombre_commandes'] or 1), 2
                )
        elif obj.role == 'fournisseur':
            f = getattr(obj, 'fournisseur', None)
            if f:
                stats['nombre_produits'] = f.nombre_produits
                stats['nombre_ventes'] = f.nombre_ventes
                stats['chiffre_affaires'] = float(f.chiffre_affaires or 0)
                stats['note_moyenne'] = float(f.note_moyenne or 0)
                stats['nombre_commandes'] = LigneCommande.objects.filter(produit__fournisseur=f).values('commande_id').distinct().count()
        return stats

    def get_historique_actions(self, obj):
        from django.contrib.admin.models import LogEntry
        from django.contrib.contenttypes.models import ContentType
        ct = ContentType.objects.get_for_model(Utilisateur)
        logs = LogEntry.objects.filter(content_type=ct, object_id=str(obj.id)).select_related('user').order_by('-action_time')[:30]
        result = []
        for l in logs:
            result.append({
                'id': l.id,
                'action': 'Mise à jour',
                'detail': l.change_message,
                'utilisateur': f"{l.user.prenom or ''} {l.user.nom or ''}".strip() or l.user.email,
                'date': l.action_time
            })
        return result

    def get_securite(self, obj):
        echecs = SecurityActivity.objects.filter(
            user=obj, action='login', status='failure'
        ).count()
        return {
            'derniere_connexion': obj.last_login,
            'echecs_connexion': echecs,
            'compte_verrouille': not obj.is_active,
            'two_factor_enabled': obj.two_factor_enabled,
            'sessions_actives': UserSession.objects.filter(user=obj, is_active=True).count() if 'UserSession' in globals() else None
        }
