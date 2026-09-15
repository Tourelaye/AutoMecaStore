from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Q
from account.models import Utilisateur, FournisseurProfile
from account.permissions import IsAdmin
from catalog.models import Produit


class AdminUtilisateurListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from account.models import Client, FournisseurProfile
        from orders.models import Commande, LigneCommande
        from catalog.models import FournisseurProduit

        qs = Utilisateur.objects.exclude(role='admin').order_by('-date_joined')

        role = request.GET.get('role')
        if role and role != 'tous':
            qs = qs.filter(role=role)
        statut = request.GET.get('statut')
        if statut and statut != 'tous':
            if statut == 'actif':
                qs = qs.filter(is_active=True)
            elif statut == 'suspendu':
                qs = qs.filter(is_active=False)
            elif statut == 'attente':
                qs = qs.filter(fournisseur_profile__statut='en_attente')
            elif statut == 'desactive':
                qs = qs.filter(is_active=False)
        q = request.GET.get('q')
        if q:
            qs = qs.filter(
                Q(nom__icontains=q) | Q(prenom__icontains=q) | Q(email__icontains=q)
            )
        periode = request.GET.get('periode')
        if periode and periode != 'tous':
            from django.utils import timezone
            from datetime import timedelta
            now = timezone.now()
            if periode == 'today':
                qs = qs.filter(date_joined__date=now.date())
            elif periode == 'week':
                qs = qs.filter(date_joined__gte=now - timedelta(days=7))
            elif periode == 'month':
                qs = qs.filter(date_joined__gte=now - timedelta(days=30))

        data = []
        for u in qs:
            nom_complet = f"{u.nom} {u.prenom}"
            role_labels = {
                'client': 'Client',
                'fournisseur': 'Fournisseur',
                'admin': 'Administrateur',
            }
            role_icons = {
                'client': 'bi-person',
                'fournisseur': 'bi-shop',
                'admin': 'bi-shield-lock',
            }
            role_colors = {
                'client': 'blue',
                'fournisseur': 'green',
                'admin': 'red',
            }
            if u.is_active:
                user_statut = 'actif'
            else:
                try:
                    fp = u.fournisseur_profile
                    user_statut = 'suspendu' if fp.statut == 'suspendu' else 'desactive'
                except Exception:
                    user_statut = 'desactive'
            statut_labels = {
                'actif': 'Actif',
                'attente': 'En attente',
                'suspendu': 'Suspendu',
                'desactive': 'Désactivé',
            }
            statut_colors = {
                'actif': 'green',
                'attente': 'yellow',
                'suspendu': 'orange',
                'desactive': 'red',
            }
            metadonnees = {}
            if u.role == 'client':
                try:
                    c = u.client
                    metadonnees['point_fidelite'] = getattr(c, 'point_fidelite', 0) or 0
                    metadonnees['nombre_commandes'] = Commande.objects.filter(client=c).count()
                except Exception:
                    pass
            elif u.role == 'fournisseur':
                try:
                    fp = u.fournisseur_profile
                    metadonnees['nom_entreprise'] = fp.nom_entreprise or ''
                    metadonnees['nombre_produits'] = fp.nombre_produits or 0
                    metadonnees['nombre_ventes'] = fp.nombre_ventes or 0
                    metadonnees['chiffre_affaires'] = float(fp.chiffre_affaires or 0)
                    metadonnees['note_moyenne'] = float(fp.note_moyenne) if fp.note_moyenne else None
                except Exception:
                    pass
            data.append({
                'id': u.id,
                'nom': u.nom,
                'prenom': u.prenom,
                'nom_complet': nom_complet,
                'email': u.email,
                'telephone': u.telephone or '',
                'adresse': u.adresse or '',
                'ville': '',
                'role': u.role,
                'role_label': role_labels.get(u.role, u.role),
                'role_icon': role_icons.get(u.role, 'bi-person'),
                'role_color': role_colors.get(u.role, 'blue'),
                'photo': None,
                'date_inscription': u.date_joined.isoformat() if u.date_joined else None,
                'derniere_connexion': u.last_login.isoformat() if u.last_login else None,
                'statut': user_statut,
                'statut_label': statut_labels.get(user_statut, user_statut),
                'statut_color': statut_colors.get(user_statut, 'gray'),
                'metadonnees': metadonnees,
            })
        return Response(data)


class AdminUtilisateurDetailView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        from account.models import Client, FournisseurProfile
        from orders.models import Commande, LigneCommande
        from catalog.models import FournisseurProduit
        try:
            u = Utilisateur.objects.get(pk=pk)
            nom_complet = f"{u.nom} {u.prenom}"
            role_labels = {'client': 'Client', 'fournisseur': 'Fournisseur', 'admin': 'Administrateur'}
            role_icons = {'client': 'bi-person', 'fournisseur': 'bi-shop', 'admin': 'bi-shield-lock'}
            role_colors = {'client': 'blue', 'fournisseur': 'green', 'admin': 'red'}
            if u.is_active:
                user_statut = 'actif'
            else:
                try:
                    fp = u.fournisseur_profile
                    user_statut = 'suspendu' if fp.statut == 'suspendu' else 'desactive'
                except Exception:
                    user_statut = 'desactive'
            statut_labels = {'actif': 'Actif', 'attente': 'En attente', 'suspendu': 'Suspendu', 'desactive': 'Désactivé'}
            statut_colors = {'actif': 'green', 'attente': 'yellow', 'suspendu': 'orange', 'desactive': 'red'}
            metadonnees = {}
            profil = None
            statistiques = {}
            historique_commandes = []
            produits = []
            if u.role == 'client':
                try:
                    c = u.client
                    metadonnees['point_fidelite'] = getattr(c, 'point_fidelite', 0) or 0
                    commandes = Commande.objects.filter(client=c).order_by('-date_commande')[:10]
                    metadonnees['nombre_commandes'] = commandes.count()
                    total_achats = sum(float(cmd.montant_total) for cmd in commandes)
                    statistiques = {
                        'nombre_commandes': commandes.count(),
                        'montant_total_achats': total_achats,
                        'panier_moyen': total_achats / commandes.count() if commandes.count() > 0 else 0,
                    }
                    for cmd in commandes:
                        historique_commandes.append({
                            'id': cmd.id, 'reference': cmd.reference or '',
                            'date_commande': cmd.date_commande.isoformat() if cmd.date_commande else '',
                            'statut': cmd.statut, 'montant_total': float(cmd.montant_total),
                        })
                except Exception:
                    pass
            elif u.role == 'fournisseur':
                try:
                    fp = u.fournisseur_profile
                    metadonnees['nom_entreprise'] = fp.nom_entreprise or ''
                    metadonnees['nombre_produits'] = fp.nombre_produits or 0
                    metadonnees['nombre_ventes'] = fp.nombre_ventes or 0
                    metadonnees['chiffre_affaires'] = float(fp.chiffre_affaires or 0)
                    metadonnees['note_moyenne'] = float(fp.note_moyenne) if fp.note_moyenne else None
                    profil = {
                        'nom_entreprise': fp.nom_entreprise or '',
                        'siret': fp.siret or '',
                        'description': fp.description or '',
                        'statut_fournisseur': fp.statut,
                        'date_validation': fp.date_validation.isoformat() if fp.date_validation else None,
                        'raison_refus': '',
                        'note_moyenne': float(fp.note_moyenne) if fp.note_moyenne else None,
                        'nombre_avis': fp.nombre_avis or 0,
                        'nombre_produits': fp.nombre_produits or 0,
                        'nombre_ventes': fp.nombre_ventes or 0,
                        'chiffre_affaires': float(fp.chiffre_affaires or 0),
                        'magasin': {
                            'nom_magasin': fp.nom_entreprise or '',
                            'ville': '',
                            'adresse_complete': u.adresse or '',
                        },
                    }
                    statistiques = {
                        'nombre_produits': fp.nombre_produits or 0,
                        'nombre_ventes': fp.nombre_ventes or 0,
                        'chiffre_affaires': float(fp.chiffre_affaires or 0),
                        'note_moyenne': float(fp.note_moyenne) if fp.note_moyenne else None,
                    }
                    produit_ids = FournisseurProduit.objects.filter(
                        fournisseur__user_id=u.id
                    ).values_list('produit_id', flat=True)
                    for p in Produit.objects.filter(id__in=produit_ids)[:10]:
                        produits.append({
                            'id': p.id, 'nom': p.nom,
                            'reference_oem': getattr(p, 'reference', '') or '',
                            'prix': float(p.prix), 'stock': p.stock,
                            'image': request.build_absolute_uri(p.image.url) if p.image else None,
                            'etat': 'actif' if p.is_active else 'inactif',
                        })
                except Exception:
                    pass
            return Response({
                'id': u.id, 'nom': u.nom, 'prenom': u.prenom,
                'nom_complet': nom_complet,
                'email': u.email, 'role': u.role,
                'role_label': role_labels.get(u.role, u.role),
                'role_icon': role_icons.get(u.role, 'bi-person'),
                'role_color': role_colors.get(u.role, 'blue'),
                'telephone': u.telephone or '',
                'adresse': u.adresse or '',
                'ville': '',
                'photo': None,
                'date_inscription': u.date_joined.isoformat() if u.date_joined else None,
                'derniere_connexion': u.last_login.isoformat() if u.last_login else None,
                'statut': user_statut,
                'statut_label': statut_labels.get(user_statut, user_statut),
                'statut_color': statut_colors.get(user_statut, 'gray'),
                'metadonnees': metadonnees,
                'is_active': u.is_active,
                'profil': profil,
                'historique_commandes': historique_commandes,
                'produits': produits,
                'statistiques': statistiques,
                'historique_connexions': [],
                'historique_actions': [],
                'securite': {
                    'derniere_connexion': u.last_login.isoformat() if u.last_login else None,
                    'echecs_connexion': 0,
                    'compte_verrouille': not u.is_active,
                    'two_factor_enabled': False,
                    'sessions_actives': None,
                },
            })
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=404)
    def patch(self, request, pk):
        try:
            u = Utilisateur.objects.get(pk=pk)
            for f in ['nom', 'prenom', 'email', 'telephone', 'adresse', 'is_active']:
                if f in request.data:
                    setattr(u, f, request.data[f])
            u.save()
            return Response({'id': u.id, 'nom': u.nom, 'prenom': u.prenom, 'email': u.email, 'role': u.role, 'is_active': u.is_active})
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=404)


