import json, urllib.request, urllib.error

login = json.loads(urllib.request.urlopen(urllib.request.Request(
    'http://127.0.0.1:8000/account/login/',
    data=json.dumps({'email': 'admin@automecastore.com', 'password': 'AutoMeca@2026Admin', 'portal': 'admin'}).encode(),
    headers={'Content-Type': 'application/json'}
)).read().decode())
token = login['access']

req = urllib.request.Request('http://127.0.0.1:8000/api/admin/dashboard-stats/', headers={'Authorization': f'Bearer {token}'})
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode())
    print("Top-level keys:", list(data.keys()))
    print()
    print("KPIs count:", len(data.get('kpis', [])))
    for kpi in data.get('kpis', []):
        print(f"  {kpi['key']}: {kpi['value']} (variation: {kpi['variation']}%)")
    print()
    print("evolution_ventes count:", len(data.get('evolution_ventes', [])))
    print("evolution_commandes count:", len(data.get('evolution_commandes', [])))
    print("evolution_inscriptions count:", len(data.get('evolution_inscriptions', [])))
    print()
    print("activites_recentes count:", len(data.get('activites_recentes', [])))
    print("alertes count:", len(data.get('alertes', [])))
    print("derniers_magasins count:", len(data.get('derniers_magasins', [])))
    print("derniers_produits count:", len(data.get('derniers_produits', [])))
    print("dernieres_commandes count:", len(data.get('dernieres_commandes', [])))
    print("derniers_utilisateurs count:", len(data.get('derniers_utilisateurs', [])))
    print()
    print("repartition_categories count:", len(data.get('repartition_categories', [])))
    print("ventes_par_region count:", len(data.get('ventes_par_region', [])))
    print("top_categories count:", len(data.get('top_categories', [])))
except urllib.error.HTTPError as e:
    print(f"ERR {e.code}")
    print(e.read().decode()[:2000])
