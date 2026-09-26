import logging
import threading

from django.core.mail import send_mail
from django.db import transaction

logger = logging.getLogger(__name__)


def send_mail_async(subject, message, from_email, recipient_list, html_message=None):
    """
    Envoie un e-mail en arrière-plan après le commit de la transaction
    courante. Le handshake SMTP (1-3 s, parfois plus) ne bloque ainsi
    ni la réponse HTTP ni la transaction ouverte.
    """
    def _send():
        try:
            sent = send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=recipient_list,
                html_message=html_message,
                fail_silently=False,
            )
            if not sent:
                print(f"EMAIL_ECHEC: send_mail a retourné 0 pour {recipient_list} — '{subject}'")
            else:
                print(f"EMAIL_OK: envoyé à {recipient_list} — '{subject}'")
        except Exception as e:
            print(f"EMAIL_ECHEC: {type(e).__name__}: {e} — destinataire {recipient_list}")
            logger.exception("Erreur envoi email asynchrone à %s", recipient_list)

    transaction.on_commit(
        lambda: threading.Thread(target=_send, daemon=True).start()
    )