class AdminUtilisateurStatsView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        now = timezone.now()
        total = Utilisateur.objects.exclude(role='admin').count()
        clients = Utilisateur.objects.filter(role='client').count()
        fournisseurs = Utilisateur.objects.filter(role='fournisseur').count()
        administrateurs = Utilisateur.objects.filter(role='admin').count()
        nouveaux_mois = Utilisateur.objects.exclude(role='admin').filter(
            date_joined__gte=now - timedelta(days=30)
        ).count()
        actifs_aujourdhui = Utilisateur.objects.exclude(role='admin').filter(
            last_login__date=now.date()
        ).count()
        return Response({
            'total': total,
            'clients': clients,
            'fournisseurs': fournisseurs,
            'administrateurs': administrateurs,
            'nouveaux_mois': nouveaux_mois,
            'actifs_aujourdhui': actifs_aujourdhui,
        })


class AdminUtilisateurActionView(APIView):
    permission_classes = [IsAdmin]
    def post(self, request, pk):
        from account.models import JournalActivite
        try:
            u = Utilisateur.objects.get(pk=pk)
            action = request.data.get('action')
            ip = request.META.get('REMOTE_ADDR')
            if action == 'activer':
                u.is_active = True
                u.save()
                JournalActivite.objects.create(utilisateur=request.user, categorie='securite', action='modification', description=f"Utilisateur {u.email} activé", ip_address=ip)
            elif action == 'desactiver':
                u.is_active = False
                u.save()
                JournalActivite.objects.create(utilisateur=request.user, categorie='securite', action='suppression', description=f"Utilisateur {u.email} désactivé", ip_address=ip)
            elif action == 'suspendre':
                u.is_active = False
                u.save()
                JournalActivite.objects.create(utilisateur=request.user, categorie='securite', action='suspension', description=f"Utilisateur {u.email} suspendu", ip_address=ip)
            elif action == 'reactiver':
                u.is_active = True
                u.save()
                JournalActivite.objects.create(utilisateur=request.user, categorie='securite', action='modification', description=f"Utilisateur {u.email} réactivé", ip_address=ip)
            elif action == 'reset_password':
                new_pwd = request.data.get('new_password', '')
                if new_pwd:
                    u.set_password(new_pwd)
                    u.save()
                    JournalActivite.objects.create(utilisateur=request.user, categorie='securite', action='modification', description=f"Mot de passe réinitialisé pour {u.email}", ip_address=ip)
            elif action == 'notifier':
                sujet = request.data.get('sujet', '')
                message = request.data.get('message', '')
                JournalActivite.objects.create(utilisateur=request.user, categorie='systeme', action='autre', description=f"Notification envoyée à {u.email}: {sujet}", ip_address=ip)
            elif action == 'supprimer':
                email = u.email
                u.delete()
                JournalActivite.objects.create(utilisateur=request.user, categorie='securite', action='suppression', description=f"Utilisateur {email} supprimé", ip_address=ip)
                return Response({'message': 'Utilisateur supprimé'})
            return Response({'message': f'Action {action} effectuée'})
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=404)


class AdminUtilisateurActiviteView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        from account.models import JournalActivite
        securite = []
        admin = []
        entries = JournalActivite.objects.filter(utilisateur_id=pk).order_by('-date_creation')[:50]
        for e in entries:
            entry = {
                'id': e.id,
                'categorie': e.categorie,
                'action': e.action,
                'description': e.description,
                'date': e.date_creation.isoformat() if e.date_creation else '',
                'ip_address': e.ip_address or '',
            }
            if e.categorie == 'securite':
                securite.append(entry)
            else:
                admin.append(entry)
        return Response({'securite': securite, 'admin': admin})


