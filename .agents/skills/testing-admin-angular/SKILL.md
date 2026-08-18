---
name: testing-admin-angular
description: How to run AutoMecaStore locally (Angular front + Django back + Postgres) and reach the admin "Gestion des utilisateurs" screen with seeded data, for end-to-end/visual testing of admin pages.
---

# Testing the AutoMecaStore Angular admin locally

## Services

Frontend (Angular, port 4200):

```bash
cd Frontend && npm install && npx ng serve
```

Backend (Django, port 8000):

```bash
sudo service postgresql start
cd Backend/automecastore && /home/ubuntu/venv-ams/bin/python manage.py migrate
cd Backend/automecastore && /home/ubuntu/venv-ams/bin/python manage.py runserver
```

Notes / gotchas:
- `requirements.txt` may pin a Django version that does not exist on PyPI (e.g. `Django==6.0.5`). Use the pre-built venv at `/home/ubuntu/venv-ams` (Django 5.2.x) instead of installing from requirements, and do NOT edit `requirements.txt`.
- DB settings in `settings.py` expect a local Postgres database `automecastore_dev` with user `postgres` / password `2004`. Create the DB if missing before migrating.
- Startup prints Django `auto_created primary key` warnings; harmless.

## Admin access

- Admin login page: `http://localhost:4200/admin/login` (route lives in `Frontend/src/app/admin/admin-routing.module.ts`; `/admin/**` other than `login` is behind `adminGuard`).
- Login requires a user whose API role is `admin` AND `is_staff = True`. A plain `create_user` client will silently fail the guard.
- Create one via `manage.py shell`:

```python
from account.models import Utilisateur
u = Utilisateur.objects.create_user(email='admin@automeca.com', password='Admin123@', nom='Toure', prenom='Abdoulaye')
u.role = 'admin'; u.is_staff = True; u.is_superuser = True; u.save()
```

- Users page: `http://localhost:4200/admin/utilisateurs`.

## Seeding rows

Scripts run with `manage.py shell` / `runscript` must live INSIDE the Django project package dir
(`Backend/automecastore/`). A script placed in `/tmp` fails with
`ModuleNotFoundError: No module named 'automecastore'` even with the right cwd.

Seed ~10-15 users (mix of `client` / `fournisseur`, some with `is_active=False` so
"Désactivé" badges appear) so first / middle / last row behaviours can all be exercised.
Status shown in the table comes from `admin_api/serializers.py::_statut_unifie`
(`actif` / `desactive`, or the fournisseur's own statut).

## Testing the users table UI

- The rows list is inside its own scrollable container (`.table-wrapper`), not the page body — scroll
  with the mouse over the table to reach the last row.
- The ⋮ actions menu is a single `.dropdown-menu` rendered outside the table with `position: fixed`.
  To verify anchoring objectively, compare `getBoundingClientRect()` of the clicked
  `button[title="Actions"]` with the menu rect (expect menu.top ≈ button.bottom + 6, right edges
  aligned; upward variant adds class `dropdown-menu--up`).
- To check horizontal overflow, compare `.table-wrapper` `scrollWidth` vs `clientWidth`. Note the
  grid in `utilisateur-admin.component.css` sets `min-width: 1180px` plus large gaps/padding, so the
  table may still overflow (and clip the Actions column) even on a 1600px viewport — worth
  re-checking after any column/spacing change.
- The component polls the API but skips refreshes while a dropdown or modal is open, so open menus
  are not lost mid-test.

## Devin Secrets Needed

None — all credentials above are created locally against the dev database.
