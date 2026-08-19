from rest_framework import serializers
from .models import (
    Ticket, MessageSupport, Reclamation, Avis, SignalementAvis,
    MessageReclamation, PieceJointeReclamation, HistoriqueReclamation
)
from account.models import Client, Fournisseur, Utilisateur
from catalog.models import Produit
from orders.models import Commande, LigneCommande


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = "__all__"
        read_only_fields = ['client', 'date_ouverture', 'statut']


class MessageSupportSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageSupport
        fields = "__all__"
        read_only_fields = ['date_envoi']


class PieceJointeReclamationSerializer(serializers.ModelSerializer):
    fichier_url = serializers.SerializerMethodField()

    class Meta:
        model = PieceJointeReclamation
        fields = ['id', 'reclamation', 'message', 'fichier', 'fichier_url', 'type', 'nom', 'date']

    def get_fichier_url(self, obj):
        if obj.fichier:
            try:
                return obj.fichier.url
            except Exception:
                return None
        return None


class MessageReclamationSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.SerializerMethodField()
    auteur_photo = serializers.SerializerMethodField()
    auteur_role = serializers.CharField(source='auteur_type', read_only=True)
    pieces_jointes = PieceJointeReclamationSerializer(many=True, read_only=True)

    class Meta:
        model = MessageReclamation
        fields = [
            'id', 'reclamation', 'auteur_type', 'auteur', 'auteur_nom', 'auteur_photo', 'auteur_role',
            'contenu', 'est_note_interne', 'est_visible_client', 'est_visible_fournisseur',
            'lu_par_client', 'lu_par_fournisseur', 'pieces_jointes', 'date'
        ]
        read_only_fields = ['date']

    def get_auteur_nom(self, obj):
        if obj.auteur_nom:
            return obj.auteur_nom
        if obj.auteur:
            return f"{obj.auteur.prenom} {obj.auteur.nom}".strip()
        if obj.auteur_type == 'client':
            return "Client"
        if obj.auteur_type == 'fournisseur':
            return "Fournisseur"
        if obj.auteur_type == 'admin':
            return "Administrateur"
        return "Système"

    def get_auteur_photo(self, obj):
        if not obj.auteur:
            return None
        try:
            if obj.auteur.role == 'client' and hasattr(obj.auteur, 'client'):
                return obj.auteur.client.photo.url if obj.auteur.client.photo else None
            if obj.auteur.role == 'fournisseur' and hasattr(obj.auteur, 'fournisseur'):
                return obj.auteur.fournisseur.logo.url if obj.auteur.fournisseur.logo else None
        except Exception:
            return None
        return None


class HistoriqueReclamationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoriqueReclamation
        fields = ['id', 'reclamation', 'action', 'statut', 'priorite', 'auteur', 'auteur_nom', 'auteur_type', 'commentaire', 'date']


class ReclamationListSerializer(serializers.ModelSerializer):
    client_nom = serializers.SerializerMethodField()
    client_prenom = serializers.SerializerMethodField()
    client_photo = serializers.SerializerMethodField()
    fournisseur_nom = serializers.SerializerMethodField()
    produit_nom = serializers.SerializerMethodField()
    produit_image = serializers.SerializerMethodField()
    commande_reference = serializers.SerializerMethodField()
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)
    priorite_label = serializers.CharField(source='get_priorite_display', read_only=True)
    motif_label = serializers.CharField(source='get_motif_display', read_only=True)
    messages_non_lus = serializers.SerializerMethodField()

    class Meta:
        model = Reclamation
        fields = [
            'id', 'numero_dossier', 'objet', 'motif', 'motif_label', 'description',
            'statut', 'statut_label', 'priorite', 'priorite_label',
            'date_soumission', 'date_derniere_maj',
            'client', 'client_nom', 'client_prenom', 'client_photo',
            'fournisseur', 'fournisseur_nom',
            'produit', 'produit_nom', 'produit_image',
            'commande', 'commande_reference',
            'est_litige', 'messages_non_lus'
        ]

    def get_client_nom(self, obj):
        return obj.client.user.nom if obj.client and obj.client.user else None

    def get_client_prenom(self, obj):
        return obj.client.user.prenom if obj.client and obj.client.user else None

    def get_client_photo(self, obj):
        if obj.client and obj.client.photo:
            try:
                return obj.client.photo.url
            except Exception:
                return None
        return None

    def get_fournisseur_nom(self, obj):
        if obj.fournisseur:
            return obj.fournisseur.nom_entreprise or f"{obj.fournisseur.user.prenom} {obj.fournisseur.user.nom}".strip()
        if obj.produit and obj.produit.fournisseur:
            f = obj.produit.fournisseur
            return f.nom_entreprise or f"{f.user.prenom} {f.user.nom}".strip()
        return None

    def get_produit_nom(self, obj):
        return obj.produit.nom if obj.produit else None

    def get_produit_image(self, obj):
        if obj.produit:
            img = getattr(obj.produit, 'image', None)
            if img:
                try:
                    return img.url
                except Exception:
                    return None
        return None

    def get_commande_reference(self, obj):
        return obj.commande.reference if obj.commande else None

    def get_messages_non_lus(self, obj):
        return obj.messages.filter(est_visible_fournisseur=False, lu_par_fournisseur=False).count() if obj.fournisseur else 0