class AdminUtilisateurNotificationView(APIView):
    permission_classes = [IsAdmin]
    def post(self, request):
        from account.models import JournalActivite
        cible = request.data.get('cible', 'tous')
        sujet = request.data.get('sujet', '')
        message = request.data.get('message', '')
        if not message.strip():
            return Response({'error': 'Message requis'}, status=400)
        qs = Utilisateur.objects.exclude(role='admin')
        if cible == 'clients':
            qs = qs.filter(role='client')
        elif cible == 'fournisseurs':
            qs = qs.filter(role='fournisseur')
        count = 0
        for u in qs:
            JournalActivite.objects.create(
                utilisateur=request.user,
                categorie='systeme',
                action='autre',
                description=f"Notification groupe ({cible}): {sujet} — {u.email}",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            count += 1
        return Response({'message': 'Notification envoyée', 'nombre': count})


class AdminProfileView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        u = request.user
        return Response({
            'id': u.id, 'fullName': f"{u.prenom} {u.nom}", 'email': u.email,
            'role': u.role,
        })
    def put(self, request):
        u = request.user
        if 'fullName' in request.data:
            parts = request.data['fullName'].split(' ', 1)
            u.prenom = parts[0]
            u.nom = parts[1] if len(parts) > 1 else ''
        if 'email' in request.data:
            u.email = request.data['email']
        if 'password' in request.data and request.data['password']:
            u.set_password(request.data['password'])
        u.save()
        return Response({'id': u.id, 'fullName': f"{u.prenom} {u.nom}", 'email': u.email, 'role': u.role})


class FinanceConfigView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        return Response({'commission_rate': 10.00, 'currency': 'FCFA'})
    def put(self, request):
        return Response({'commission_rate': request.data.get('commission_rate', 10.00), 'currency': 'FCFA'})


class PaymentGatewayListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        return Response([
            {'id': 1, 'name': 'Mobile Money', 'is_active': True, 'code': 'mobile_money'},
            {'id': 2, 'name': 'Carte bancaire', 'is_active': False, 'code': 'card'},
            {'id': 3, 'name': 'Espèces', 'is_active': True, 'code': 'cash'},
        ])


class PaymentGatewayToggleView(APIView):
    permission_classes = [IsAdmin]
    def post(self, request, pk):
        return Response({'id': pk, 'is_active': not request.data.get('is_active', True)})


class RolePermissionListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        return Response([
            {'role': 'admin', 'label': 'Administrateur', 'permissions': ['all']},
            {'role': 'fournisseur', 'label': 'Fournisseur', 'permissions': ['products', 'orders', 'stock']},
            {'role': 'client', 'label': 'Client', 'permissions': ['shop', 'orders', 'profile']},
        ])


class ApiConfigView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        return Response({'authMethod': 'JWT', 'databaseRouting': 'default'})


class AdminPaiementListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from payments.models import Paiement
        from orders.models import Commande
        qs = Paiement.objects.all().order_by('-date_paiement')[:100]
        search = request.GET.get('search', '')
        if search:
            qs = qs.filter(reference__icontains=search)
        data = []
        for p in qs:
            commande_ref = ''
            client_nom = ''
            if p.commande_id:
                try:
                    commande_ref = p.commande.reference or f'#{p.commande_id}'
                except Exception:
                    pass
            if p.client_id:
                try:
                    client_nom = f"{p.client.user.nom} {p.client.user.prenom}".strip()
                except Exception:
                    pass
            # Map backend statut to frontend statut
            statut_map = {
                'EN_ATTENTE': 'en_attente',
                'CONFIRME': 'reussi',
                'ECHOUE': 'echoue',
            }
            statut_libelle_map = {
                'en_attente': 'En attente',
                'en_cours': 'En cours',
                'reussi': 'Réussi',
                'echoue': 'Échoué',
                'annule': 'Annulé',
                'remboursement_demande': 'Remboursement demandé',
                'remboursement_en_cours': 'Remboursement en cours',
                'rembourse': 'Remboursé',
                'remboursement_refuse': 'Remboursement refusé',
            }
            moyen_map = {
                'CARTE': 'carte',
                'MOBILE': 'mobile',
                'CASH': 'cash',
            }
            moyen_libelle_map = {
                'carte': 'Carte bancaire',
                'mobile': 'Mobile Money',
                'cash': 'Paiement à la livraison',
            }
            mapped_statut = statut_map.get(p.statut, 'en_attente')
            mapped_moyen = moyen_map.get(p.type, p.type.lower() if p.type else '')
            data.append({
                'id': p.id,
                'reference': p.reference or '',
                'commande': p.commande_id,
                'commande_reference': commande_ref,
                'client': p.client_id,
                'client_nom': client_nom,
                'moyen': mapped_moyen,
                'moyen_libelle': moyen_libelle_map.get(mapped_moyen, p.type or ''),
                'statut': mapped_statut,
                'statut_libelle': statut_libelle_map.get(mapped_statut, mapped_statut),
                'montant': float(p.montant),
                'date_creation': p.date_paiement.isoformat() if p.date_paiement else '',
                'date_mise_a_jour': p.date_paiement.isoformat() if p.date_paiement else '',
                'provider_reference': '',
                'motif_erreur': '',
                'remboursement_motif': '',
                'remboursement_montant': None,
                'metadata': {},
            })
        return Response(data)


class AdminPaiementDetailView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        from payments.models import Paiement
        try:
            p = Paiement.objects.get(pk=pk)
            commande_ref = ''
            client_nom = ''
            if p.commande_id:
                try:
                    commande_ref = p.commande.reference or f'#{p.commande_id}'
                except Exception:
                    pass
            if p.client_id:
                try:
                    client_nom = f"{p.client.user.nom} {p.client.user.prenom}".strip()
                except Exception:
                    pass
            statut_map = {
                'EN_ATTENTE': 'en_attente',
                'CONFIRME': 'reussi',
                'ECHOUE': 'echoue',
            }
            statut_libelle_map = {
                'en_attente': 'En attente', 'en_cours': 'En cours', 'reussi': 'Réussi',
                'echoue': 'Échoué', 'annule': 'Annulé',
                'remboursement_demande': 'Remboursement demandé',
                'remboursement_en_cours': 'Remboursement en cours',
                'rembourse': 'Remboursé', 'remboursement_refuse': 'Remboursement refusé',
            }
            moyen_map = {'CARTE': 'carte', 'MOBILE': 'mobile', 'CASH': 'cash'}
            moyen_libelle_map = {'carte': 'Carte bancaire', 'mobile': 'Mobile Money', 'cash': 'Paiement à la livraison'}
            mapped_statut = statut_map.get(p.statut, 'en_attente')
            mapped_moyen = moyen_map.get(p.type, p.type.lower() if p.type else '')
            return Response({
                'id': p.id,
                'reference': p.reference or '',
                'commande': p.commande_id,
                'commande_reference': commande_ref,
                'client': p.client_id,
                'client_nom': client_nom,
                'moyen': mapped_moyen,
                'moyen_libelle': moyen_libelle_map.get(mapped_moyen, p.type or ''),
                'statut': mapped_statut,
                'statut_libelle': statut_libelle_map.get(mapped_statut, mapped_statut),
                'montant': float(p.montant),
                'date_creation': p.date_paiement.isoformat() if p.date_paiement else '',
                'date_mise_a_jour': p.date_paiement.isoformat() if p.date_paiement else '',
                'provider_reference': '',
                'motif_erreur': '',
                'remboursement_motif': '',
                'remboursement_montant': None,
                'metadata': {},
            })
        except Paiement.DoesNotExist:
            return Response({'error': 'Paiement non trouvé'}, status=404)


class AdminPaiementActionView(APIView):
    permission_classes = [IsAdmin]
    def post(self, request, pk):
        return Response({'message': 'Action effectuée'})


class AdminLivraisonListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from delivery.models import Livraison
        from catalog.models import FournisseurProduit
        statut_map = {
            'PREPAREE': 'en_preparation',
            'EN_COURS': 'en_cours_livraison',
            'LIVREE': 'livree',
            'ANNULEE': 'annulee',
        }
        livraisons = Livraison.objects.all().order_by('-date_creation')[:100]
        data = []
        for l in livraisons:
            # Commande
            commande_data = None
            if l.commande_id:
                try:
                    commande_data = {'id': l.commande_id, 'reference': l.commande.reference or f'#{l.commande_id}'}
                except Exception:
                    commande_data = {'id': l.commande_id, 'reference': ''}
            # Client
            client_data = None
            if l.client_id:
                try:
                    client_data = {
                        'id': l.client_id,
                        'nom': l.client.user.nom or '',
                        'prenom': l.client.user.prenom or '',
                        'email': l.client.user.email or '',
                    }
                except Exception:
                    client_data = {'id': l.client_id, 'nom': '', 'prenom': '', 'email': ''}
            # Magasin / Fournisseur
            magasin_data = None
            fournisseur_data = None
            if l.commande_id:
                try:
                    from orders.models import LigneCommande
                    first_ligne = LigneCommande.objects.filter(commande_id=l.commande_id).select_related('produit').first()
                    if first_ligne and first_ligne.produit_id:
                        fp = FournisseurProduit.objects.select_related('fournisseur').filter(produit_id=first_ligne.produit_id).first()
                        if fp and fp.fournisseur:
                            magasin_data = {'id': fp.fournisseur_id, 'nom_magasin': fp.fournisseur.nom_entreprise or ''}
                            fournisseur_data = {'id': fp.fournisseur_id, 'nom_entreprise': fp.fournisseur.nom_entreprise or ''}
                except Exception:
                    pass
            # Adresse
            adresse_data = None
            if l.adresse_id:
                try:
                    adresse_data = {
                        'nom_destinataire': '',
                        'telephone': '',
                        'ville': l.adresse.ville or '',
                        'quartier': '',
                        'adresse': l.adresse.rue or '',
                        'point_de_repere': '',
                        'instructions': '',
                    }
                except Exception:
                    pass
            # Responsable
            responsable_type = ''
            responsable_nom = None
            if l.livreur_id:
                responsable_type = 'livreur'
                try:
                    responsable_nom = f"{l.livreur.user.nom} {l.livreur.user.prenom}".strip()
                except Exception:
                    responsable_nom = ''
            data.append({
                'id': l.id,
                'commande': commande_data,
                'client': client_data,
                'magasin': magasin_data,
                'fournisseur': fournisseur_data,
                'partenaire': None,
                'adresse': adresse_data,
                'statut': statut_map.get(l.statut, l.statut.lower()),
                'responsable_type': responsable_type,
                'responsable_nom': responsable_nom,
                'mode_tarif': 'fixe',
                'frais_livraison': float(l.frais_livraison or 0),
                'delai_estime': '',
                'date_creation': l.date_creation.isoformat() if l.date_creation else None,
                'date_attribution': None,
                'date_livraison': l.date_livraison.isoformat() if l.date_livraison else None,
                'instructions': l.remarque or '',
            })
        return Response(data)


class AdminLivraisonStatutView(APIView):
    permission_classes = [IsAdmin]
    def patch(self, request, pk):
        from delivery.models import Livraison
        from catalog.models import FournisseurProduit
        statut_reverse_map = {
            'en_attente_attribution': 'PREPAREE',
            'livraison_attribuee': 'PREPAREE',
            'en_preparation': 'PREPAREE',
            'prise_en_charge': 'PREPAREE',
            'en_cours_livraison': 'EN_COURS',
            'livree': 'LIVREE',
            'echec_livraison': 'PREPAREE',
            'annulee': 'ANNULEE',
        }
        statut_map = {
            'PREPAREE': 'en_preparation',
            'EN_COURS': 'en_cours_livraison',
            'LIVREE': 'livree',
            'ANNULEE': 'annulee',
        }
        try:
            l = Livraison.objects.get(pk=pk)
            frontend_statut = request.data.get('statut', '')
            backend_statut = statut_reverse_map.get(frontend_statut, frontend_statut.upper())
            l.statut = backend_statut
            l.save()
            # Return full livraison object
            commande_data = None
            if l.commande_id:
                try:
                    commande_data = {'id': l.commande_id, 'reference': l.commande.reference or f'#{l.commande_id}'}
                except Exception:
                    commande_data = {'id': l.commande_id, 'reference': ''}
            client_data = None
            if l.client_id:
                try:
                    client_data = {'id': l.client_id, 'nom': l.client.user.nom or '', 'prenom': l.client.user.prenom or '', 'email': l.client.user.email or ''}
                except Exception:
                    client_data = {'id': l.client_id, 'nom': '', 'prenom': '', 'email': ''}
            responsable_type = ''
            responsable_nom = None
            if l.livreur_id:
                responsable_type = 'livreur'
                try:
                    responsable_nom = f"{l.livreur.user.nom} {l.livreur.user.prenom}".strip()
                except Exception:
                    responsable_nom = ''
            return Response({
                'id': l.id,
                'commande': commande_data,
                'client': client_data,
                'magasin': None,
                'fournisseur': None,
                'partenaire': None,
                'adresse': None,
                'statut': statut_map.get(l.statut, l.statut.lower()),
                'responsable_type': responsable_type,
                'responsable_nom': responsable_nom,
                'mode_tarif': 'fixe',
                'frais_livraison': float(l.frais_livraison or 0),
                'delai_estime': '',
                'date_creation': l.date_creation.isoformat() if l.date_creation else None,
                'date_attribution': None,
                'date_livraison': l.date_livraison.isoformat() if l.date_livraison else None,
                'instructions': l.remarque or '',
            })
        except Livraison.DoesNotExist:
            return Response({'error': 'Livraison non trouvée'}, status=404)


class AdminAvisListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from support.models import Avis
        from catalog.models import FournisseurProduit
        qs = Avis.objects.all().order_by('-date')[:100]
        statut = request.GET.get('statut')
        if statut == 'visible':
            qs = qs.filter(approuve=True)
        elif statut == 'masque':
            qs = qs.filter(approuve=False)
        note = request.GET.get('note')
        if note and note != 'toutes':
            qs = qs.filter(note=note)
        q = request.GET.get('q', '')
        if q:
            qs = qs.filter(commentaire__icontains=q)
        data = []
        for a in qs:
            client_nom = ''
            client_prenom = ''
            client_email = ''
            client_photo = None
            if a.client_id:
                try:
                    client_nom = a.client.user.nom or ''
                    client_prenom = a.client.user.prenom or ''
                    client_email = a.client.user.email or ''
                except Exception:
                    pass
            produit_nom = ''
            produit_image = None
            if a.produit_id:
                try:
                    produit_nom = a.produit.nom or ''
                    if a.produit.image:
                        produit_image = request.build_absolute_uri(a.produit.image.url)
                except Exception:
                    pass
            magasin_nom = None
            if a.produit_id:
                try:
                    fp = FournisseurProduit.objects.select_related('fournisseur').filter(produit_id=a.produit_id).first()
                    if fp and fp.fournisseur:
                        magasin_nom = fp.fournisseur.nom_entreprise or ''
                except Exception:
                    pass
            commande_reference = None
            if a.commande_id:
                try:
                    commande_reference = a.commande.reference or f'#{a.commande_id}'
                except Exception:
                    pass
            data.append({
                'id': a.id,
                'note': a.note,
                'commentaire': a.commentaire or '',
                'date': a.date.isoformat() if a.date else '',
                'approuve': a.approuve,
                'achat_verifie': a.achat_verifie,
                'client_nom': client_nom,
                'client_prenom': client_prenom,
                'client_email': client_email,
                'client_photo': client_photo,
                'produit_nom': produit_nom,
                'produit_image': produit_image,
                'magasin_nom': magasin_nom,
                'commande_reference': commande_reference,
                'nb_signalements': 0,
                'signale_en_attente': False,
            })
        return Response(data)


class AdminAvisDetailView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        from support.models import Avis
        from catalog.models import FournisseurProduit
        try:
            a = Avis.objects.get(pk=pk)
            client_nom = ''
            client_prenom = ''
            client_email = ''
            client_photo = None
            if a.client_id:
                try:
                    client_nom = a.client.user.nom or ''
                    client_prenom = a.client.user.prenom or ''
                    client_email = a.client.user.email or ''
                except Exception:
                    pass
            produit_nom = ''
            produit_image = None
            if a.produit_id:
                try:
                    produit_nom = a.produit.nom or ''
                    if a.produit.image:
                        produit_image = request.build_absolute_uri(a.produit.image.url)
                except Exception:
                    pass
            magasin_nom = None
            magasin_id = None
            if a.produit_id:
                try:
                    fp = FournisseurProduit.objects.select_related('fournisseur').filter(produit_id=a.produit_id).first()
                    if fp and fp.fournisseur:
                        magasin_nom = fp.fournisseur.nom_entreprise or ''
                        magasin_id = fp.fournisseur_id
                except Exception:
                    pass
            commande_reference = None
            if a.commande_id:
                try:
                    commande_reference = a.commande.reference or f'#{a.commande_id}'
                except Exception:
                    pass
            return Response({
                'id': a.id,
                'note': a.note,
                'commentaire': a.commentaire or '',
                'date': a.date.isoformat() if a.date else '',
                'approuve': a.approuve,
                'achat_verifie': a.achat_verifie,
                'client_nom': client_nom,
                'client_prenom': client_prenom,
                'client_email': client_email,
                'client_photo': client_photo,
                'produit_nom': produit_nom,
                'produit_image': produit_image,
                'magasin_nom': magasin_nom,
                'commande_reference': commande_reference,
                'nb_signalements': 0,
                'signale_en_attente': False,
                'client': a.client_id,
                'produit': a.produit_id,
                'magasin': magasin_id,
                'commande': a.commande_id,
                'note_qualite_produit': a.note_qualite_produit,
                'note_delai': a.note_delai,
                'note_communication': a.note_communication,
                'note_livraison': a.note_livraison,
                'reponse_fournisseur': a.reponse_fournisseur,
                'date_reponse': a.date_reponse.isoformat() if a.date_reponse else None,
                'reponse_fournisseur_nom': a.reponse_fournisseur_nom,
                'photos': a.photos or [],
                'signale': False,
            })
        except Avis.DoesNotExist:
            return Response({'error': 'Avis non trouvé'}, status=404)


class AdminAvisStatsView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from support.models import Avis
        from django.db.models import Avg, Count
        total = Avis.objects.count()
        visibles = Avis.objects.filter(approuve=True).count()
        masques = Avis.objects.filter(approuve=False).count()
        avg = Avis.objects.aggregate(avg=Avg('note'))['avg'] or 0
        achats_verifies = Avis.objects.filter(achat_verifie=True).count()
        par_note = []
        for n in range(1, 6):
            par_note.append({'note': n, 'count': Avis.objects.filter(note=n).count()})
        return Response({
            'total': total,
            'visibles': visibles,
            'masques': masques,
            'signales': 0,
            'signalements_en_attente': 0,
            'note_moyenne': round(float(avg), 2),
            'achats_verifies': achats_verifies,
            'par_note': par_note,
        })


class AdminAvisActionView(APIView):
    permission_classes = [IsAdmin]
    def patch(self, request, pk):
        from support.models import Avis
        from django.utils import timezone
        try:
            a = Avis.objects.get(pk=pk)
            action = request.data.get('action')
            if action == 'approuver':
                a.approuve = True
                a.save()
            elif action == 'masquer':
                a.approuve = False
                a.save()
            elif action == 'supprimer':
                a.delete()
                return Response({'message': 'Avis supprimé'})
            elif action == 'repondre':
                a.reponse_fournisseur = request.data.get('reponse_admin', '')
                a.date_reponse = timezone.now()
                try:
                    a.reponse_fournisseur_nom = f"{request.user.nom} {request.user.prenom}".strip()
                except Exception:
                    pass
                a.save()
            return Response({'message': 'Action effectuée', 'approuve': a.approuve})
        except Avis.DoesNotExist:
            return Response({'error': 'Avis non trouvé'}, status=404)


class AdminReclamationListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from support.models import Reclamation
        qs = Reclamation.objects.all().order_by('-date_soumission')[:100]
        statut = request.GET.get('statut')
        if statut and statut != 'tous':
            qs = qs.filter(statut=statut)
        q = request.GET.get('q', '')
        if q:
            qs = qs.filter(Q(objet__icontains=q) | Q(description__icontains=q))
        statut_labels = {
            'EN_ATTENTE': 'En attente', 'TRAITEE': 'Traitée', 'REJETEE': 'Rejetée',
        }
        data = []
        for r in qs:
            client_nom = ''
            client_prenom = ''
            client_email = ''
            if r.client_id:
                try:
                    client_nom = r.client.user.nom or ''
                    client_prenom = r.client.user.prenom or ''
                    client_email = r.client.user.email or ''
                except Exception:
                    pass
            commande_reference = None
            if r.commande_id:
                try:
                    commande_reference = r.commande.reference or f'#{r.commande_id}'
                except Exception:
                    pass
            data.append({
                'id': r.id,
                'objet': r.objet or '',
                'description': r.description or '',
                'statut': r.statut,
                'statut_label': statut_labels.get(r.statut, r.statut),
                'date_soumission': r.date_soumission.isoformat() if r.date_soumission else '',
                'client_id': r.client_id,
                'client_nom': client_nom,
                'client_prenom': client_prenom,
                'client_email': client_email,
                'commande_id': r.commande_id,
                'commande_reference': commande_reference,
            })
        return Response(data)


class AdminReclamationDetailView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        from support.models import Reclamation
        statut_labels = {
            'EN_ATTENTE': 'En attente', 'TRAITEE': 'Traitée', 'REJETEE': 'Rejetée',
        }
        try:
            r = Reclamation.objects.get(pk=pk)
            client_nom = ''
            client_prenom = ''
            client_email = ''
            if r.client_id:
                try:
                    client_nom = r.client.user.nom or ''
                    client_prenom = r.client.user.prenom or ''
                    client_email = r.client.user.email or ''
                except Exception:
                    pass
            commande_reference = None
            if r.commande_id:
                try:
                    commande_reference = r.commande.reference or f'#{r.commande_id}'
                except Exception:
                    pass
            return Response({
                'id': r.id,
                'objet': r.objet or '',
                'description': r.description or '',
                'statut': r.statut,
                'statut_label': statut_labels.get(r.statut, r.statut),
                'date_soumission': r.date_soumission.isoformat() if r.date_soumission else '',
                'client_id': r.client_id,
                'client_nom': client_nom,
                'client_prenom': client_prenom,
                'client_email': client_email,
                'commande_id': r.commande_id,
                'commande_reference': commande_reference,
            })
        except Reclamation.DoesNotExist:
            return Response({'error': 'Réclamation non trouvée'}, status=404)


class AdminReclamationStatsView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from support.models import Reclamation
        from django.db.models import Count
        total = Reclamation.objects.count()
        return Response({
            'total': total, 'en_attente': Reclamation.objects.filter(statut='EN_ATTENTE').count(),
            'traitees': Reclamation.objects.filter(statut='TRAITEE').count(),
            'rejetees': Reclamation.objects.filter(statut='REJETEE').count(),
        })


class AdminReclamationActionView(APIView):
    permission_classes = [IsAdmin]
    def post(self, request, pk):
        from support.models import Reclamation
        try:
            r = Reclamation.objects.get(pk=pk)
            r.statut = request.data.get('statut', r.statut)
            r.save()
            return Response({'message': 'Action effectuée', 'statut': r.statut})
        except Reclamation.DoesNotExist:
            return Response({'error': 'Réclamation non trouvée'}, status=404)


class AdminReclamationMessageView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        from support.models import MessageSupport, Reclamation
        try:
            r = Reclamation.objects.get(pk=pk)
            msgs = MessageSupport.objects.filter(ticket__isnull=False, client_id=r.client_id).order_by('date_envoi')
            data = []
            for m in msgs:
                data.append({
                    'id': m.id,
                    'contenu': m.contenu or '',
                    'date_envoi': m.date_envoi.isoformat() if m.date_envoi else '',
                    'statut': m.statut,
                    'auteur': 'client' if m.client_id else 'admin',
                })
            return Response(data)
        except Reclamation.DoesNotExist:
            return Response({'error': 'Réclamation non trouvée'}, status=404)
    def post(self, request, pk):
        from support.models import Reclamation, MessageSupport
        try:
            r = Reclamation.objects.get(pk=pk)
            contenu = request.data.get('message', '').strip()
            if not contenu:
                return Response({'error': 'Message requis'}, status=400)
            m = MessageSupport.objects.create(
                objet=f"Re: {r.objet}",
                contenu=contenu,
                statut='ENVOYE',
                client_id=r.client_id,
            )
            return Response({'id': m.id, 'message': 'Message envoyé'})
        except Reclamation.DoesNotExist:
            return Response({'error': 'Réclamation non trouvée'}, status=404)


class AdminReclamationAttachmentView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        return Response([])


class AdminReclamationHistoriqueView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        from support.models import Reclamation
        try:
            r = Reclamation.objects.get(pk=pk)
            statut_labels = {
                'EN_ATTENTE': 'En attente', 'TRAITEE': 'Traitée', 'REJETEE': 'Rejetée',
            }
            return Response([{
                'id': 1,
                'statut': r.statut,
                'statut_label': statut_labels.get(r.statut, r.statut),
                'commentaire': 'Réclamation soumise',
                'utilisateur': 'Système',
                'date': r.date_soumission.isoformat() if r.date_soumission else '',
            }])
        except Reclamation.DoesNotExist:
            return Response({'error': 'Réclamation non trouvée'}, status=404)


class AdminPartenariatListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from support.models import DemandePartenariat
        from django.utils import timezone
        qs = DemandePartenariat.objects.all().order_by('-date_soumission')
        statut = request.GET.get('statut')
        if statut and statut != 'tous':
            qs = qs.filter(statut=statut)
        search = request.GET.get('search', '')
        if search:
            qs = qs.filter(
                Q(nom_entreprise__icontains=search) |
                Q(marque__icontains=search) |
                Q(email_contact__icontains=search)
            )
        statut_labels = {
            'nouvelle': 'Nouvelle', 'en_cours': 'En cours',
            'acceptee': 'Acceptée', 'rejetee': 'Rejetée',
        }
        data = []
        for d in qs:
            traitee_par_nom = None
            if d.traitee_par_id:
                try:
                    traitee_par_nom = f"{d.traitee_par.nom} {d.traitee_par.prenom}".strip()
                except Exception:
                    pass
            data.append({
                'id': d.id,
                'nom_entreprise': d.nom_entreprise,
                'marque': d.marque or '',
                'email_contact': d.email_contact,
                'telephone': d.telephone or '',
                'message': d.message or '',
                'statut': d.statut,
                'statut_label': statut_labels.get(d.statut, d.statut),
                'reponse_admin': d.reponse_admin or '',
                'date_soumission': d.date_soumission.isoformat() if d.date_soumission else None,
                'date_traitement': d.date_traitement.isoformat() if d.date_traitement else None,
                'traitee_par': d.traitee_par_id,
                'traitee_par_nom': traitee_par_nom,
            })
        return Response(data)


class AdminPartenariatDetailView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        from support.models import DemandePartenariat
        statut_labels = {
            'nouvelle': 'Nouvelle', 'en_cours': 'En cours',
            'acceptee': 'Acceptée', 'rejetee': 'Rejetée',
        }
        try:
            d = DemandePartenariat.objects.get(pk=pk)
            traitee_par_nom = None
            if d.traitee_par_id:
                try:
                    traitee_par_nom = f"{d.traitee_par.nom} {d.traitee_par.prenom}".strip()
                except Exception:
                    pass
            return Response({
                'id': d.id,
                'nom_entreprise': d.nom_entreprise,
                'marque': d.marque or '',
                'email_contact': d.email_contact,
                'telephone': d.telephone or '',
                'message': d.message or '',
                'statut': d.statut,
                'statut_label': statut_labels.get(d.statut, d.statut),
                'reponse_admin': d.reponse_admin or '',
                'date_soumission': d.date_soumission.isoformat() if d.date_soumission else None,
                'date_traitement': d.date_traitement.isoformat() if d.date_traitement else None,
                'traitee_par': d.traitee_par_id,
                'traitee_par_nom': traitee_par_nom,
            })
        except DemandePartenariat.DoesNotExist:
            return Response({'error': 'Partenariat non trouvé'}, status=404)


class AdminPartenariatStatsView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from support.models import DemandePartenariat
        total = DemandePartenariat.objects.count()
        return Response({
            'total': total,
            'nouvelles': DemandePartenariat.objects.filter(statut='nouvelle').count(),
            'en_cours': DemandePartenariat.objects.filter(statut='en_cours').count(),
            'acceptees': DemandePartenariat.objects.filter(statut='acceptee').count(),
            'rejetees': DemandePartenariat.objects.filter(statut='rejetee').count(),
        })


class AdminPartenariatActionView(APIView):
    permission_classes = [IsAdmin]
    def patch(self, request, pk):
        from support.models import DemandePartenariat
        from django.utils import timezone
        try:
            d = DemandePartenariat.objects.get(pk=pk)
            action = request.data.get('action')
            if action == 'changer_statut':
                d.statut = request.data.get('statut', d.statut)
                d.date_traitement = timezone.now()
                d.traitee_par = request.user
                d.save()
            elif action == 'repondre':
                d.reponse_admin = request.data.get('reponse_admin', '')
                if d.statut == 'nouvelle':
                    d.statut = 'en_cours'
                d.date_traitement = timezone.now()
                d.traitee_par = request.user
                d.save()
            elif action == 'supprimer':
                d.delete()
                return Response({'message': 'Demande supprimée'})
            return Response({'message': 'Action effectuée', 'statut': d.statut})
        except DemandePartenariat.DoesNotExist:
            return Response({'error': 'Partenariat non trouvé'}, status=404)


class AdminMessageListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from support.models import MessageSupport
        qs = MessageSupport.objects.all().order_by('-date_envoi')[:100]
        statut = request.GET.get('statut')
        if statut and statut != 'tous':
            qs = qs.filter(statut=statut)
        search = request.GET.get('search', '')
        if search:
            qs = qs.filter(
                Q(objet__icontains=search) |
                Q(contenu__icontains=search)
            )
        statut_labels = {'ENVOYE': 'Envoyé', 'LU': 'Lu'}
        data = []
        for m in qs:
            client_nom = None
            client_prenom = None
            client_email = None
            client_photo = None
            if m.client_id:
                try:
                    client_nom = m.client.user.nom or None
                    client_prenom = m.client.user.prenom or None
                    client_email = m.client.user.email or None
                except Exception:
                    pass
            data.append({
                'id': m.id,
                'objet': m.objet or '',
                'contenu': m.contenu or '',
                'date_envoi': m.date_envoi.isoformat() if m.date_envoi else '',
                'statut': m.statut,
                'statut_label': statut_labels.get(m.statut, m.statut),
                'client': m.client_id,
                'client_nom': client_nom,
                'client_prenom': client_prenom,
                'client_email': client_email,
                'client_photo': client_photo,
                'ticket': m.ticket_id,
            })
        return Response(data)


class AdminMessageDetailView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        from support.models import MessageSupport
        statut_labels = {'ENVOYE': 'Envoyé', 'LU': 'Lu'}
        try:
            m = MessageSupport.objects.get(pk=pk)
            client_nom = None
            client_prenom = None
            client_email = None
            client_photo = None
            if m.client_id:
                try:
                    client_nom = m.client.user.nom or None
                    client_prenom = m.client.user.prenom or None
                    client_email = m.client.user.email or None
                except Exception:
                    pass
            return Response({
                'id': m.id,
                'objet': m.objet or '',
                'contenu': m.contenu or '',
                'date_envoi': m.date_envoi.isoformat() if m.date_envoi else '',
                'statut': m.statut,
                'statut_label': statut_labels.get(m.statut, m.statut),
                'client': m.client_id,
                'client_nom': client_nom,
                'client_prenom': client_prenom,
                'client_email': client_email,
                'client_photo': client_photo,
                'ticket': m.ticket_id,
            })
        except MessageSupport.DoesNotExist:
            return Response({'error': 'Message non trouvé'}, status=404)


class AdminMessageStatsView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from support.models import MessageSupport
        total = MessageSupport.objects.count()
        return Response({
            'total': total,
            'non_lus': MessageSupport.objects.filter(statut='ENVOYE').count(),
            'lus': MessageSupport.objects.filter(statut='LU').count(),
        })


class AdminMessageActionView(APIView):
    permission_classes = [IsAdmin]
    def patch(self, request, pk):
        from support.models import MessageSupport
        try:
            m = MessageSupport.objects.get(pk=pk)
            action = request.data.get('action')
            if action == 'marquer_lu':
                m.statut = 'LU'
                m.save()
            elif action == 'marquer_non_lu':
                m.statut = 'ENVOYE'
                m.save()
            return Response({'message': 'Action effectuée', 'statut': m.statut})
        except MessageSupport.DoesNotExist:
            return Response({'error': 'Message non trouvé'}, status=404)
    def delete(self, request, pk):
        from support.models import MessageSupport
        try:
            m = MessageSupport.objects.get(pk=pk)
            m.delete()
            return Response({'message': 'Message supprimé'})
        except MessageSupport.DoesNotExist:
            return Response({'error': 'Message non trouvé'}, status=404)


class AdminProduitEnAttenteListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from catalog.models import Produit
        statut = request.GET.get('statut_approbation', 'en_attente')
        if statut == 'tous':
            produits = Produit.objects.all()
        else:
            produits = Produit.objects.none()
        data = []
        for p in produits:
            data.append({
                'id': p.id, 'nom': p.nom, 'description': p.description,
                'prix': float(p.prix), 'stock': p.stock,
                'image': request.build_absolute_uri(p.image.url) if p.image and request else None,
                'reference': getattr(p, 'reference', ''),
                'marque': getattr(p, 'marque', ''),
                'statut_approbation': 'approuve',
            })
        return Response(data)


class AdminProduitApprobationView(APIView):
    permission_classes = [IsAdmin]
    def patch(self, request, pk):
        from catalog.models import Produit
        try:
            p = Produit.objects.get(pk=pk)
            statut = request.data.get('statut', 'approuve')
            if statut == 'approuve':
                p.is_active = True
            elif statut == 'rejete':
                p.is_active = False
            p.save()
            return Response({'id': p.id, 'statut_approbation': statut})
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


class AdminCommandeExportView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from orders.models import Commande
        from django.http import HttpResponse
        import csv
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="commandes.csv"'
        writer = csv.writer(response)
        writer.writerow(['Reference', 'Client', 'Statut', 'Montant', 'Date'])
        for c in Commande.objects.all().order_by('-date_commande'):
            client = ''
            if c.client_id:
                try:
                    client = f"{c.client.user.nom} {c.client.user.prenom}"
                except Exception:
                    pass
            writer.writerow([c.reference, client, c.statut, float(c.montant_total), c.date_commande.isoformat()])
        return response


class AdminFournisseurMagasinView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, user_id):
        try:
            profile = FournisseurProfile.objects.get(user_id=user_id)
            return Response({
                'nom_magasin': profile.nom_entreprise or '',
                'logo': profile.logo.url if profile.logo else None,
                'photo_couverture': None,
                'description': profile.description or '',
                'telephone': getattr(profile.user, 'telephone', '') or '',
                'whatsapp': '',
                'email': profile.user.email or '',
                'adresse_complete': getattr(profile.user, 'adresse', '') or '',
                'ville': '',
                'region': '',
                'livraison_disponible': False,
                'retrait_magasin': False,
            })
        except FournisseurProfile.DoesNotExist:
            return Response({
                'nom_magasin': '', 'logo': None, 'description': '', 'telephone': '',
                'whatsapp': '', 'email': '', 'adresse_complete': '', 'ville': '',
                'region': '', 'livraison_disponible': False, 'retrait_magasin': False
            })
    def put(self, request, user_id):
        try:
            profile = FournisseurProfile.objects.get(user_id=user_id)
            if 'nom_magasin' in request.data:
                profile.nom_entreprise = request.data['nom_magasin']
            if 'description' in request.data:
                profile.description = request.data['description']
            profile.save()
            return Response({'message': 'Magasin mis à jour'})
        except FournisseurProfile.DoesNotExist:
            return Response({'error': 'Fournisseur non trouvé'}, status=404)


