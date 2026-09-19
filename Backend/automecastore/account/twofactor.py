"""
Helpers 2FA (TOTP) pour le flux de connexion admin.

Le challenge est un jeton signé (django.core.signing) contenant l'ID utilisateur.
Il est émis après validation du mot de passe et expire après TWO_FA_MAX_AGE
secondes. Il permet de chaîner setup/verify sans session ni JWT.
"""
import base64
import hashlib
import secrets

import pyotp
from django.core import signing
from django.core.cache import cache

TWO_FA_SALT = 'account.2fa.login'
TWO_FA_MAX_AGE = 300  # secondes (5 min)
TWO_FA_MAX_ATTEMPTS = 5

ISSUER = 'AutoMecaStore'


def make_challenge(user):
    return signing.dumps({'uid': user.pk, 'p': '2fa'}, salt=TWO_FA_SALT)


def resolve_challenge(value):
    """Retourne l'utilisateur associé au challenge, ou None si invalide/expiré."""
    if not value or not isinstance(value, str):
        return None
    try:
        data = signing.loads(value, salt=TWO_FA_SALT, max_age=TWO_FA_MAX_AGE)
    except signing.BadSignature:
        return None
    if data.get('p') != '2fa':
        return None
    from .models import Utilisateur
    return Utilisateur.objects.filter(pk=data.get('uid'), is_active=True).first()


def is_valid_base32(secret):
    if not secret:
        return False
    try:
        base64.b32decode(secret)
        return True
    except Exception:
        return False


def has_usable_2fa(user):
    return bool(user.two_factor_enabled and is_valid_base32(user.two_factor_secret))


def new_secret():
    return pyotp.random_base32()


def provisioning_uri(secret, email):
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=ISSUER)


def verify_totp(secret, code):
    if not secret or not code:
        return False
    try:
        return bool(pyotp.TOTP(secret).verify(code, valid_window=1))
    except Exception:
        return False


def generate_backup_codes():
    return [secrets.token_hex(4).upper() for _ in range(8)]


def hash_backup_code(code):
    return hashlib.sha256(code.strip().upper().encode()).hexdigest()


def consume_backup_code(user, code):
    """True si le code est un backup code valide (il est alors consommé)."""
    hashed = hash_backup_code(code)
    codes = list(user.two_factor_backup_codes or [])
    if hashed not in codes:
        return False
    codes.remove(hashed)
    user.two_factor_backup_codes = codes
    return True


def attempts_exceeded(challenge):
    """Compteur de tentatives par challenge (anti brute-force sur le code)."""
    key = f"2fa_attempts:{hashlib.sha256(challenge.encode()).hexdigest()[:32]}"
    count = cache.get(key, 0)
    if count >= TWO_FA_MAX_ATTEMPTS:
        return True
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=TWO_FA_MAX_AGE)
    return False
