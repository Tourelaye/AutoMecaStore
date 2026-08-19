from django.db.models import Q, Avg, F, Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.conf import settings

from rest_framework import generics, status, parsers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from account.permissions import IsAdmin
from account.models import Utilisateur, Client, Fournisseur
from fournisseur.models import creer_notification_fournisseur
from .models import Reclamation, MessageReclamation, PieceJointeReclamation, HistoriqueReclamation, Avis, SignalementAvis
from .serializers import (
    ReclamationListSerializer,
    ReclamationDetailSerializer,
    ReclamationCreateSerializer,
    MessageReclamationSerializer,
    PieceJointeReclamationSerializer,
    HistoriqueReclamationSerializer,
    AvisSerializer,
    AvisListSerializer,
    AvisDetailSerializer,
    SignalementAvisSerializer,
)


class AdminReclamationListView(generics.ListAPIView):
    """Liste paginée des réclamations pour l'admin."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]
    serializer_class = ReclamationListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut', 'priorite', 'motif']
    search_fields = ['numero_dossier', 'objet', 'client__user__nom', 'client__user__prenom', 'client__user__email', 'produit__nom', 'fournisseur__nom_entreprise']
    ordering_fields = ['date_soumission', 'date_derniere_maj', 'priorite', 'statut']
    ordering = ['-date_soumission']

    def get_queryset(self):
        qs = Reclamation.objects.select_related(
            'client__user', 'fournisseur__user', 'produit', 'commande', 'assigne_a'
        ).prefetch_related('messages').all()

        statut = self.request.query_params.get('statut')
        priorite = self.request.query_params.get('priorite')
        fournisseur = self.request.query_params.get('fournisseur')
        client = self.request.query_params.get('client')
        q = self.request.query_params.get('q')
        litige = self.request.query_params.get('litige')
        periode = self.request.query_params.get('periode')

        if statut and statut != 'tous':
            if statut == 'ouverts':
                qs = qs.exclude(statut__in=['resolu', 'rejete', 'ferme'])
            elif statut == 'urgents':
                qs = qs.filter(priorite='urgente').exclude(statut__in=['resolu', 'rejete', 'ferme'])
            else:
                qs = qs.filter(statut=statut)

        if priorite and priorite != 'tous':
            qs = qs.filter(priorite=priorite)

        if fournisseur:
            qs = qs.filter(Q(fournisseur__user__id=fournisseur) | Q(produit__fournisseur__user__id=fournisseur))

        if client:
            qs = qs.filter(client__user__id=client)

        if litige == 'true':
            qs = qs.filter(est_litige=True)

        if periode and periode != 'tous':
            now = timezone.now()
            if periode == 'today':
                qs = qs.filter(date_soumission__date=now.date())
            elif periode == 'week':
                start = now - timezone.timedelta(days=now.weekday())
                qs = qs.filter(date_soumission__date__gte=start.date())
            elif periode == 'month':
                qs = qs.filter(date_soumission__year=now.year, date_soumission__month=now.month)

        if q:
            qs = qs.filter(
                Q(numero_dossier__icontains=q) |
                Q(objet__icontains=q) |
                Q(commande__reference__icontains=q) |
                Q(client__user__nom__icontains=q) |
                Q(client__user__prenom__icontains=q) |
                Q(client__user__email__icontains=q) |
                Q(produit__nom__icontains=q) |
                Q(fournisseur__nom_entreprise__icontains=q) |
                Q(fournisseur__user__nom__icontains=q)
            )

        return qs


class AdminReclamationDetailView(APIView):
    """Détail complet d'une réclamation."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        rec = get_object_or_404(
            Reclamation.objects.select_related('client__user', 'fournisseur__user', 'produit', 'commande', 'assigne_a')
                              .prefetch_related('messages__auteur', 'messages__pieces_jointes', 'historique', 'pieces_jointes'),
            pk=pk
        )
        return Response(ReclamationDetailSerializer(rec).data)