class AdminAnalyticsView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from orders.models import Commande, LigneCommande
        from account.models import Utilisateur
        from catalog.models import Produit, Categorie
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Sum, Count

        now = timezone.now()
        start_date = now - timedelta(days=30)

        # Evolution ventes (last 30 days, grouped by day)
        evolution_ventes = []
        ventes_par_jour = Commande.objects.filter(
            date_commande__gte=start_date
        ).extra(
            select={'day': 'date(date_commande)'}
        ).values('day').annotate(total=Sum('montant_total')).order_by('day')
        for v in ventes_par_jour:
            evolution_ventes.append({
                'date': str(v['day']),
                'montant': float(v['total'] or 0),
            })

        # Evolution commandes (last 30 days, grouped by day)
        evolution_commandes = []
        cmd_par_jour = Commande.objects.filter(
            date_commande__gte=start_date
        ).extra(
            select={'day': 'date(date_commande)'}
        ).values('day').annotate(count=Count('id')).order_by('day')
        for c in cmd_par_jour:
            evolution_commandes.append({
                'date': str(c['day']),
                'count': c['count'],
            })

        # Top produits (by sales count)
        top_produits_raw = LigneCommande.objects.values(
            'produit_id'
        ).annotate(
            total_qty=Sum('quantite'),
            total_ca=Sum('sous_total')
        ).order_by('-total_qty')[:10]
        top_produits = []
        for tp in top_produits_raw:
            nom = ''
            if tp['produit_id']:
                try:
                    nom = Produit.objects.get(pk=tp['produit_id']).nom
                except Exception:
                    pass
            top_produits.append({
                'id': tp['produit_id'] or 0,
                'nom': nom,
                'quantite': tp['total_qty'] or 0,
                'ca': float(tp['total_ca'] or 0),
            })

        # Top categories (by sales count)
        top_categories_raw = LigneCommande.objects.values(
            'produit__categorie__nom'
        ).annotate(
            total_qty=Sum('quantite'),
            total_ca=Sum('sous_total')
        ).order_by('-total_qty')[:10]
        top_categories = []
        for tc in top_categories_raw:
            top_categories.append({
                'nom': tc['produit__categorie__nom'] or 'N/A',
                'quantite': tc['total_qty'] or 0,
                'ca': float(tc['total_ca'] or 0),
            })

        return Response({
            'kpis': {
                'ventes_total': float(Commande.objects.aggregate(total=Sum('montant_total'))['total'] or 0),
                'commandes_total': Commande.objects.count(),
                'utilisateurs_total': Utilisateur.objects.exclude(role='admin').count(),
                'produits_total': Produit.objects.count(),
            },
            'evolution_ventes': evolution_ventes,
            'evolution_commandes': evolution_commandes,
            'top_produits': top_produits,
            'top_categories': top_categories,
        })


