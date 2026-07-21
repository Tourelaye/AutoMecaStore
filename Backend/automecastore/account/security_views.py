import secrets
from datetime import datetime

from django.utils import timezone
from django.contrib.auth.hashers import check_password
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import Utilisateur, SecurityActivity, UserSession, APIToken


def _get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def _log_activity(user, action, request=None, status='success', metadata=None):
    SecurityActivity.objects.create(
        user=user,
        action=action,
        ip_address=_get_client_ip(request) if request else None,
        user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
        status=status,
        metadata=metadata or {}
    )


def _derive_device_name(user_agent):
    ua = (user_agent or '').lower()
    if 'mobile' in ua:
        return 'Mobile'
    if 'tablet' in ua:
        return 'Tablette'
    if 'windows' in ua:
        return 'Windows'
    if 'mac' in ua:
        return 'Mac'
    if 'linux' in ua:
        return 'Linux'
    return 'Appareil inconnu'


def _generate_backup_codes():
    return [secrets.token_hex(4).upper() for _ in range(8)]


class SecurityOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'two_factor_enabled': user.two_factor_enabled,
            'email_alerts_enabled': user.email_alerts_enabled,
            'password_changed_at': user.password_changed_at.isoformat() if user.password_changed_at else None,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'active_sessions_count': user.security_sessions.filter(is_active=True).count(),
            'api_tokens_count': user.api_tokens.filter(is_active=True).count(),
            'recent_alerts': list(
                user.security_activities
                .filter(action='security_alert')
                .order_by('-timestamp')
                .values('action', 'status', 'timestamp')[:5]
            )
        }
        return Response(data)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')

        if not check_password(current_password, user.password):
            _log_activity(user, 'password_change_failed', request, status='failure',
                          metadata={'reason': 'wrong_current_password'})
            return Response(
                {'error': 'Le mot de passe actuel est incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not new_password or len(new_password) < 8:
            return Response(
                {'error': 'Le nouveau mot de passe doit contenir au moins 8 caractères'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.password_changed_at = timezone.now()
        user.save()
        _log_activity(user, 'password_change', request)

        return Response({'message': 'Mot de passe mis à jour avec succès'})


class TwoFactorView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            'enabled': request.user.two_factor_enabled,
            'email_alerts_enabled': request.user.email_alerts_enabled
        })

    def post(self, request):
        user = request.user
        enabled = request.data.get('enabled', False)
        user.two_factor_enabled = bool(enabled)

        backup_codes = []
        if user.two_factor_enabled:
            if not user.two_factor_secret:
                user.two_factor_secret = secrets.token_hex(20).upper()
            backup_codes = _generate_backup_codes()
            user.email_alerts_enabled = request.data.get('email_alerts_enabled', user.email_alerts_enabled)
        else:
            user.two_factor_secret = None

        user.save()

        action = 'two_factor_enabled' if user.two_factor_enabled else 'two_factor_disabled'
        _log_activity(user, action, request)

        return Response({
            'enabled': user.two_factor_enabled,
            'secret': user.two_factor_secret if user.two_factor_enabled else None,
            'otpauth_url': (
                f"otpauth://totp/AutoMecaStore:{user.email}?secret={user.two_factor_secret}&issuer=AutoMecaStore"
                if user.two_factor_enabled else None
            ),
            'backup_codes': backup_codes,
            'email_alerts_enabled': user.email_alerts_enabled,
        })


class SecurityActivityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        activities = request.user.security_activities.all()[:50]
        data = []
        for act in activities:
            data.append({
                'id': act.id,
                'action': act.get_action_display(),
                'action_code': act.action,
                'status': act.status,
                'ip_address': act.ip_address,
                'timestamp': act.timestamp.isoformat(),
                'metadata': act.metadata,
            })
        return Response(data)


class SessionsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = request.user.security_sessions.filter(is_active=True)
        data = []
        current_key = request.headers.get('X-Session-Key', '')
        for s in sessions:
            is_current = s.session_key == current_key
            data.append({
                'id': s.id,
                'session_key': s.session_key,
                'device_name': s.device_name,
                'user_agent': s.user_agent,
                'ip_address': s.ip_address,
                'location': s.location,
                'created_at': s.created_at.isoformat(),
                'last_active_at': s.last_active_at.isoformat(),
                'is_current': is_current,
            })
        return Response(data)


class RegisterSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        session_key = request.data.get('session_key', '')
        device_name = request.data.get('device_name', '') or _derive_device_name(request.META.get('HTTP_USER_AGENT', ''))

        # Mark other sessions not current if this one is flagged current
        is_current = request.data.get('is_current', True)
        if is_current:
            user.security_sessions.filter(is_current=True).update(is_current=False)

        session, created = UserSession.objects.get_or_create(
            user=user,
            session_key=session_key,
            defaults={
                'device_name': device_name,
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'ip_address': _get_client_ip(request),
                'location': request.data.get('location', ''),
                'is_current': is_current,
            }
        )
        if not created:
            session.device_name = device_name
            session.user_agent = request.META.get('HTTP_USER_AGENT', '')
            session.ip_address = _get_client_ip(request)
            session.is_current = is_current
            session.save()

        _log_activity(user, 'login', request, metadata={'session_key': session_key})
        return Response({'message': 'Session enregistrée', 'session_key': session.session_key})


class RevokeSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_key):
        user = request.user
        try:
            session = user.security_sessions.get(session_key=session_key)
        except UserSession.DoesNotExist:
            return Response({'error': 'Session introuvable'}, status=status.HTTP_404_NOT_FOUND)

        if session.is_current:
            return Response(
                {'error': 'Impossible de révoquer la session active'},
                status=status.HTTP_400_BAD_REQUEST
            )

        session.is_active = False
        session.save()
        _log_activity(user, 'session_revoked', request, metadata={'session_key': session_key})
        return Response({'message': 'Session révoquée'})


class RevokeOtherSessionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current_key = request.headers.get('X-Session-Key', '')
        sessions = request.user.security_sessions.filter(is_active=True).exclude(session_key=current_key)
        count = sessions.count()
        sessions.update(is_active=False)
        _log_activity(request.user, 'all_sessions_revoked', request, metadata={'count': count})
        return Response({'message': f'{count} session(s) révoquée(s)'})


class APITokenListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tokens = request.user.api_tokens.filter(is_active=True)
        return Response([
            {
                'id': t.id,
                'name': t.name,
                'key': t.key,
                'created_at': t.created_at.isoformat(),
                'last_used_at': t.last_used_at.isoformat() if t.last_used_at else None,
            } for t in tokens
        ])

    def post(self, request):
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Le nom du token est requis'}, status=status.HTTP_400_BAD_REQUEST)
        token = APIToken.objects.create(user=request.user, name=name)
        _log_activity(request.user, 'token_created', request, metadata={'token_id': token.id, 'name': token.name})
        return Response({
            'id': token.id,
            'name': token.name,
            'key': token.key,
            'created_at': token.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


class APITokenRevokeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, token_id):
        try:
            token = request.user.api_tokens.get(id=token_id, is_active=True)
        except APIToken.DoesNotExist:
            return Response({'error': 'Token introuvable'}, status=status.HTTP_404_NOT_FOUND)

        token.is_active = False
        token.save()
        _log_activity(request.user, 'token_revoked', request, metadata={'token_id': token.id, 'name': token.name})
        return Response({'message': 'Token révoqué'})


class LogoutAllDevicesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.security_sessions.update(is_active=False)
        _log_activity(request.user, 'all_sessions_revoked', request)
        return Response({'message': 'Toutes les sessions ont été fermées'})


class DeactivateAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if not check_password(request.data.get('password', ''), user.password):
            return Response(
                {'error': 'Mot de passe incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )
        _log_activity(user, 'account_deactivated', request)
        user.is_active = False
        user.save()
        return Response({'message': 'Compte désactivé'})
