import time
from account.serializers import RegisterFournisseurSerializer, MyTokenObtainPairSerializer

data = {
    'email': f'testreg_{int(time.time())}@example.com',
    'password': 'Pass12345',
    'nom': 'Test',
    'prenom': 'User',
    'telephone': '123',
    'adresse': 'adr',
    'nom_entreprise': 'Test Ent',
    'siret': '',
    'description': ''
}
rs = RegisterFournisseurSerializer(data=data)
ok = rs.is_valid()
print('register valid:', ok)
if ok:
    u = rs.save()
    print('created:', u.email, 'is_active:', u.is_active)
    s = MyTokenObtainPairSerializer(data={'email': u.email, 'password': 'Pass12345'})
    ok2 = s.is_valid()
    print('login valid:', ok2)
    if ok2:
        print('data keys:', list(s.validated_data.keys()))
    else:
        print('errors:', s.errors)
else:
    print('register errors:', rs.errors)