class AdminAnalyticsFiltersView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from catalog.models import Categorie
        return Response({
            'categories': [{'id': c.id, 'nom': c.nom} for c in Categorie.objects.all()],
            'periodes': ['today', 'week', 'month', 'year', 'all'],
        })


class AdminAnalyticsExportView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from django.http import HttpResponse
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="analytics.csv"'
        return response


class DemandePartenariatCreateView(APIView):
    permission_classes = []
    def post(self, request):
        from support.models import DemandePartenariat
        nom_entreprise = request.data.get('nom_entreprise', '').strip()
        email_contact = request.data.get('email_contact', '').strip()
        message = request.data.get('message', '').strip()
        if not nom_entreprise or not email_contact or not message:
            return Response({'error': 'nom_entreprise, email_contact et message sont requis'}, status=400)
        d = DemandePartenariat.objects.create(
            nom_entreprise=nom_entreprise,
            marque=request.data.get('marque', ''),
            email_contact=email_contact,
            telephone=request.data.get('telephone', ''),
            message=message,
        )
        return Response({'id': d.id, 'message': 'Demande de partenariat envoyée avec succès'}, status=201)


class AdminJournalDeleteView(APIView):
    permission_classes = [IsAdmin]
    def delete(self, request):
        from account.models import JournalActivite
        JournalActivite.objects.all().delete()
        return Response({'message': 'Journal vidé'})


