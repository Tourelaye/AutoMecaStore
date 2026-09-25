"""
Migre les fichiers du dossier media/ local vers le bucket S3-compatible
configuré via variables d'environnement (Supabase / Cloudflare R2 / B2).

Usage : définir AWS_* dans .env, puis :
    python upload_media_to_storage.py
"""
import os
import mimetypes

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'automecastore.settings')

import django
django.setup()

import boto3
from botocore.config import Config
from django.conf import settings

required = ['AWS_STORAGE_BUCKET_NAME', 'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY', 'AWS_S3_ENDPOINT_URL']
missing = [v for v in required if not os.environ.get(v)]
if missing:
    print(f'Variables manquantes dans .env : {missing}')
    raise SystemExit(1)

s3 = boto3.client(
    's3',
    endpoint_url=os.environ['AWS_S3_ENDPOINT_URL'],
    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    region_name=os.environ.get('AWS_S3_REGION_NAME', 'auto'),
    config=Config(s3={'addressing_style': 'path'}),
)

bucket = os.environ['AWS_STORAGE_BUCKET_NAME']
media_root = settings.MEDIA_ROOT

# Liste des clés déjà présentes dans le bucket (évite les doublons)
existing = set()
paginator = s3.get_paginator('list_objects_v2')
for page in paginator.paginate(Bucket=bucket):
    for obj in page.get('Contents', []):
        existing.add(obj['Key'])

count = skip = errors = 0
for root, _dirs, files in os.walk(media_root):
    for name in files:
        local = os.path.join(root, name)
        key = os.path.relpath(local, media_root).replace(os.sep, '/')
        if key in existing:
            skip += 1
            continue
        try:
            ctype = mimetypes.guess_type(name)[0] or 'application/octet-stream'
            with open(local, 'rb') as fh:
                s3.put_object(Bucket=bucket, Key=key, Body=fh, ContentType=ctype)
            count += 1
            print(f'  uploadé : {key}')
        except Exception as e:
            errors += 1
            print(f'  ERREUR {key} : {e}')

print(f'\n{count} fichier(s) uploadé(s), {skip} déjà présent(s), {errors} erreur(s).')
