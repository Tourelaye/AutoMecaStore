import unicodedata

from storages.backends.s3 import S3Storage


def _ascii(name):
    """Translittère les accents (é -> e) pour obtenir une clé S3 valide.

    Supabase/R2 rejettent les clés contenant des caractères non-ASCII
    (ex. « Capture d'écran.png ») avec un 400 — sans cela l'upload échoue.
    """
    name = unicodedata.normalize('NFKD', str(name))
    name = name.encode('ascii', 'ignore').decode('ascii')
    return name.replace("'", '').replace('"', '')


class SafeS3Storage(S3Storage):
    """S3Storage qui normalise les noms de fichiers en ASCII.

    La normalisation est faite dans get_available_name() : c'est le premier
    point d'entrée de save(), et Django 6 n'appelle plus get_valid_name()
    sur le chemin d'upload — sans cela le nom brut accentué atteignait
    put_object/head_object et Supabase répondait 400.
    """

    def get_available_name(self, name, max_length=None):
        return super().get_available_name(_ascii(name), max_length=max_length)

    def exists(self, name):
        return super().exists(_ascii(name))

    def get_valid_name(self, name):
        return super().get_valid_name(_ascii(name))
