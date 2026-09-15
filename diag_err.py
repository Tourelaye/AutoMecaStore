import json, urllib.request, urllib.error

login = json.loads(urllib.request.urlopen(urllib.request.Request(
    'http://127.0.0.1:8000/account/login/',
    data=json.dumps({'email': 'admin@automecastore.com', 'password': 'AutoMeca@2026Admin', 'portal': 'admin'}).encode(),
    headers={'Content-Type': 'application/json'}
)).read().decode())
token = login['access']

for url in ['http://127.0.0.1:8000/api/admin/paiements/', 'http://127.0.0.1:8000/api/admin/commandes/export/']:
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        resp = urllib.request.urlopen(req)
        print(f"OK {resp.status} {url}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        # Extract the actual error from the HTML
        if 'Exception Value' in body:
            start = body.find('Exception Value')
            print(f"ERR {e.code} {url}")
            print(body[start:start+500])
        else:
            print(f"ERR {e.code} {url}")
            print(body[:500])
