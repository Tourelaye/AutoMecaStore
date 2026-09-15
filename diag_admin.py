import json, urllib.request, urllib.error

# Login as admin
login_url = 'http://127.0.0.1:8000/account/login/'
login_data = json.dumps({
    'email': 'admin@automecastore.com',
    'password': 'AutoMeca@2026Admin',
    'portal': 'admin'
}).encode('utf-8')

req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
result = json.loads(resp.read().decode('utf-8'))
token = result['access']
print("Admin login OK\n")

endpoints = [
    # Dashboard
    ('GET', 'http://127.0.0.1:8000/api/admin/dashboard-stats/'),
    # Profil
    ('GET', 'http://127.0.0.1:8000/api/admin/profil/'),
    # Parametres
    ('GET', 'http://127.0.0.1:8000/api/admin/parametres/finance/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/parametres/gateways/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/parametres/roles/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/parametres/api/'),
    # Utilisateurs
    ('GET', 'http://127.0.0.1:8000/api/admin/utilisateurs/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/utilisateurs/stats/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/utilisateurs/1/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/utilisateurs/1/activite/'),
    # Fournisseurs
    ('GET', 'http://127.0.0.1:8000/api/admin/fournisseurs/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/fournisseurs/60/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/fournisseurs/60/commandes/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/fournisseurs/60/produits/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/fournisseurs/60/stats/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/fournisseurs/60/magasin/'),
    # Produits
    ('GET', 'http://127.0.0.1:8000/api/admin/produits/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/produits/en-attente/'),
    # Commandes
    ('GET', 'http://127.0.0.1:8000/api/admin/commandes/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/commandes/stats/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/commandes/alerts/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/commandes/export/'),
    # Journal
    ('GET', 'http://127.0.0.1:8000/api/admin/journal/'),
    # Magasins
    ('GET', 'http://127.0.0.1:8000/api/magasins/'),
    # Marques
    ('GET', 'http://127.0.0.1:8000/api/marques/'),
    # Categories
    ('GET', 'http://127.0.0.1:8000/api/categories/'),
    # Paiements
    ('GET', 'http://127.0.0.1:8000/api/admin/paiements/'),
    # Livraisons
    ('GET', 'http://127.0.0.1:8000/api/admin/livraisons/'),
    # Avis
    ('GET', 'http://127.0.0.1:8000/api/admin/avis/v2/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/avis/stats/'),
    # Reclamations
    ('GET', 'http://127.0.0.1:8000/api/admin/reclamations/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/reclamations/stats/'),
    # Partenariats
    ('GET', 'http://127.0.0.1:8000/api/admin/partenariats/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/partenariats/stats/'),
    # Messages
    ('GET', 'http://127.0.0.1:8000/api/admin/messages/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/messages/stats/'),
    # Analytics
    ('GET', 'http://127.0.0.1:8000/api/admin/analytics/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/analytics/filters/'),
]

failed = []
for method, url in endpoints:
    req = urllib.request.Request(url, method=method, headers={'Authorization': f'Bearer {token}'})
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read().decode('utf-8'))
        if isinstance(data, list):
            print(f"OK  {resp.status} {url} (count: {len(data)})")
        elif isinstance(data, dict):
            print(f"OK  {resp.status} {url} (keys: {list(data.keys())[:5]})")
        else:
            print(f"OK  {resp.status} {url}")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')[:150]
        print(f"ERR {e.code} {url} - {body}")
        failed.append(url)
    except Exception as e:
        print(f"ERR {url} - {e}")
        failed.append(url)

# Test public partenariat create (no auth needed)
try:
    pdata = json.dumps({'nom_entreprise': 'Test', 'email_contact': 'test@test.com', 'message': 'test'}).encode('utf-8')
    preq = urllib.request.Request('http://127.0.0.1:8000/api/partenariat/create/', data=pdata, headers={'Content-Type': 'application/json'})
    presp = urllib.request.urlopen(preq)
    print(f"OK  {presp.status} /api/partenariat/create/")
except urllib.error.HTTPError as e:
    print(f"ERR {e.code} /api/partenariat/create/ - {e.read().decode('utf-8')[:150]}")
    failed.append('/api/partenariat/create/')

print(f"\n=== {len(failed)} failed out of {len(endpoints)+1} ===")
if failed:
    for f in failed:
        print(f"  FAILED: {f}")