# -----------------------------
# Gestion des commandes admin
# -----------------------------

class AdminCommandeListView(APIView):
    permission_classes = [IsAdmin]
    STATUT_MAP = {
        'en_attente': 'nouvelle_commande',
        'validee': 'acceptee',
        'expediee': 'en_cours_livraison',
        'livree': 'livree',
        'annulee': 'annulee',
    }
    STATUT_REVERSE_MAP = {
        'nouvelle_commande': 'en_attente',
        'en_attente_confirmation': 'en_attente',
        'acceptee': 'validee',
        'en_preparation': 'validee',
        'prete_a_retirer': 'validee',
        'en_cours_livraison': 'expediee',
        'livree': 'livree',
        'terminee': 'livree',
        'refusee': 'annulee',
        'annulee': 'annulee',
    }
    def get(self, request):
        from orders.models import Commande, LigneCommande
        from django.utils import timezone
        from datetime import timedelta
        qs = Commande.objects.all().order_by('-date_commande')
        # Statut filter (frontend sends frontend statut values)
        statut = request.GET.get('statut')
        if statut and statut != 'tous':
            backend_statut = self.STATUT_REVERSE_MAP.get(statut, statut)
            qs = qs.filter(statut=backend_statut)
        q = request.GET.get('q')
        if q:
            qs = qs.filter(reference__icontains=q)
        # Periode filter
        periode = request.GET.get('periode')
        now = timezone.now()
        if periode == 'today':
            qs = qs.filter(date_commande__date=now.date())
        elif periode == 'week':
            qs = qs.filter(date_commande__gte=now - timedelta(days=7))
        elif periode == 'month':
            qs = qs.filter(date_commande__gte=now - timedelta(days=30))
        elif periode == 'livrees':
            qs = qs.filter(statut='livree')
        elif periode == 'preparation':
            qs = qs.filter(statut__in=['en_attente', 'validee'])
        elif periode == 'annulees':
            qs = qs.filter(statut='annulee')
        # Magasin filter
        magasin = request.GET.get('magasin')
        if magasin:
            from catalog.models import FournisseurProduit
            produit_ids = FournisseurProduit.objects.filter(
                fournisseur__nom_entreprise__icontains=magasin
            ).values_list('produit_id', flat=True)
            qs = qs.filter(lignecommande__produit_id__in=produit_ids).distinct()
        # Client filter
        client = request.GET.get('client')
        if client:
            qs = qs.filter(
                Q(client__user__nom__icontains=client) |
                Q(client__user__prenom__icontains=client) |
                Q(client__user__email__icontains=client)
            )
        data = []
        for c in qs[:100]:
            lignes = LigneCommande.objects.filter(commande=c)
            magasins = list(set(
                lp.produit.fournisseurproduit_set.first().fournisseur.nom_entreprise
                for lp in lignes
                if lp.produit_id and lp.produit.fournisseurproduit_set.exists()
            )) if lignes.exists() else []
            client_nom = ''
            client_prenom = ''
            client_email = ''
            client_telephone = ''
            client_adresse = ''
            if c.client_id:
                try:
                    cl = c.client
                    client_nom = cl.user.nom if cl.user else ''
                    client_prenom = cl.user.prenom if cl.user else ''
                    client_email = cl.user.email if cl.user else ''
                    client_telephone = getattr(cl.user, 'telephone', '')
                    client_adresse = getattr(cl.user, 'adresse', '')
                except Exception:
                    pass
            # Build alertes
            alertes = []
            mapped_statut = self.STATUT_MAP.get(c.statut, c.statut)
            if c.statut == 'en_attente':
                alertes.append({'id': f'alert-{c.id}', 'type': 'paiement', 'label': 'Paiement en attente', 'severity': 'medium', 'commande_id': c.id, 'reference': c.reference, 'client': f"{client_prenom} {client_nom}".strip()})
            if c.statut == 'annulee':
                alertes.append({'id': f'alert-{c.id}', 'type': 'annulee', 'label': 'Commande annulée', 'severity': 'high', 'commande_id': c.id, 'reference': c.reference, 'client': f"{client_prenom} {client_nom}".strip()})
            data.append({
                'id': c.id,
                'reference': c.reference or f'#{c.id}',
                'date_commande': c.date_commande.isoformat() if c.date_commande else '',
                'statut': mapped_statut,
                'montant_total': float(c.montant_total or 0),
                'frais_livraison': 0,
                'mode_paiement': '',
                'mode_reception': '',
                'client': {
                    'id': c.client_id or 0,
                    'nom': client_nom,
                    'prenom': client_prenom,
                    'email': client_email,
                    'telephone': client_telephone,
                    'adresse': client_adresse,
                },
                'magasins': magasins,
                'nombre_produits': lignes.count(),
                'alertes': alertes,
            })
        return Response(data)