class AdminReclamationStatsView(APIView):
    """Statistiques des réclamations."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        total = Reclamation.objects.count()
        ouverts = Reclamation.objects.exclude(statut__in=['resolu', 'rejete', 'ferme']).count()
        litiges_ouverts = Reclamation.objects.filter(est_litige=True).exclude(statut__in=['resolu', 'rejete', 'ferme']).count()
        resolus = Reclamation.objects.filter(statut='resolu').count()
        rejetes = Reclamation.objects.filter(statut='rejete').count()

        # Temps moyen de résolution en heures
        resolus_qs = Reclamation.objects.filter(statut='resolu', date_ouverture__isnull=False, date_resolution__isnull=False)
        durees = []
        for r in resolus_qs:
            delta = r.date_resolution - r.date_ouverture
            durees.append(delta.total_seconds() / 3600)
        temps_moyen = round(sum(durees) / len(durees), 1) if durees else 0

        taux_resolution = round((resolus / max(total, 1)) * 100, 1)

        par_motif = list(Reclamation.objects.values('motif').annotate(count=Count('id')).order_by('-count'))
        par_statut = list(Reclamation.objects.values('statut').annotate(count=Count('id')).order_by('statut'))
        par_priorite = list(Reclamation.objects.values('priorite').annotate(count=Count('id')).order_by('priorite'))

        return Response({
            'total': total,
            'ouverts': ouverts,
            'litiges_ouverts': litiges_ouverts,
            'resolus': resolus,
            'rejetes': rejetes,
            'temps_moyen_resolution_heures': temps_moyen,
            'taux_resolution': taux_resolution,
            'par_motif': par_motif,
            'par_statut': par_statut,
            'par_priorite': par_priorite,
        })


class AdminReclamationActionView(APIView):
    """Actions admin sur une réclamation : changement de statut, priorité, assignation, note, etc."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def _log(self, reclamation, action, request, commentaire='', statut='', priorite=''):
        admin = getattr(request.user, 'administrateur', None)
        HistoriqueReclamation.objects.create(
            reclamation=reclamation,
            action=action,
            statut=statut or reclamation.statut,
            priorite=priorite or reclamation.priorite,
            auteur=request.user,
            auteur_nom=f"{request.user.prenom} {request.user.nom}".strip() or request.user.email,
            auteur_type='admin',
            commentaire=commentaire
        )

    def _notifier(self, reclamation, titre, message, lien=''):
        # Notification in-app fournisseur
        if reclamation.fournisseur:
            try:
                creer_notification_fournisseur(
                    fournisseur_id=reclamation.fournisseur.user_id,
                    type_notif='reclamation',
                    titre=titre,
                    message=message,
                    lien=lien or '/fournisseur/reclamations'
                )
            except Exception:
                pass

        # Email client
        if reclamation.client and reclamation.client.user and reclamation.client.user.email:
            try:
                send_mail(
                    subject=titre,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@automecastore.sn',
                    recipient_list=[reclamation.client.user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

    def _message_systeme(self, reclamation, contenu, auteur_type='systeme'):
        MessageReclamation.objects.create(
            reclamation=reclamation,
            auteur_type=auteur_type,
            contenu=contenu,
            est_visible_client=True,
            est_visible_fournisseur=True,
        )

    def patch(self, request, pk):
        rec = get_object_or_404(Reclamation, pk=pk)
        action = request.data.get('action')

        if action == 'change_statut':
            nouveau = request.data.get('statut')
            if not nouveau:
                return Response({'error': 'Statut requis'}, status=400)
            old = rec.statut
            rec.statut = nouveau
            if nouveau == 'resolu':
                rec.date_resolution = timezone.now()
            if nouveau in ('rejete', 'ferme'):
                rec.date_cloture = timezone.now()
            rec.save()
            self._log(rec, 'changement_statut', request, f'{old} → {rec.statut}', statut=rec.statut)
            self._message_systeme(rec, f"Le statut du dossier a été mis à jour : {rec.get_statut_display()}.")
            if rec.statut == 'resolu':
                self._notifier(rec, 'Votre réclamation a été résolue', f"Dossier {rec.numero_dossier} marqué comme résolu.")
            elif rec.statut == 'rejete':
                rec.raison_rejet = request.data.get('raison_rejet', '')
                rec.save()
                self._notifier(rec, 'Votre réclamation a été rejetée', f"Dossier {rec.numero_dossier} rejeté.")
            elif rec.statut == 'ferme':
                self._notifier(rec, 'Dossier clôturé', f"Dossier {rec.numero_dossier} clôturé.")

        elif action == 'change_priorite':
            nouvelle = request.data.get('priorite')
            if not nouvelle:
                return Response({'error': 'Priorité requise'}, status=400)
            old = rec.priorite
            rec.priorite = nouvelle
            rec.save()
            self._log(rec, 'changement_priorite', request, f'{old} → {rec.priorite}', priorite=rec.priorite)

        elif action == 'assigner':
            user_id = request.data.get('assigne_a')
            try:
                user = Utilisateur.objects.get(id=user_id)
                rec.assigne_a = user
                rec.save()
                self._log(rec, 'assignation', request, f"Assigné à {user.prenom} {user.nom}")
            except Utilisateur.DoesNotExist:
                return Response({'error': 'Utilisateur non trouvé'}, status=404)

        elif action == 'note_interne':
            note = request.data.get('note_interne', '')
            rec.note_interne = note
            rec.save()
            self._log(rec, 'note_interne', request, note)

        elif action == 'demande_infos':
            rec.statut = 'en_attente_infos'
            rec.save()
            self._log(rec, 'demande_infos', request, request.data.get('message', 'Demande d\'informations supplémentaires'))
            self._message_systeme(rec, f"L'administrateur demande des informations supplémentaires : {request.data.get('message', '')}")
            self._notifier(rec, 'Information demandée', f"Des informations complémentaires sont nécessaires pour le dossier {rec.numero_dossier}.")

        elif action == 'ouvrir':
            rec.statut = 'en_cours_analyse'
            rec.date_ouverture = rec.date_ouverture or timezone.now()
            rec.save()
            self._log(rec, 'ouverture', request, 'Dossier ouvert et pris en charge')

        elif action == 'marquer_litige':
            rec.est_litige = request.data.get('est_litige', True)
            rec.save()
            self._log(rec, 'modification', request, f"Litige : {rec.est_litige}")

        elif action == 'reponse_admin':
            rec.reponse_admin = request.data.get('reponse_admin', '')
            rec.save()
            self._log(rec, 'reponse', request, rec.reponse_admin)
            self._message_systeme(rec, f"Réponse de l'administrateur : {rec.reponse_admin}")

        else:
            return Response({'error': 'Action inconnue'}, status=400)

        return Response({
            'message': 'Action effectuée avec succès',
            'reclamation': ReclamationDetailSerializer(rec).data
        })


class AdminReclamationMessageView(APIView):
    """Liste et création de messages sur une réclamation."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get(self, request, pk):
        rec = get_object_or_404(Reclamation, pk=pk)
        messages = rec.messages.all()
        return Response(MessageReclamationSerializer(messages, many=True).data)

    def post(self, request, pk):
        rec = get_object_or_404(Reclamation, pk=pk)
        contenu = request.data.get('contenu')
        if not contenu:
            return Response({'error': 'Contenu requis'}, status=400)

        auteur_type = 'admin'
        auteur = request.user
        auteur_nom = f"{request.user.prenom} {request.user.nom}".strip() or request.user.email

        est_note_interne = request.data.get('est_note_interne', False)
        visible_client = request.data.get('est_visible_client', True)
        visible_fournisseur = request.data.get('est_visible_fournisseur', True)

        msg = MessageReclamation.objects.create(
            reclamation=rec,
            auteur=auteur,
            auteur_type=auteur_type,
            auteur_nom=auteur_nom,
            contenu=contenu,
            est_note_interne=est_note_interne,
            est_visible_client=visible_client,
            est_visible_fournisseur=visible_fournisseur,
        )

        # Historique
        HistoriqueReclamation.objects.create(
            reclamation=rec,
            action='reponse',
            auteur=auteur,
            auteur_nom=auteur_nom,
            auteur_type='admin',
            commentaire=contenu[:200]
        )

        # Fichiers joints
        fichiers = request.FILES.getlist('pieces_jointes')
        for fichier in fichiers:
            type_piece = 'autre'
            ext = (fichier.name or '').lower().split('.')[-1]
            if ext in ['jpg', 'jpeg', 'png', 'webp']:
                type_piece = 'photo'
            elif ext == 'pdf':
                type_piece = 'pdf'
            elif 'facture' in fichier.name.lower():
                type_piece = 'facture'
            elif ext in ['png', 'jpg'] and 'capture' in fichier.name.lower():
                type_piece = 'capture'
            PieceJointeReclamation.objects.create(
                reclamation=rec,
                message=msg,
                fichier=fichier,
                type=type_piece,
                nom=fichier.name
            )

        # Notifications
        if visible_client and rec.client:
            try:
                send_mail(
                    subject=f"Nouvelle réponse - Dossier {rec.numero_dossier}",
                    message=contenu,
                    from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@automecastore.sn',
                    recipient_list=[rec.client.user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

        if visible_fournisseur and rec.fournisseur:
            creer_notification_fournisseur(
                fournisseur_id=rec.fournisseur.user_id,
                type_notif='reclamation',
                titre=f"Nouveau message - {rec.numero_dossier}",
                message=contenu[:200],
                lien='/fournisseur/reclamations'
            )

        return Response({
            'message': 'Message ajouté',
            'message_obj': MessageReclamationSerializer(msg).data
        }, status=201)


class AdminReclamationAttachmentView(APIView):
    """Ajouter une pièce jointe au dossier."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request, pk):
        rec = get_object_or_404(Reclamation, pk=pk)
        fichier = request.FILES.get('fichier')
        if not fichier:
            return Response({'error': 'Fichier requis'}, status=400)
        type_piece = request.data.get('type', 'autre')
        pj = PieceJointeReclamation.objects.create(
            reclamation=rec,
            fichier=fichier,
            type=type_piece,
            nom=fichier.name
        )
        return Response({
            'message': 'Pièce jointe ajoutée',
            'piece_jointe': PieceJointeReclamationSerializer(pj).data
        })


class AdminReclamationHistoriqueView(generics.ListAPIView):
    """Historique du dossier."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]
    serializer_class = HistoriqueReclamationSerializer

    def get_queryset(self):
        return HistoriqueReclamation.objects.filter(reclamation_id=self.kwargs['pk']).order_by('-date')


# ===============================
# ADMIN - AVIS
# ===============================

class AdminAvisListView(generics.ListAPIView):
    """Liste paginée des avis pour l'admin."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]
    serializer_class = AvisListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['client__user__nom', 'client__user__prenom', 'client__user__email', 'produit__nom', 'magasin__nom_magasin', 'commentaire']
    ordering_fields = ['date', 'note', 'approuve']
    ordering = ['-date']

    def get_queryset(self):
        qs = Avis.objects.select_related(
            'client__user', 'produit', 'magasin', 'commande'
        ).prefetch_related('signalements').all()

        note = self.request.query_params.get('note')
        statut = self.request.query_params.get('statut')
        achat_verifie = self.request.query_params.get('achat_verifie')
        signale = self.request.query_params.get('signale')
        q = self.request.query_params.get('q')
        periode = self.request.query_params.get('periode')

        if note and note != 'toutes':
            qs = qs.filter(note=int(note))

        if statut and statut != 'tous':
            if statut == 'visible':
                qs = qs.filter(approuve=True)
            elif statut == 'masque':
                qs = qs.filter(approuve=False)
            elif statut == 'moderation_requise':
                qs = qs.filter(signalements__statut='en_attente').distinct()

        if achat_verifie == 'true':
            qs = qs.filter(achat_verifie=True)

        if signale == 'true':
            qs = qs.filter(signalements__isnull=False).distinct()

        if periode and periode != 'tous':
            now = timezone.now()
            if periode == 'today':
                qs = qs.filter(date__date=now.date())
            elif periode == 'week':
                start = now - timezone.timedelta(days=now.weekday())
                qs = qs.filter(date__date__gte=start.date())
            elif periode == 'month':
                qs = qs.filter(date__year=now.year, date__month=now.month)

        if q:
            qs = qs.filter(
                Q(client__user__nom__icontains=q) |
                Q(client__user__prenom__icontains=q) |
                Q(client__user__email__icontains=q) |
                Q(produit__nom__icontains=q) |
                Q(magasin__nom_magasin__icontains=q) |
                Q(commentaire__icontains=q)
            )

        return qs


class AdminAvisDetailView(APIView):
    """Détail complet d'un avis."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        avis = get_object_or_404(
            Avis.objects.select_related('client__user', 'produit', 'magasin', 'commande', 'livreur')
                        .prefetch_related('signalements__client__user', 'signalements__fournisseur__user'),
            pk=pk
        )
        return Response(AvisDetailSerializer(avis).data)


class AdminAvisStatsView(APIView):
    """Statistiques des avis."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        total = Avis.objects.count()
        visibles = Avis.objects.filter(approuve=True).count()
        masques = Avis.objects.filter(approuve=False).count()
        signales = Avis.objects.filter(signalements__isnull=False).distinct().count()
        signalements_en_attente = SignalementAvis.objects.filter(statut='en_attente').count()

        avg = Avis.objects.aggregate(avg=Avg('note'))['avg']
        note_moyenne = round(avg, 2) if avg is not None else 0

        achats_verifies = Avis.objects.filter(achat_verifie=True).count()

        par_note = []
        for i in range(1, 6):
            par_note.append({'note': i, 'count': Avis.objects.filter(note=i).count()})

        return Response({
            'total': total,
            'visibles': visibles,
            'masques': masques,
            'signales': signales,
            'signalements_en_attente': signalements_en_attente,
            'note_moyenne': note_moyenne,
            'achats_verifies': achats_verifies,
            'par_note': par_note,
        })


class AdminAvisActionView(APIView):
    """Actions admin sur un avis : approuver, masquer, supprimer, répondre."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        avis = get_object_or_404(Avis, pk=pk)
        action = request.data.get('action')

        if action == 'approuver':
            avis.approuve = True
            avis.save()
            return Response({'message': 'Avis rendu visible', 'avis': AvisDetailSerializer(avis).data})

        elif action == 'masquer':
            avis.approuve = False
            avis.save()
            return Response({'message': 'Avis masqué', 'avis': AvisDetailSerializer(avis).data})

        elif action == 'repondre':
            reponse = request.data.get('reponse_admin', '').strip()
            if not reponse:
                return Response({'error': 'Réponse requise'}, status=400)
            avis.reponse_fournisseur = reponse
            avis.date_reponse = timezone.now()
            avis.reponse_fournisseur_nom = f"{request.user.prenom} {request.user.nom}".strip() or 'Administrateur'
            avis.save()
            return Response({'message': 'Réponse publiée', 'avis': AvisDetailSerializer(avis).data})

        elif action == 'supprimer':
            avis.delete()
            return Response({'message': 'Avis supprimé'}, status=status.HTTP_204_NO_CONTENT)

        elif action == 'signaler':
            motif = request.data.get('motif', 'autre')
            commentaire = request.data.get('commentaire', '')
            SignalementAvis.objects.create(
                avis=avis,
                motif=motif,
                commentaire=commentaire,
            )
            return Response({'message': 'Avis signalé', 'avis': AvisDetailSerializer(avis).data})

        return Response({'error': 'Action inconnue'}, status=400)


class AdminAvisSignalementsView(APIView):
    """Liste des signalements d'un avis."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        avis = get_object_or_404(Avis, pk=pk)
        signalements = avis.signalements.select_related('client__user', 'fournisseur__user').all()
        return Response(SignalementAvisSerializer(signalements, many=True).data)

    def patch(self, request, pk):
        """Marquer un signalement comme traité ou rejeté."""
        signalement_id = request.data.get('signalement_id')
        nouveau_statut = request.data.get('statut')
        if nouveau_statut not in ['traite', 'rejete']:
            return Response({'error': 'Statut invalide'}, status=400)
        signalement = get_object_or_404(SignalementAvis, pk=signalement_id, avis_id=pk)
        signalement.statut = nouveau_statut
        signalement.save()
        return Response(SignalementAvisSerializer(signalement).data)