class ReclamationDetailSerializer(serializers.ModelSerializer):
    client = serializers.SerializerMethodField()
    fournisseur = serializers.SerializerMethodField()
    produit = serializers.SerializerMethodField()
    commande = serializers.SerializerMethodField()
    assigne_a = serializers.SerializerMethodField()
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)
    priorite_label = serializers.CharField(source='get_priorite_display', read_only=True)
    motif_label = serializers.CharField(source='get_motif_display', read_only=True)
    messages = MessageReclamationSerializer(many=True, read_only=True)
    historique = HistoriqueReclamationSerializer(many=True, read_only=True)
    pieces_jointes = PieceJointeReclamationSerializer(many=True, read_only=True)

    class Meta:
        model = Reclamation
        fields = [
            'id', 'numero_dossier', 'objet', 'motif', 'motif_label', 'description',
            'statut', 'statut_label', 'priorite', 'priorite_label',
            'est_litige', 'reponse_admin', 'note_interne', 'raison_rejet',
            'photos', 'documents',
            'date_soumission', 'date_ouverture', 'date_resolution', 'date_cloture', 'date_derniere_maj',
            'client', 'fournisseur', 'produit', 'commande', 'assigne_a',
            'messages', 'historique', 'pieces_jointes'
        ]

    def get_client(self, obj):
        if not obj.client:
            return None
        return {
            'id': obj.client.user.id,
            'nom': obj.client.user.nom,
            'prenom': obj.client.user.prenom,
            'nom_complet': f"{obj.client.user.prenom} {obj.client.user.nom}".strip(),
            'email': obj.client.user.email,
            'telephone': obj.client.user.telephone,
            'photo': obj.client.photo.url if obj.client.photo else None,
            'adresse': obj.client.user.adresse,
        }

    def get_fournisseur(self, obj):
        f = obj.fournisseur
        if not f and obj.produit and obj.produit.fournisseur:
            f = obj.produit.fournisseur
        if not f:
            return None
        return {
            'id': f.user.id,
            'nom': f.user.nom,
            'prenom': f.user.prenom,
            'nom_complet': f.nom_complet or f"{f.user.prenom} {f.user.nom}".strip(),
            'email': f.user.email,
            'telephone': f.user.telephone,
            'photo': f.logo.url if f.logo else None,
            'nom_entreprise': f.nom_entreprise,
            'siret': f.siret,
        }

    def get_produit(self, obj):
        if not obj.produit:
            return None
        return {
            'id': obj.produit.id,
            'nom': obj.produit.nom,
            'reference': obj.produit.reference,
            'reference_oem': getattr(obj.produit, 'reference_oem', ''),
            'image': obj.produit.image.url if obj.produit.image else None,
            'prix': getattr(obj.produit, 'prix', None),
        }

    def get_commande(self, obj):
        if not obj.commande:
            return None
        return {
            'id': obj.commande.id,
            'reference': obj.commande.reference,
            'date_commande': obj.commande.date_commande,
            'statut': obj.commande.statut,
            'montant_total': obj.commande.montant_total,
        }

    def get_assigne_a(self, obj):
        if not obj.assigne_a:
            return None
        return {
            'id': obj.assigne_a.id,
            'nom_complet': f"{obj.assigne_a.prenom} {obj.assigne_a.nom}".strip(),
            'email': obj.assigne_a.email,
        }


class ReclamationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reclamation
        fields = [
            'id', 'objet', 'motif', 'description', 'commande', 'produit', 'photos', 'documents'
        ]
        read_only_fields = ['numero_dossier', 'statut', 'priorite', 'client', 'fournisseur', 'date_soumission']

    def create(self, validated_data):
        from account.models import Client
        client = None
        if self.context.get('request'):
            try:
                client = self.context['request'].user.client
            except Exception:
                pass
        commande = validated_data.get('commande')
        produit = validated_data.get('produit')

        # Déduire le fournisseur si possible
        fournisseur = None
        if produit and produit.fournisseur:
            fournisseur = produit.fournisseur
        elif commande:
            for l in commande.lignes.select_related('produit__fournisseur').all():
                if l.produit and l.produit.fournisseur:
                    fournisseur = l.produit.fournisseur
                    break

        validated_data['client'] = client
        validated_data['fournisseur'] = fournisseur
        return super().create(validated_data)


class ReclamationSerializer(serializers.ModelSerializer):
    """Serializer générique rétrocompatible."""
    class Meta:
        model = Reclamation
        fields = "__all__"
        read_only_fields = ['numero_dossier', 'client', 'date_soumission', 'date_derniere_maj']


class SignalementAvisSerializer(serializers.ModelSerializer):
    client_nom = serializers.SerializerMethodField()
    fournisseur_nom = serializers.SerializerMethodField()
    motif_label = serializers.CharField(source='get_motif_display', read_only=True)
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = SignalementAvis
        fields = ['id', 'avis', 'client', 'client_nom', 'fournisseur', 'fournisseur_nom', 'motif', 'motif_label', 'commentaire', 'date', 'statut', 'statut_label']
        read_only_fields = ['client', 'client_nom', 'fournisseur', 'fournisseur_nom', 'date', 'statut', 'motif_label', 'statut_label']

    def get_client_nom(self, obj):
        if obj.client and obj.client.user:
            return f"{obj.client.user.prenom} {obj.client.user.nom}".strip()
        return None

    def get_fournisseur_nom(self, obj):
        return obj.fournisseur.nom_entreprise if obj.fournisseur else None


class AvisSerializer(serializers.ModelSerializer):
    client_nom = serializers.SerializerMethodField()
    client_prenom = serializers.SerializerMethodField()
    client_photo = serializers.SerializerMethodField()
    produit_nom = serializers.SerializerMethodField()
    produit_reference = serializers.SerializerMethodField()
    produit_image = serializers.SerializerMethodField()
    magasin_nom = serializers.SerializerMethodField()
    commande_reference = serializers.SerializerMethodField()
    achat_verifie = serializers.SerializerMethodField()
    signale = serializers.SerializerMethodField()
    signalements = SignalementAvisSerializer(many=True, read_only=True)

    class Meta:
        model = Avis
        fields = [
            'id', 'note', 'commentaire', 'date',
            'client', 'client_nom', 'client_prenom', 'client_photo',
            'produit', 'produit_nom', 'produit_reference', 'produit_image',
            'magasin', 'magasin_nom', 'commande', 'commande_reference', 'ligne_commande',
            'note_qualite_produit', 'note_delai', 'note_communication', 'note_livraison',
            'reponse_fournisseur', 'date_reponse', 'reponse_fournisseur_nom',
            'photos', 'achat_verifie', 'signale', 'signalements', 'approuve',
        ]
        read_only_fields = ['client', 'date', 'achat_verifie', 'signale']

    def get_client_nom(self, obj: Avis):
        return obj.client.user.nom if obj.client and obj.client.user else None

    def get_client_prenom(self, obj: Avis):
        return obj.client.user.prenom if obj.client and obj.client.user else None

    def get_client_photo(self, obj: Avis):
        if obj.client and obj.client.photo:
            return obj.client.photo.url
        return None

    def get_produit_nom(self, obj: Avis):
        return obj.produit.nom if obj.produit else None

    def get_produit_reference(self, obj: Avis):
        return obj.produit.reference if obj.produit else None

    def get_produit_image(self, obj: Avis):
        if obj.produit and hasattr(obj.produit, 'image') and obj.produit.image:
            try:
                return obj.produit.image.url
            except Exception:
                return None
        return None

    def get_magasin_nom(self, obj: Avis):
        return obj.magasin.nom_magasin if obj.magasin else None

    def get_commande_reference(self, obj: Avis):
        return obj.commande.reference if obj.commande else None

    def get_achat_verifie(self, obj: Avis):
        return obj.achat_verifie

    def get_signale(self, obj: Avis):
        client = self.context.get('client')
        fournisseur = self.context.get('fournisseur')
        return bool(client and obj.signalements.filter(client=client).exists()) or bool(fournisseur and obj.signalements.filter(fournisseur=fournisseur).exists())


