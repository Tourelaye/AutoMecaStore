import json, urllib.request, urllib.error

login = json.loads(urllib.request.urlopen(urllib.request.Request(
    'http://127.0.0.1:8000/account/login/',
    data=json.dumps({'email': 'admin@automecastore.com', 'password': 'AutoMeca@2026Admin', 'portal': 'admin'}).encode(),
    headers={'Content-Type': 'application/json'}
)).read().decode())
token = login['access']

endpoints = [
    ('GET', 'http://127.0.0.1:8000/api/admin/fournisseurs/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/fournisseurs/60/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/fournisseurs/60/stats/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/fournisseurs/60/commandes/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/fournisseurs/60/produits/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/fournisseurs/60/magasin/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/commandes/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/commandes/1/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/commandes/stats/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/produits/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/produits/35/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/utilisateurs/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/utilisateurs/62/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/paiements/'),
    ('GET', 'http://127.0.0.1:8000/api/admin/livraisons/'),
]

for method, url in endpoints:
    req = urllib.request.Request(url, method=method, headers={'Authorization': f'Bearer {token}'})
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read().decode())
        print(f"\n=== {url} ===")
        print(json.dumps(data, indent=2, ensure_ascii=False)[:2000])
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:500]
        print(f"\n=== {url} === ERR {e.code}")
        print(body)