class AdminCommandeDetailView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        from orders.models import Commande, LigneCommande
        try:
            c = Commande.objects.get(pk=pk)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande non trouvée'}, status=404)
        lignes = LigneCommande.objects.filter(commande=c)
        lignes_data = []
        for l in lignes:
            produit_data = {'id': l.produit_id or 0, 'nom': l.produit.nom if l.produit_id else '', 'image': None}
            magasin_data = None
            if l.produit_id:
                try:
                    img = l.produit.image
                    if img:
                        produit_data['image'] = request.build_absolute_uri(img.url)
                except Exception:
                    pass
                try:
                    fp = FournisseurProduit.objects.select_related('fournisseur').filter(produit_id=l.produit_id).first()
                    if fp and fp.fournisseur:
                        magasin_data = {
                            'id': fp.fournisseur_id,
                            'nom': fp.fournisseur.nom_entreprise or '',
                            'fournisseur': fp.fournisseur.nom_entreprise or '',
                        }
                except Exception:
                    pass
            lignes_data.append({
                'id': l.id,
                'produit': produit_data,
                'quantite': l.quantite,
                'prix_unitaire': float(l.prix_unitaire),
                'sous_total': float(l.sous_total or 0),
                'magasin': magasin_data,
            })
        client_nom = ''
        client_prenom = ''
        client_email = ''
        client_telephone = ''
        client_adresse = ''
        if c.client_id:
            try:
                cl = c.client
                client_nom = cl.user.nom if cl.user else ''
                client_prenom = cl.user.prenom if cl.user else ''
                client_email = cl.user.email if cl.user else ''
                client_telephone = getattr(cl.user, 'telephone', '')
                client_adresse = getattr(cl.user, 'adresse', '')
            except Exception:
                pass
        # Livraison
        livraison_data = None
        try:
            from delivery.models import Livraison
            liv = Livraison.objects.filter(commande=c).first()
            if liv:
                livreur_nom = ''
                if liv.livreur_id:
                    try:
                        livreur_nom = f"{liv.livreur.user.nom} {liv.livreur.user.prenom}"
                    except Exception:
                        pass
                livraison_data = {
                    'id': liv.id,
                    'statut': liv.statut,
                    'date_livraison': liv.date_livraison.isoformat() if liv.date_livraison else None,
                    'frais_livraison': float(liv.frais_livraison or 0),
                    'remarque': liv.remarque or '',
                    'livreur': livreur_nom,
                }
        except Exception:
            pass
        # Reclamations
        reclamations_data = []
        try:
            from support.models import Reclamation
            for r in Reclamation.objects.filter(client_id=c.client_id).order_by('-date_soumission')[:5]:
                reclamations_data.append({
                    'id': r.id,
                    'objet': r.objet or '',
                    'statut': r.statut,
                    'date': r.date_soumission.isoformat() if r.date_soumission else '',
                })
        except Exception:
            pass
        # Historique
        historique_data = [{
            'id': 1,
            'statut': c.statut,
            'statut_label': c.get_statut_display() if hasattr(c, 'get_statut_display') else c.statut,
            'commentaire': 'Commande créée',
            'utilisateur': 'Système',
            'date': c.date_commande.isoformat() if c.date_commande else '',
        }]
        # Magasins
        magasins_list = []
        for l in lignes:
            if l.produit_id:
                try:
                    fp = FournisseurProduit.objects.select_related('fournisseur').filter(produit_id=l.produit_id).first()
                    if fp and fp.fournisseur and fp.fournisseur.nom_entreprise:
                        nom = fp.fournisseur.nom_entreprise
                        if nom not in magasins_list:
                            magasins_list.append(nom)
                except Exception:
                    pass
        return Response({
            'id': c.id,
            'reference': c.reference or f'#{c.id}',
            'date_commande': c.date_commande.isoformat() if c.date_commande else '',
            'statut': AdminCommandeListView.STATUT_MAP.get(c.statut, c.statut),
            'montant_total': float(c.montant_total or 0),
            'frais_livraison': 0,
            'mode_paiement': '',
            'mode_reception': '',
            'client': {
                'id': c.client_id or 0,
                'nom': client_nom,
                'prenom': client_prenom,
                'email': client_email,
                'telephone': client_telephone,
                'adresse': client_adresse,
            },
            'magasins': magasins_list,
            'nombre_produits': lignes.count(),
            'alertes': [],
            'lignes': lignes_data,
            'historique': historique_data,
            'livraison': livraison_data,
            'reclamations': reclamations_data,
        })


