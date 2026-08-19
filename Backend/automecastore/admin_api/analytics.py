"""
Centre d'analyse / Business Intelligence pour l'admin AutoMecaStore.
Fournit un endpoint consolidé de statistiques, tendances, tops et alertes.
"""
from datetime import date, datetime, timedelta
from calendar import monthrange
from collections import defaultdict

from django.db.models import Sum, Count, Avg, F, Q, FloatField, Max
from django.db.models.functions import TruncDate, TruncMonth, TruncYear, Coalesce
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from account.permissions import IsAdmin
from account.models import Utilisateur, Client, Fournisseur, Administrateur
from catalog.models import Produit, Categorie
from fournisseur.models import Magasin
from orders.models import Commande, LigneCommande
from support.models import Avis, Reclamation


class AdminAnalyticsView(APIView):
    """Endpoint consolidé d'analytics pour le tableau de bord admin."""
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            params = self._parse_params(request.query_params)
            data = self._build_response(request, params)
            return Response(data)
        except ValidationError as e:
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            return Response({'error': f'Erreur analytics: {str(e)}'}, status=500)

    def _parse_params(self, qps):
        period = qps.get('period', 'month')
        if period not in ('today', 'week', 'month', 'year', 'all', 'custom'):
            period = 'month'

        start = qps.get('start')
        end = qps.get('end')

        magasin_id = qps.get('magasin_id') or None
        categorie_id = qps.get('categorie_id') or None
        ville = qps.get('ville') or None

        return {
            'period': period,
            'start': start,
            'end': end,
            'magasin_id': int(magasin_id) if magasin_id and magasin_id.isdigit() else None,
            'categorie_id': int(categorie_id) if categorie_id and categorie_id.isdigit() else None,
            'ville': ville.strip() if ville else None,
        }

    def _get_bounds(self, params):
        now = timezone.now()
        today = now.date()

        if params['period'] == 'custom' and params['start'] and params['end']:
            try:
                s = datetime.fromisoformat(params['start'])
                e = datetime.fromisoformat(params['end'])
                start = timezone.make_aware(s) if timezone.is_naive(s) else s
                end = timezone.make_aware(e) if timezone.is_naive(e) else e
                return start, end, today
            except ValueError:
                pass

        if params['period'] == 'today':
            start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
            end = now
        elif params['period'] == 'week':
            start = now - timedelta(days=7)
            end = now
        elif params['period'] == 'month':
            start = timezone.make_aware(datetime(today.year, today.month, 1, 0, 0, 0))
            end = now
        elif params['period'] == 'year':
            start = timezone.make_aware(datetime(today.year, 1, 1, 0, 0, 0))
            end = now
        else:  # all
            start = timezone.make_aware(datetime(2020, 1, 1, 0, 0, 0))
            end = now

        return start, end, today

    def _apply_filters(self, qs, params, model_path=''):
        if params.get('magasin_id'):
            qs = qs.filter(**{f"{model_path}produit__fournisseur__magasin__id": params['magasin_id']})
        if params.get('categorie_id'):
            qs = qs.filter(**{f"{model_path}produit__categorie__id": params['categorie_id']})
        if params.get('ville'):
            qs = qs.filter(**{f"{model_path}produit__fournisseur__magasin__ville__iexact": params['ville']})
        return qs

    def _build_response(self, request, params):
        start, end, today = self._get_bounds(params)
        prev_start = start - (end - start)

        commandes_qs = Commande.objects.filter(date_commande__gte=start, date_commande__lte=end)
        commandes_qs = self._apply_filters(commandes_qs, params, model_path='lignes__').distinct()

        commandes_prev_qs = Commande.objects.filter(date_commande__gte=prev_start, date_commande__lt=start)
        commandes_prev_qs = self._apply_filters(commandes_prev_qs, params, model_path='lignes__').distinct()

        lignes_qs = LigneCommande.objects.filter(commande__date_commande__gte=start, commande__date_commande__lte=end)
        lignes_qs = self._apply_filters(lignes_qs, params)

        lignes_prev_qs = LigneCommande.objects.filter(commande__date_commande__gte=prev_start, commande__date_commande__lt=start)
        lignes_prev_qs = self._apply_filters(lignes_prev_qs, params)

        # --- KPIs ---
        ca_total = float(lignes_qs.aggregate(t=Coalesce(Sum('sous_total'), 0, output_field=FloatField()))['t'] or 0)
        ca_prev = float(lignes_prev_qs.aggregate(t=Coalesce(Sum('sous_total'), 0, output_field=FloatField()))['t'] or 0)

        total_commandes = commandes_qs.count()
        commandes_terminees = commandes_qs.filter(statut='terminee').count()
        commandes_annulees = commandes_qs.filter(statut='annulee').count()

        total_clients = Client.objects.count()
        total_fournisseurs = Fournisseur.objects.count()
        total_produits = Produit.objects.count()

        taux_satisfaction_qs = Avis.objects.all()
        taux_satisfaction = float(taux_satisfaction_qs.aggregate(m=Avg('note'))['m'] or 0)

        panier_moyen = round(ca_total / total_commandes, 2) if total_commandes else 0
        taux_annulation = round((commandes_annulees / total_commandes) * 100, 2) if total_commandes else 0

        # CA jour / mois / année (filtré)
        day_start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        ca_jour = float(lignes_qs.filter(commande__date_commande__gte=day_start).aggregate(t=Sum('sous_total'))['t'] or 0)

        month_start = timezone.make_aware(datetime(today.year, today.month, 1, 0, 0, 0))
        ca_mois = float(lignes_qs.filter(commande__date_commande__gte=month_start).aggregate(t=Sum('sous_total'))['t'] or 0)

        year_start = timezone.make_aware(datetime(today.year, 1, 1, 0, 0, 0))
        ca_annee = float(lignes_qs.filter(commande__date_commande__gte=year_start).aggregate(t=Sum('sous_total'))['t'] or 0)

        kpis = {
            'chiffre_affaires_jour': round(ca_jour, 2),
            'chiffre_affaires_mois': round(ca_mois, 2),
            'chiffre_affaires_annee': round(ca_annee, 2),
            'chiffre_affaires_total': round(ca_total, 2),
            'chiffre_affaires_precedent': round(ca_prev, 2),
            'total_commandes': total_commandes,
            'commandes_terminees': commandes_terminees,
            'commandes_annulees': commandes_annulees,
            'total_clients': total_clients,
            'total_fournisseurs': total_fournisseurs,
            'total_produits': total_produits,
            'taux_satisfaction': round(taux_satisfaction, 2),
            'panier_moyen': panier_moyen,
            'taux_annulation': taux_annulation,
        }

        # --- Évolutions ---
        evolutions = self._build_evolutions(lignes_qs, commandes_qs, start, end, params)

        # --- Produits ---
        produits = self._build_produits(lignes_qs, params)

        # --- Magasins ---
        magasins = self._build_magasins(lignes_qs, commandes_qs, params)

        # --- Clients ---
        clients = self._build_clients(commandes_qs, start, end, params)

        # --- Géographie ---
        geo = self._build_geo(lignes_qs, commandes_qs, start, end, params)

        # --- Alertes ---
        alertes = self._build_alertes(params, ca_total, ca_prev, total_commandes, commandes_annulees, start, end)

        return {
            'periode': params['period'],
            'periode_label': self._period_label(params['period'], start, end),
            'debut': start.isoformat(),
            'fin': end.isoformat(),
            'kpis': kpis,
            'evolutions': evolutions,
            'produits': produits,
            'magasins': magasins,
            'clients': clients,
            'geographie': geo,
            'alertes': alertes,
        }

    def _period_label(self, period, start, end):
        if period == 'today':
            return "Aujourd'hui"
        if period == 'week':
            return "7 derniers jours"
        if period == 'month':
            return start.strftime('%B %Y').capitalize()
        if period == 'year':
            return f"Année {start.year}"
        if period == 'custom':
            return f"{start.strftime('%d/%m/%Y')} - {end.strftime('%d/%m/%Y')}"
        return "Tout"

    def _build_evolutions(self, lignes_qs, commandes_qs, start, end, params):
        days = (end - start).days
        if days <= 1:
            return self._evolution_hourly(lignes_qs, commandes_qs, start, end)
        if days <= 60:
            return self._evolution_daily(lignes_qs, commandes_qs, start, end, params)
        if (end - start).days <= 730:
            return self._evolution_monthly(lignes_qs, commandes_qs, start, end, params)
        return self._evolution_yearly(lignes_qs, commandes_qs, start, end, params)

    def _evolution_daily(self, lignes_qs, commandes_qs, start, end, params):
        labels = []
        current = start.date()
        end_date = end.date()
        while current <= end_date:
            labels.append(current)
            current += timedelta(days=1)

        data = []
        for d in labels:
            lqs = lignes_qs.filter(commande__date_commande__date=d)
            data.append({
                'label': d.strftime('%d/%m'),
                'ca': float(lqs.aggregate(t=Sum('sous_total'))['t'] or 0),
                'ventes': int(lqs.aggregate(t=Sum('quantite'))['t'] or 0),
                'commandes': int(commandes_qs.filter(date_commande__date=d).count()),
                'clients_nouveaux': Client.objects.filter(date_inscription__date=d).count(),
                'magasins_nouveaux': Fournisseur.objects.filter(date_inscription__date=d).count(),
                'produits_nouveaux': Produit.objects.filter(date_ajout__date=d).count(),
            })
        return data

    def _evolution_monthly(self, lignes_qs, commandes_qs, start, end, params):
        labels = []
        y, m = start.year, start.month
        while (y, m) <= (end.year, end.month):
            labels.append((y, m))
            m += 1
            if m > 12:
                m = 1
                y += 1

        data = []
        for y, m in labels:
            _, last = monthrange(y, m)
            d_start = timezone.make_aware(datetime(y, m, 1, 0, 0, 0))
            d_end = timezone.make_aware(datetime(y, m, last, 23, 59, 59))
            lqs = lignes_qs.filter(commande__date_commande__gte=d_start, commande__date_commande__lte=d_end)
            data.append({
                'label': f"{y}-{m:02d}",
                'ca': float(lqs.aggregate(t=Sum('sous_total'))['t'] or 0),
                'ventes': int(lqs.aggregate(t=Sum('quantite'))['t'] or 0),
                'commandes': int(commandes_qs.filter(date_commande__gte=d_start, date_commande__lte=d_end).count()),
                'clients_nouveaux': Client.objects.filter(date_inscription__year=y, date_inscription__month=m).count(),
                'magasins_nouveaux': Fournisseur.objects.filter(date_inscription__year=y, date_inscription__month=m).count(),
                'produits_nouveaux': Produit.objects.filter(date_ajout__year=y, date_ajout__month=m).count(),
            })
        return data

    def _evolution_yearly(self, lignes_qs, commandes_qs, start, end, params):
        data = []
        for y in range(start.year, end.year + 1):
            lqs = lignes_qs.filter(commande__date_commande__year=y)
            data.append({
                'label': str(y),
                'ca': float(lqs.aggregate(t=Sum('sous_total'))['t'] or 0),
                'ventes': int(lqs.aggregate(t=Sum('quantite'))['t'] or 0),
                'commandes': int(commandes_qs.filter(date_commande__year=y).count()),
                'clients_nouveaux': Client.objects.filter(date_inscription__year=y).count(),
                'magasins_nouveaux': Fournisseur.objects.filter(date_inscription__year=y).count(),
                'produits_nouveaux': Produit.objects.filter(date_ajout__year=y).count(),
            })
        return data

    def _evolution_hourly(self, lignes_qs, commandes_qs, start, end):
        data = []
        for h in range(24):
            h_start = start + timedelta(hours=h)
            h_end = h_start + timedelta(hours=1)
            if h_start > end:
                break
            lqs = lignes_qs.filter(commande__date_commande__gte=h_start, commande__date_commande__lt=h_end)
            data.append({
                'label': f"{h:02d}h",
                'ca': float(lqs.aggregate(t=Sum('sous_total'))['t'] or 0),
                'ventes': int(lqs.aggregate(t=Sum('quantite'))['t'] or 0),
                'commandes': int(commandes_qs.filter(date_commande__gte=h_start, date_commande__lt=h_end).count()),
                'clients_nouveaux': 0,
                'magasins_nouveaux': 0,
                'produits_nouveaux': 0,
            })
        return data

    def _build_produits(self, lignes_qs, params):
        top_vendus = self._top_produits(lignes_qs, top=10, by='quantite')
        top_vus = (
            Produit.objects.filter(nombre_vues__gt=0)
            .order_by('-nombre_vues')[:10]
            .values('id', 'nom', 'nombre_vues', 'stock', 'prix')
        )

        top_revenus = self._top_produits(lignes_qs, top=10, by='ca')

        moins_vendus = self._top_produits(lignes_qs, top=10, by='quantite', asc=True)

        rupture = list(
            Produit.objects.filter(Q(stock=0) | Q(disponibilite='rupture'))
            .order_by('stock')
            .values('id', 'nom', 'stock', 'prix')[:20]
        )

        return {
            'top_10_vendus': top_vendus,
            'top_10_vus': list(top_vus),
            'produits_moins_vendus': moins_vendus,
            'produits_rupture': rupture,
            'top_10_revenus': top_revenus,
        }

    def _top_produits(self, lignes_qs, top=10, by='quantite', asc=False):
        if by == 'quantite':
            qs = (
                lignes_qs.values('produit__id', 'produit__nom', 'produit__prix')
                .annotate(q=Sum('quantite'))
                .order_by('q' if asc else '-q')[:top]
            )
            return [
                {
                    'id': r['produit__id'],
                    'nom': r['produit__nom'],
                    'quantite': int(r['q'] or 0),
                    'prix': float(r['produit__prix'] or 0),
                }
                for r in qs
            ]
        else:
            qs = (
                lignes_qs.values('produit__id', 'produit__nom', 'produit__prix')
                .annotate(ca=Sum('sous_total'))
                .order_by('ca' if asc else '-ca')[:top]
            )
            return [
                {
                    'id': r['produit__id'],
                    'nom': r['produit__nom'],
                    'ca': float(r['ca'] or 0),
                    'prix': float(r['produit__prix'] or 0),
                }
                for r in qs
            ]

    def _build_magasins(self, lignes_qs, commandes_qs, params):
        top_ca = (
            lignes_qs.values('produit__fournisseur__user_id', 'produit__fournisseur__nom_entreprise')
            .annotate(ca=Sum('sous_total'), commandes=Count('commande', distinct=True), ventes=Sum('quantite'))
            .order_by('-ca')[:10]
        )

        top_commandes = (
            lignes_qs.values('produit__fournisseur__user_id', 'produit__fournisseur__nom_entreprise')
            .annotate(commandes=Count('commande', distinct=True), ca=Sum('sous_total'))
            .order_by('-commandes')[:10]
        )

        top_satisfaction = (
            Fournisseur.objects.filter(note_moyenne__isnull=False)
            .order_by('-note_moyenne')
            .annotate(nom=F('nom_entreprise'))
            .values('user_id', 'nom', 'note_moyenne')[:10]
        )

        plus_actifs = (
            lignes_qs.values('produit__fournisseur__user_id', 'produit__fournisseur__nom_entreprise')
            .annotate(jours_vente=Count('commande__date_commande__date', distinct=True), ca=Sum('sous_total'))
            .order_by('-jours_vente')[:10]
        )

        # Magasins nécessitant attention : faible CA ou satisfaction basse ou inactifs
        attention = []
        for f in Fournisseur.objects.select_related('magasin')[:50]:
            ca = float(lignes_qs.filter(produit__fournisseur=f).aggregate(t=Sum('sous_total'))['t'] or 0)
            note = float(f.note_moyenne or 0)
            if ca < 100 or note < 3.0:
                attention.append({
                    'id': f.user_id,
                    'nom': f.nom_entreprise,
                    'ca': ca,
                    'note_moyenne': note,
                    'motif': 'CA faible' if ca < 100 else 'Satisfaction basse',
                })
        attention.sort(key=lambda x: x['ca'])

        return {
            'top_ca': self._format_magasins(top_ca, 'ca'),
            'top_commandes': self._format_magasins(top_commandes, 'commandes'),
            'top_satisfaction': list(top_satisfaction),
            'plus_actifs': self._format_magasins(plus_actifs, 'jours_vente'),
            'attention': attention[:10],
        }

    def _format_magasins(self, qs, key):
        return [
            {
                'id': r['produit__fournisseur__user_id'],
                'nom': r['produit__fournisseur__nom_entreprise'],
                'ca': float(r.get('ca') or 0),
                'commandes': int(r.get('commandes') or 0),
                'ventes': int(r.get('ventes') or 0),
                'jours_vente': int(r.get('jours_vente') or 0),
                'note_moyenne': float(r.get('note_moyenne') or 0),
                'principal': float(r.get(key) or 0),
            }
            for r in qs
        ]

    def _build_clients(self, commandes_qs, start, end, params):
        nouveaux = list(
            Client.objects.filter(date_inscription__gte=start, date_inscription__lte=end)
            .select_related('user')
            .order_by('-date_inscription')
            .values('user_id', 'user__nom', 'user__prenom', 'user__email', 'date_inscription')[:20]
        )

        # Fidèles : top par CA (filtré)
        fideles_qs = (
            commandes_qs
            .exclude(client__isnull=True)
            .values('client__user_id', 'client__user__nom', 'client__user__prenom')
            .annotate(
                ca=Sum('montant_total'),
                commandes=Count('id', distinct=True),
                panier_moyen=Avg('montant_total')
            )
            .order_by('-ca')[:10]
        )

        inactif_since = end - timedelta(days=90)
        inactifs = (
            Client.objects.annotate(
                derniere_cmd=Max('commandes__date_commande')
            )
            .filter(Q(derniere_cmd__isnull=True) | Q(derniere_cmd__lt=inactif_since))
            .select_related('user')
            .values('user_id', 'user__nom', 'user__prenom', 'user__email')[:20]
        )

        frequence = self._frequence_achat(start, end)

        return {
            'nouveaux': nouveaux,
            'fideles': [
                {
                    'id': r['client__user_id'],
                    'nom': f"{r['client__user__prenom']} {r['client__user__nom']}".strip(),
                    'ca': float(r['ca'] or 0),
                    'commandes': r['commandes'],
                    'panier_moyen': float(r['panier_moyen'] or 0),
                }
                for r in fideles_qs
            ],
            'inactifs': list(inactifs),
            'frequence_achat_jours': frequence,
            'panier_moyen_par_client': round(
                float(Commande.objects.filter(date_commande__gte=start, date_commande__lte=end)
                      .aggregate(m=Avg('montant_total'))['m'] or 0), 2
            ),
        }

    def _frequence_achat(self, start, end):
        clients_avec_plusieurs_cmd = (
            Commande.objects.filter(date_commande__gte=start, date_commande__lte=end)
            .exclude(client__isnull=True)
            .values('client')
            .annotate(n=Count('id'))
            .filter(n__gte=2)
        )
        ecarts = []
        for item in clients_avec_plusieurs_cmd[:100]:
            dates = list(
                Commande.objects.filter(client_id=item['client'])
                .order_by('date_commande')
                .values_list('date_commande', flat=True)
            )
            for i in range(1, len(dates)):
                ecarts.append((dates[i] - dates[i-1]).days)
        return round(sum(ecarts) / len(ecarts), 1) if ecarts else 0

    def _build_geo(self, lignes_qs, commandes_qs, start, end, params):
        commandes_par_ville = (
            lignes_qs.exclude(produit__fournisseur__magasin__ville__isnull=True)
            .exclude(produit__fournisseur__magasin__ville='')
            .annotate(ville=F('produit__fournisseur__magasin__ville'))
            .values('ville')
            .annotate(commandes=Count('commande', distinct=True), ca=Sum('sous_total'))
            .order_by('-ca')[:15]
        )

        magasins_par_ville = (
            Magasin.objects.exclude(ville__isnull=True)
            .exclude(ville='')
            .values('ville')
            .annotate(total=Count('id'))
            .order_by('-total')[:15]
        )

        # Répartition clients par ville via la ville du magasin de leur commande
        clients_par_ville = (
            commandes_qs
            .exclude(client__isnull=True)
            .exclude(lignes__produit__fournisseur__magasin__ville__isnull=True)
            .exclude(lignes__produit__fournisseur__magasin__ville='')
            .annotate(ville=F('lignes__produit__fournisseur__magasin__ville'))
            .values('ville')
            .annotate(clients=Count('client', distinct=True))
            .order_by('-clients')[:15]
        )

        return {
            'commandes_par_ville': [
                {
                    'ville': r['ville'],
                    'commandes': r['commandes'],
                    'ca': float(r['ca'] or 0),
                }
                for r in commandes_par_ville
            ],
            'magasins_par_ville': list(magasins_par_ville),
            'clients_par_ville': [
                {
                    'ville': r['ville'] or 'Inconnue',
                    'clients': r['clients'],
                }
                for r in clients_par_ville
            ],
        }

    def _build_alertes(self, params, ca_total, ca_prev, total_commandes, commandes_annulees, start, end):
        alertes = []

        if ca_prev > 0 and ca_total < ca_prev * 0.8:
            alertes.append({
                'type': 'ca_baisse',
                'severity': 'error',
                'message': f'Le CA a chuté de {round((1 - ca_total / ca_prev) * 100, 1)}% par rapport à la période précédente.',
            })

        if total_commandes > 0:
            tx = (commandes_annulees / total_commandes) * 100
            if tx > 15:
                alertes.append({
                    'type': 'annulations',
                    'severity': 'warning',
                    'message': f'Taux d\'annulation élevé ({round(tx, 1)}%).',
                })

        inactif_since = end - timedelta(days=30)
        magasins_inactifs = Fournisseur.objects.exclude(
            user_id__in=LigneCommande.objects.filter(commande__date_commande__gte=inactif_since)
            .values('produit__fournisseur')
        ).count()
        if magasins_inactifs > 0:
            alertes.append({
                'type': 'magasin_inactif',
                'severity': 'warning',
                'message': f'{magasins_inactifs} magasin(s) sans commande depuis 30 jours.',
            })

        produit_populaire = Produit.objects.order_by('-nombre_vues').first()
        if produit_populaire and produit_populaire.nombre_vues > 100:
            alertes.append({
                'type': 'produit_populaire',
                'severity': 'info',
                'message': f'{produit_populaire.nom} est très consulté ({produit_populaire.nombre_vues} vues).',
            })

        if not alertes:
            alertes.append({
                'type': 'ok',
                'severity': 'success',
                'message': 'Aucune alerte particulière.',
            })

        return alertes


class AdminAnalyticsFiltersView(APIView):
    """Liste les options de filtres (magasins, catégories, villes)."""
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            magasins = list(
                Fournisseur.objects.select_related('magasin')
                .order_by('nom_entreprise')
                .values('user_id', 'nom_entreprise')[:200]
            )

            categories = list(
                Categorie.objects.filter(etat=True)
                .order_by('ordre', 'nom')
                .values('id', 'nom')
            )

            villes = sorted(set(
                Magasin.objects.exclude(ville__isnull=True)
                .exclude(ville='')
                .values_list('ville', flat=True)
            ))

            return Response({
                'magasins': [{'id': m['user_id'], 'nom': m['nom_entreprise']} for m in magasins],
                'categories': categories,
                'villes': villes,
            })
        except Exception as e:
            return Response({'error': f'Erreur filtres: {str(e)}'}, status=500)