class AvisListSerializer(serializers.ModelSerializer):
    """Serializer léger pour la liste admin."""
    client_nom = serializers.SerializerMethodField()
    client_prenom = serializers.SerializerMethodField()
    client_email = serializers.SerializerMethodField()
    client_photo = serializers.SerializerMethodField()
    produit_nom = serializers.SerializerMethodField()
    produit_image = serializers.SerializerMethodField()
    magasin_nom = serializers.SerializerMethodField()
    commande_reference = serializers.SerializerMethodField()
    fournisseur_nom = serializers.SerializerMethodField()
    nb_signalements = serializers.SerializerMethodField()
    signale_en_attente = serializers.SerializerMethodField()

    class Meta:
        model = Avis
        fields = [
            'id', 'note', 'commentaire', 'date', 'approuve', 'achat_verifie',
            'client_nom', 'client_prenom', 'client_email', 'client_photo',
            'produit_nom', 'produit_image', 'magasin_nom', 'commande_reference',
            'fournisseur_nom', 'nb_signalements', 'signale_en_attente',
            'note_qualite_produit', 'note_delai', 'note_communication', 'note_livraison',
            'reponse_fournisseur', 'date_reponse',
        ]

    def get_client_nom(self, obj):
        return obj.client.user.nom if obj.client and obj.client.user else None

    def get_client_prenom(self, obj):
        return obj.client.user.prenom if obj.client and obj.client.user else None

    def get_client_email(self, obj):
        return obj.client.user.email if obj.client and obj.client.user else None

    def get_client_photo(self, obj):
        if obj.client and obj.client.photo:
            try:
                return obj.client.photo.url
            except Exception:
                return None
        return None

    def get_produit_nom(self, obj):
        return obj.produit.nom if obj.produit else None

    def get_produit_image(self, obj):
        if obj.produit and hasattr(obj.produit, 'image') and obj.produit.image:
            try:
                return obj.produit.image.url
            except Exception:
                return None
        return None

    def get_magasin_nom(self, obj):
        return obj.magasin.nom_magasin if obj.magasin else None

    def get_commande_reference(self, obj):
        return obj.commande.reference if obj.commande else None

    def get_fournisseur_nom(self, obj):
        if obj.produit and obj.produit.fournisseur:
            f = obj.produit.fournisseur
            return f.nom_entreprise or f.nom_complet or f"{f.user.prenom} {f.user.nom}".strip()
        if obj.magasin and obj.magasin.fournisseur:
            f = obj.magasin.fournisseur
            return f.nom_entreprise or f.nom_complet or f"{f.user.prenom} {f.user.nom}".strip()
        return None

    def get_nb_signalements(self, obj):
        return obj.signalements.count()

    def get_signale_en_attente(self, obj):
        return obj.signalements.filter(statut='en_attente').exists()


