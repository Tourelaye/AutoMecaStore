from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """Charge data_dump.json uniquement si la base est vide.

    Exécuter loaddata à chaque démarrage écrasait les données de production
    (mots de passe des comptes seedés, approbations de produits, stocks...)
    à chaque redéploiement. Ce garde-fou conserve la restauration après une
    perte de base sans toucher aux données existantes.
    """

    help = 'Charge data_dump.json si aucune donnée applicative n existe.'

    def handle(self, *args, **options):
        from account.models import Utilisateur

        if Utilisateur.objects.exists():
            self.stdout.write('Base non vide — seed ignoré.')
            return

        call_command('loaddata', 'data_dump.json')
        self.stdout.write(self.style.SUCCESS('Seed initial chargé.'))