class AdminCommandeStatsView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from orders.models import Commande
        from django.utils import timezone
        from datetime import timedelta
        total = Commande.objects.count()
        aujourdhui = Commande.objects.filter(date_commande__date=timezone.now().date()).count()
        terminees = Commande.objects.filter(statut='livree').count()
        annulees = Commande.objects.filter(statut='annulee').count()
        en_preparation = Commande.objects.filter(statut__in=['en_attente', 'validee', 'expediee']).count()
        montant_total = float(Commande.objects.aggregate(total=Sum('montant_total'))['total'] or 0)
        now = timezone.now()
        montant_jour = float(Commande.objects.filter(date_commande__date=now.date()).aggregate(t=Sum('montant_total'))['t'] or 0)
        montant_semaine = float(Commande.objects.filter(date_commande__gte=now - timedelta(days=7)).aggregate(t=Sum('montant_total'))['t'] or 0)
        montant_mois = float(Commande.objects.filter(date_commande__gte=now - timedelta(days=30)).aggregate(t=Sum('montant_total'))['t'] or 0)
        return Response({
            'total': total,
            'aujourdhui': aujourdhui,
            'terminees': terminees,
            'annulees': annulees,
            'en_preparation': en_preparation,
            'montant_total': montant_total,
            'panier_moyen': montant_total / total if total else 0,
            'temps_moyen_heures': 0,
            'montant_jour': montant_jour,
            'montant_semaine': montant_semaine,
            'montant_mois': montant_mois,
        })


class AdminCommandeAlertsView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from orders.models import Commande, LigneCommande
        alertes = []
        qs = Commande.objects.all().order_by('-date_commande')[:200]
        for c in qs:
            client_name = ''
            if c.client_id:
                try:
                    client_name = f"{c.client.user.prenom} {c.client.user.nom}".strip()
                except Exception:
                    pass
            if c.statut == 'en_attente':
                alertes.append({
                    'id': f'alert-{c.id}',
                    'type': 'paiement',
                    'label': 'Paiement en attente',
                    'severity': 'medium',
                    'commande_id': c.id,
                    'reference': c.reference or f'#{c.id}',
                    'client': client_name,
                    'montant': float(c.montant_total or 0),
                })
            elif c.statut == 'annulee':
                alertes.append({
                    'id': f'alert-{c.id}',
                    'type': 'annulee',
                    'label': 'Commande annulée',
                    'severity': 'high',
                    'commande_id': c.id,
                    'reference': c.reference or f'#{c.id}',
                    'client': client_name,
                    'montant': float(c.montant_total or 0),
                })
        return Response(alertes)


class AdminCommandeActionView(APIView):
    permission_classes = [IsAdmin]
    def post(self, request, pk):
        from orders.models import Commande
        try:
            c = Commande.objects.get(pk=pk)
            action = request.data.get('action')
            statut_map = {
                'accepter': 'validee', 'preparer': 'validee',
                'prete': 'validee', 'expedier': 'expediee',
                'livrer': 'livree', 'terminer': 'livree',
                'annuler': 'annulee', 'refuser': 'annulee',
            }
            if action in statut_map:
                c.statut = statut_map[action]
                c.save()
            return Response({'message': f'Action {action} effectuée'})
        except Commande.DoesNotExist:
            return Response({'error': 'Commande non trouvée'}, status=404)


# -----------------------------
# Gestion des produits admin
# -----------------------------

class AdminProduitListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        from catalog.models import Produit
        produits = Produit.objects.all().order_by('-id')
        data = []
        for p in produits:
            data.append({
                'id': p.id, 'nom': p.nom, 'description': p.description,
                'prix': float(p.prix), 'stock': p.stock,
                'image': request.build_absolute_uri(p.image.url) if p.image else None,
                'categorie': p.categorie_id,
                'categorie_nom': p.categorie.nom if p.categorie else '',
                'reference': getattr(p, 'reference', ''),
                'marque': getattr(p, 'marque', ''),
                'is_active': p.is_active,
                'statut_approbation': 'approuve' if p.is_active else 'en_attente',
            })
        return Response(data)


class AdminProduitDetailView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        from catalog.models import Produit
        try:
            p = Produit.objects.get(pk=pk)
            return Response({
                'id': p.id, 'nom': p.nom, 'description': p.description,
                'prix': float(p.prix), 'stock': p.stock,
                'image': request.build_absolute_uri(p.image.url) if p.image else None,
                'categorie': p.categorie_id,
                'categorie_nom': p.categorie.nom if p.categorie else '',
                'reference': getattr(p, 'reference', ''),
                'marque': getattr(p, 'marque', ''),
                'is_active': p.is_active,
                'statut_approbation': 'approuve' if p.is_active else 'en_attente',
            })
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)


class AdminProduitDeleteView(APIView):
    permission_classes = [IsAdmin]
    def delete(self, request, pk):
        from catalog.models import Produit
        try:
            p = Produit.objects.get(pk=pk)
            p.delete()
            return Response({'message': 'Produit supprimé'})
        except Produit.DoesNotExist:
            return Response({'error': 'Produit non trouvé'}, status=404)