class AvisDetailSerializer(serializers.ModelSerializer):
    """Serializer complet pour le détail admin."""
    client = serializers.SerializerMethodField()
    produit = serializers.SerializerMethodField()
    magasin = serializers.SerializerMethodField()
    commande = serializers.SerializerMethodField()
    signalements = SignalementAvisSerializer(many=True, read_only=True)

    class Meta:
        model = Avis
        fields = [
            'id', 'note', 'commentaire', 'date', 'approuve', 'achat_verifie',
            'client', 'produit', 'magasin', 'commande', 'ligne_commande',
            'note_qualite_produit', 'note_delai', 'note_communication', 'note_livraison',
            'reponse_fournisseur', 'date_reponse', 'reponse_fournisseur_nom',
            'photos', 'signalements',
        ]

    def get_client(self, obj):
        if not obj.client or not obj.client.user:
            return None
        u = obj.client.user
        return {
            'id': u.id,
            'nom': u.nom,
            'prenom': u.prenom,
            'nom_complet': f"{u.prenom} {u.nom}".strip(),
            'email': u.email,
            'telephone': u.telephone,
            'photo': obj.client.photo.url if obj.client.photo else None,
        }

    def get_produit(self, obj):
        if not obj.produit:
            return None
        return {
            'id': obj.produit.id,
            'nom': obj.produit.nom,
            'reference': obj.produit.reference,
            'image': obj.produit.image.url if hasattr(obj.produit, 'image') and obj.produit.image else None,
            'prix': getattr(obj.produit, 'prix', None),
        }

    def get_magasin(self, obj):
        if not obj.magasin:
            return None
        return {
            'id': obj.magasin.id,
            'nom_magasin': obj.magasin.nom_magasin,
        }

    def get_commande(self, obj):
        if not obj.commande:
            return None
        return {
            'id': obj.commande.id,
            'reference': obj.commande.reference,
            'date_commande': obj.commande.date_commande,
            'statut': obj.commande.statut,
            'montant_total': obj.commande.montant_total,
        }


class AvisCreateSerializer(serializers.ModelSerializer):
    note = serializers.IntegerField(min_value=1, max_value=5)
    note_qualite_produit = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)
    note_delai = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)
    note_communication = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)
    note_livraison = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)
    achat_verifie = serializers.BooleanField(read_only=True)

    class Meta:
        model = Avis
        fields = [
            'id', 'note', 'commentaire', 'produit', 'magasin', 'commande', 'ligne_commande',
            'note_qualite_produit', 'note_delai', 'note_communication', 'note_livraison',
            'photos', 'achat_verifie', 'date'
        ]
        read_only_fields = ['id', 'achat_verifie', 'date']

    def validate(self, data):
        request = self.context.get('request')
        client = getattr(request.user, 'client', None) if request and request.user.is_authenticated else None
        if not client:
            raise serializers.ValidationError("Authentification client requise.")

        produit = data.get('produit')
        magasin = data.get('magasin')
        commande = data.get('commande')
        ligne = data.get('ligne_commande')
        termines = ['terminee', 'livree', 'prete_a_retirer']
        achat = False

        if produit:
            qs = LigneCommande.objects.filter(commande__client=client, produit=produit)
            if commande:
                qs = qs.filter(commande=commande)
            if ligne:
                qs = qs.filter(id=ligne.id)
            if not qs.filter(commande__statut__in=termines).exists():
                raise serializers.ValidationError("Vous n'avez pas acheté ce produit ou la commande n'est pas terminée.")
            if Avis.objects.filter(client=client, produit=produit).exists():
                raise serializers.ValidationError("Vous avez déjà évalué ce produit.")
            achat = True

        if magasin:
            qs = LigneCommande.objects.filter(commande__client=client, magasin=magasin)
            if commande:
                qs = qs.filter(commande=commande)
            if ligne:
                qs = qs.filter(id=ligne.id)
            if not qs.filter(commande__statut__in=termines).exists():
                raise serializers.ValidationError("Vous n'avez pas commandé dans ce magasin ou la commande n'est pas terminée.")
            if Avis.objects.filter(client=client, magasin=magasin).exists():
                raise serializers.ValidationError("Vous avez déjà évalué ce magasin.")
            achat = True

        if not produit and not magasin:
            raise serializers.ValidationError("Vous devez évaluer un produit ou un magasin.")

        data['achat_verifie'] = achat
        return data

    def create(self, validated_data):
        request = self.context.get('request')
        client = request.user.client
        validated_data['client'] = client
        return super().create(validated_data)
