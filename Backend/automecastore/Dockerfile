# ---------- Build stage ----------
FROM python:3.13-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dépendances système pour psycopg2-binary et Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ---------- Runtime stage ----------
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Librairies runtime nécessaires (libpq pour psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copier les packages installés depuis le builder
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copier le code de l'application
COPY . .

# Collectstatic au build (DEBUG=True par défaut sans .env → SECRET_KEY fallback dev OK)
RUN python manage.py collectstatic --noinput

EXPOSE 8000

# Migrations + chargement initial des données puis démarrage gunicorn (Render injecte $PORT)
# loaddata est idempotent (mêmes PKs = mise à jour) — à retirer après le 1er chargement réussi
CMD python manage.py migrate --noinput && python manage.py loaddata data_dump.json && gunicorn automecastore.wsgi:application --bind 0.0.0.0:${PORT:-8000}
