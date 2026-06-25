# 🚗 AutoMecaStore

Plateforme e-commerce de vente de pièces détachées automobiles au Sénégal.

> Projet de mémoire — Licence 3 Génie Logiciel | Architecture Logicielle  
> Campus SupDeCo de Faidherbe | Abdoulaye Touré | 2024-2025

---

## 📋 Table des matières

- [Présentation](#présentation)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Installation](#installation)
- [Lancer le projet](#lancer-le-projet)
- [Documentation API](#documentation-api)
- [Structure du projet](#structure-du-projet)
- [Modules métier](#modules-métier)
- [Variables d'environnement](#variables-denvironnement)

---

## Présentation

AutoMecaStore connecte les particuliers, garages et entreprises sénégalaises avec des fournisseurs de pièces automobiles locaux et internationaux via une interface numérique accessible et sécurisée.

**Fonctionnalités principales :**
- Catalogue de pièces avec recherche par marque/modèle
- Panier d'achat et processus de commande complet
- Paiement mobile via Wave et Orange Money
- Suivi de commande en temps réel
- Interface d'administration complète

---

## Architecture

Le projet est organisé en **monolithe modulaire** (phase 1), conçu pour une migration progressive vers les **microservices** (phase 2).

```
┌─────────────────────────────────────────────────────┐
│                  Frontend Angular                    │
│                  (Vercel — SPA)                      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS / REST
┌──────────────────────▼──────────────────────────────┐
│              API REST — Django + DRF                 │
│         JWT Auth · Swagger · Gestion erreurs         │
├──────────┬──────────┬──────────┬────────────────────┤
│  Users   │ Products │  Orders  │ Payments │  Notif. │
├──────────┴──────────┴──────────┴──────────┴─────────┤
│              Django ORM — PostgreSQL                 │
└─────────────────────────────────────────────────────┘
```

---

## Technologies

| Couche | Technologie |
|--------|-------------|
| Backend | Python 3.11, Django 4.2, Django REST Framework |
| Authentification | djangorestframework-simplejwt (JWT) |
| Base de données | PostgreSQL 15 |
| Documentation API | drf-spectacular (Swagger/OpenAPI) |
| Frontend | Angular 17 (déployé sur Vercel) |
| Paiement | Wave API, Orange Money API |
| Messagerie async. | RabbitMQ (phase microservices) |
| Déploiement | Vercel (frontend), serveur cloud (backend) |

---

## Installation

### Prérequis

- Python 3.11+
- PostgreSQL 15+
- Node.js 18+ (pour le frontend)
- Git

### 1. Cloner le repo

```bash
git clone https://github.com/Tourelaye/AutoMecaStore.git
cd AutoMecaStore
```

### 2. Créer et activer l'environnement virtuel

```bash
# Linux / macOS
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 3. Installer les dépendances backend

```bash
cd automecastore
pip install -r requirements.txt
```

### 4. Configurer la base de données PostgreSQL

```sql
-- Dans psql
CREATE DATABASE automecastore_db;
CREATE USER automecastore_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE automecastore_db TO automecastore_user;
```

### 5. Configurer les variables d'environnement

```bash
cp .env.example .env
# Éditer .env avec vos valeurs (voir section Variables d'environnement)
```

### 6. Appliquer les migrations

```bash
python manage.py migrate
```

### 7. Créer un superutilisateur (admin)

```bash
python manage.py createsuperuser
```

### 8. Charger les données de test (optionnel)

```bash
python manage.py loaddata fixtures/categories.json
python manage.py loaddata fixtures/products.json
```

---

## Lancer le projet

### Backend Django

```bash
cd automecastore
python manage.py runserver
```

Le backend sera disponible sur : `http://localhost:8000`

### Frontend Angular

```bash
cd Frontend
npm install
ng serve
```

Le frontend sera disponible sur : `http://localhost:4200`

---

## Documentation API

Une fois le serveur lancé, la documentation Swagger est accessible à :

```
http://localhost:8000/api/docs/
```

### Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/auth/register/` | Inscription utilisateur |
| `POST` | `/api/auth/login/` | Connexion (retourne JWT) |
| `POST` | `/api/auth/refresh/` | Rafraîchir le token |
| `GET` | `/api/products/` | Liste des produits |
| `GET` | `/api/products/{id}/` | Détail d'un produit |
| `GET` | `/api/categories/` | Liste des catégories |
| `POST` | `/api/orders/` | Créer une commande |
| `GET` | `/api/orders/{id}/` | Détail d'une commande |
| `POST` | `/api/payments/` | Initier un paiement |
| `GET` | `/api/users/me/` | Profil de l'utilisateur connecté |

### Authentification

Toutes les routes protégées nécessitent un header `Authorization` :

```http
Authorization: Bearer <access_token>
```

---

## Structure du projet

```
AutoMecaStore/
├── Frontend/                   # Application Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # Composants UI
│   │   │   ├── services/      # Services Angular
│   │   │   └── models/        # Interfaces TypeScript
│   │   └── environments/
│   └── package.json
│
├── automecastore/              # Application Django
│   ├── automecastore/          # Configuration principale
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── users/                  # Module utilisateurs
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── products/               # Module produits
│   ├── orders/                 # Module commandes
│   ├── payments/               # Module paiements
│   ├── notifications/          # Module notifications
│   ├── requirements.txt
│   └── manage.py
│
└── README.md
```

---

## Modules métier

### 👤 Module Users
Gestion des comptes utilisateurs, authentification JWT et autorisation par rôles (client / admin).

### 📦 Module Products
Catalogue de pièces automobiles avec catégories, moteur de recherche avancé et gestion du stock.

### 🛒 Module Orders
Panier d'achat persistant, processus de commande complet et suivi d'état en temps réel.

### 💳 Module Payments
Intégration Wave et Orange Money avec validation et historique des transactions.

### 🔔 Module Notifications
Envoi d'emails et SMS à chaque étape du parcours commande via signaux Django.

---

## Variables d'environnement

Créez un fichier `.env` à la racine du dossier `automecastore/` :

```env
# Django
SECRET_KEY=votre_secret_key_django
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de données PostgreSQL
DB_NAME=automecastore_db
DB_USER=automecastore_user
DB_PASSWORD=votre_mot_de_passe
DB_HOST=localhost
DB_PORT=5432

# JWT
JWT_ACCESS_TOKEN_LIFETIME=15        # minutes
JWT_REFRESH_TOKEN_LIFETIME=7        # jours

# Email (notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=votre@email.com
EMAIL_HOST_PASSWORD=votre_app_password

# Paiement Wave
WAVE_API_KEY=votre_wave_api_key
WAVE_BASE_URL=https://api.wave.com/v1

# Paiement Orange Money
OM_API_KEY=votre_om_api_key
OM_BASE_URL=https://api.orange.com/orange-money-webpay

# CORS (frontend)
CORS_ALLOWED_ORIGINS=http://localhost:4200,https://auto-meca-store-bsuy.vercel.app
```

---

## Démo en ligne

- **Frontend** : [https://auto-meca-store-bsuy.vercel.app](https://auto-meca-store-bsuy.vercel.app)

---

## Licence

Projet académique — Licence 3 Génie Logiciel | Campus SupDeCo de Faidherbe | 2024-2025
