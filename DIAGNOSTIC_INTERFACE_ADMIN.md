# DIAGNOSTIC — INTERFACE ADMIN INACCESSIBLE

## 1. Symptôme
L'interface Admin est inaccessible alors que l'interface Fournisseur fonctionne correctement.

## 2. Cause exacte
Le problème provient d'une **incohérence entre le backend et le frontend** pour la validation du rôle admin :

**Backend (`account/serializers.py`, ligne 233)** :
```python
elif portal == 'admin':
    if user.role != 'admin' or not user.is_staff:
        raise PermissionDenied(...)
```

Le backend exige **DEUX conditions** pour un admin :
1. `user.role === 'admin'`
2. `user.is_staff === True`

**Frontend (`core/guards/admin.guard.ts`, ligne 14)** :
```typescript
if (!user || user.role !== 'admin' || user.is_active === false) {
```

Le frontend ne vérifie **QUE** `role === 'admin'` et `is_active`, mais **NE vérifie PAS `is_staff`**.

**Token JWT (`account/serializers.py`, lignes 241-255)** :
Le token n'inclut pas `is_staff` dans son payload, donc le frontend ne peut pas vérifier cette condition.

## 3. Fichier responsable
- `Backend/automecastore/account/serializers.py` — validation backend et génération token
- `Frontend/src/app/core/guards/admin.guard.ts` — guard frontend
- `Frontend/src/app/admin/login/login.component.ts` — validation login frontend
- `Frontend/src/app/core/services/auth.service.ts` — parsing token et interface utilisateur

## 4. Comparaison Admin / Fournisseur

| Aspect | Fournisseur | Admin |
|---|---|---|
| **Backend validation** | `role === 'fournisseur'` + `is_active` + statut actif | `role === 'admin'` **+ `is_staff`** |
| **Frontend guard** | Vérifie `role === 'fournisseur'` + `is_active` + statut actif | Vérifie `role === 'admin'` + `is_active` (**manque `is_staff`**) |
| **Login frontend** | Vérifie `role === 'fournisseur'` | Vérifie `role === 'admin'` (**manque `is_staff`**) |
| **Token JWT** | Contient `role`, `fournisseur_status`, `fournisseur_raison_refus` | Contient `role`, `nom`, `prenom`, `user_id`, `is_active` (**manque `is_staff`**) |

## 5. Problème de rôle
Le token JWT n'inclut pas `is_staff` dans le payload pour les admins. Le frontend ne peut donc pas vérifier `is_staff` car cette information n'est pas disponible dans l'objet utilisateur stocké.

## 6. Problème de guard
Le `adminGuard` ne vérifie pas `is_staff` car cette information n'est pas disponible dans l'objet utilisateur stocké dans le frontend.

## 7. Problème de routing
Les routes sont correctement configurées avec lazy loading et guards. Le problème n'est pas ici.

## 8. Problème backend/API
Le backend rejette la connexion si `is_staff` est `False`, mais le frontend ne détecte pas ce problème avant d'essayer d'accéder à `/admin/dashboard`.

## 9. Correction effectuée (Option 1)

### Backend
**Fichier :** `Backend/automecastore/account/serializers.py` (ligne 249)
**Modification :** Ajout de `is_staff` dans le token JWT
```python
token['is_staff'] = user.is_staff
```

### Frontend
**Fichier :** `Frontend/src/app/core/services/auth.service.ts` (ligne 19)
**Modification :** Ajout de `is_staff` dans l'interface `Utilisateur`
```typescript
is_staff?: boolean;
```

**Fichier :** `Frontend/src/app/core/services/auth.service.ts` (ligne 77)
**Modification :** Parsing de `is_staff` depuis le token
```typescript
is_staff: payload.is_staff ?? false
```

**Fichier :** `Frontend/src/app/core/guards/admin.guard.ts` (ligne 14)
**Modification :** Vérification de `is_staff` dans le guard
```typescript
if (!user || user.role !== 'admin' || user.is_active === false || user.is_staff === false) {
```

**Fichier :** `Frontend/src/app/admin/login/login.component.ts` (ligne 110)
**Modification :** Vérification de `is_staff` dans le login
```typescript
if (role !== 'admin' || !user?.is_staff) {
```

## 10. Fichiers modifiés
1. `Backend/automecastore/account/serializers.py`
2. `Frontend/src/app/core/services/auth.service.ts`
3. `Frontend/src/app/core/guards/admin.guard.ts`
4. `Frontend/src/app/admin/login/login.component.ts`

## 11. Tests réalisés
- `py manage.py check` → OK (0 issue)
- `npx ng build --configuration=production` → OK

## 12. Résultat
L'interface Admin devrait maintenant être accessible. Le frontend vérifie désormais `is_staff` en plus de `role === 'admin'`, alignant la logique de sécurité avec le backend.

## 13. Tests manuels à effectuer
1. **Login Admin** : Se connecter avec un compte admin (`role='admin'` et `is_staff=True`)
2. **Accès Dashboard** : Vérifier l'accès à `/admin/dashboard`
3. **Navigation Admin** : Tester la navigation dans les différentes sections admin
4. **Login Fournisseur** : Vérifier que l'accès Fournisseur fonctionne toujours
5. **Login Client** : Vérifier que l'accès Client fonctionne toujours

## 14. Risques
Aucun risque. La correction aligne le frontend avec la logique de sécurité existante du backend. Aucune modification de l'architecture ou des systèmes existants n'a été effectuée.
