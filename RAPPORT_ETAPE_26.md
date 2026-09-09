# RAPPORT — ÉTAPE 26 : Correction de la logique de déduplication des produits

## 1. Cause du doublon

**Cause racine** : `FournisseurProduitListCreateView.perform_create()` créait systématiquement un nouveau `Produit` à chaque soumission, sans vérifier si un produit équivalent existait déjà. Le deuxième fournisseur créait donc un produit dupliqué au lieu d'une offre sur le produit existant.

## 2. Architecture avant

```
Produit (catalogue)
  ├── fournisseur → account.Fournisseur (FK, "propriétaire")
  ├── prix (sur le produit)
  ├── stock (sur le produit)
  └── FournisseurProduit (offres)
        ├── fournisseur → catalog.Fournisseur
        ├── produit → Produit
        ├── prix_vente
        └── stock_disponible
              ⚠️ Pas de contrainte unique (produit, fournisseur)
              ⚠️ Pas de logique de matching
```

## 3. Architecture après

```
Produit (catalogue global)
  ├── fournisseur → account.Fournisseur (FK, "propriétaire" — conservé pour compatibilité)
  └── FournisseurProduit (offres)
        ├── fournisseur → catalog.Fournisseur
        ├── produit → Produit
        ├── prix_vente
        ├── stock_disponible
        └── UNIQUE(produit, fournisseur) ✅
```

**Principe respecté** : 1 PRODUIT = 1 produit catalogue global, 1 FOURNISSEUR = 1 offre sur ce produit.

## 4. Logique de matching

### Fonction centralisée : `find_matching_product()`
Localisation : `catalog/product_matching.py`

### Hiérarchie de confiance

| Niveau | Confiance | Critères | Comportement |
|--------|-----------|----------|--------------|
| 1 | HIGH | OEM + marque | Rattachement automatique côté backend |
| 2 | MEDIUM | Référence fabricant + marque + type pièce | Rattachement automatique côté backend |
| 3 | LOW | Nom normalisé + marque + type pièce | Rattachement automatique, mais le frontend affiche aussi le modal |
| — | — | Aucun match | Création d'un nouveau produit |

### Normalisation : `normalize_product_text()`
- Minuscules
- Suppression des accents (NFKD)
- Suppression des espaces multiples
- Suppression des tirets et ponctuation
- Trim

## 5. Modifications backend

### Fichiers créés
- **`catalog/product_matching.py`** : Fonctions `normalize_product_text()` et `find_matching_product()`
- **`catalog/management/commands/detect_duplicates.py`** : Commande `python manage.py detect_duplicates`
- **`catalog/tests_dedup.py`** : 20 tests (12 obligatoires + 8 tests additionnels)

### Fichiers modifiés
- **`fournisseur/views.py`** :
  - `perform_create()` : Recherche de produit existant via `find_matching_product()` avant création, dans une transaction atomique
  - Ajout de `FournisseurProduitMatchView` : endpoint `GET /api/fournisseur/produits/match/`
  - Imports : `db_transaction`, `FournisseurProduit`, `find_matching_product`, `normalize_product_text`

- **`fournisseur/urls.py`** :
  - Ajout de `path('produits/match/', ...)` avant `path('produits/', ...)`

- **`catalog/models.py`** :
  - Ajout de `unique_together = ('produit', 'fournisseur')` sur `FournisseurProduit`

### Migration
- **`catalog/migrations/0037_unique_fournisseurproduit.py`** : Contrainte d'unicité appliquée (aucun doublon existant en base)

## 6. Modifications frontend

### Fichiers modifiés
- **`fournisseur/services/produit.service.ts`** :
  - Ajout de `matchProduit()` : appelle `GET /api/fournisseur/produits/match/`

- **`fournisseur/ajouter-produit/ajouter-produit.component.ts`** :
  - `enregistrer()` : Appelle `matchProduit()` avant création. Si match (high/medium), affiche un modal de confirmation
  - `confirmerRattachement()` : Continue la création (le backend fera le rattachement)
  - `annulerRattachement()` : Annule et retourne au formulaire
  - `proceedToSave()` : Extrait la logique de sauvegarde
  - Nouvelles propriétés : `matchLoading`, `matchResult`, `showMatchModal`, `pendingFormData`

- **`fournisseur/ajouter-produit/ajouter-produit.component.html`** :
  - Ajout du modal "Ce produit existe déjà dans le catalogue"
  - Ajout de l'overlay de loading "Vérification des produits existants..."

- **`fournisseur/ajouter-produit/ajouter-produit.component.css`** :
  - Styles pour le modal de matching (overlay, body, footer, boutons)

## 7. Sécurité backend

- **Transaction atomique** : `perform_create()` utilise `db_transaction.atomic()` pour éviter les race conditions
- **Double vérification** : Le backend refait le matching même si le frontend a déjà validé
- **Contrainte DB** : `unique_together(produit, fournisseur)` empêche les doublons d'offres au niveau base de données
- **get_or_create** : Utilisé pour `FournisseurProduit` afin d'éviter les IntegrityError en cas de concurrence

## 8. Compatibilité préservée

| Système | Impact | Statut |
|---------|--------|--------|
| Panier | `produit_id + fournisseur_id + magasin_id` | ✅ Non modifié |
| Commandes | `LigneCommande(produit, fournisseur, magasin)` | ✅ Non modifié |
| Paiements | Aucun changement | ✅ Non touché |
| Livraison | Aucun changement | ✅ Non touché |
| Favoris | Pointent vers `Produit` global | ✅ Non modifié |
| Notifications | Conservées | ✅ Non modifié |
| Admin | Affichage existant | ✅ Non modifié |
| Interface fournisseur | Liste produits par `fournisseur` | ✅ Non modifié |

## 9. Tests réalisés

### Tests backend (20 tests, tous passent)

| Test | Description | Statut |
|------|-------------|--------|
| TEST 1 | Fournisseur A crée un produit → Produit créé | ✅ |
| TEST 2 | Fournisseur B crée le même produit → Pas de 2e produit | ✅ |
| TEST 3 | Fournisseur B a une nouvelle offre liée au produit existant | ✅ |
| TEST 4 | Deux fournisseurs, prix différents → 1 produit + 2 offres | ✅ |
| TEST 5 | Deux fournisseurs, stocks différents → Stocks séparés | ✅ |
| TEST 6 | Même nom, OEM différents → Deux produits | ✅ |
| TEST 7 | Même OEM, marques différentes → Vérification matching | ✅ |
| TEST 8 | Même référence, type différent → Pas de match | ✅ |
| TEST 9 | Même fournisseur + même produit → IntegrityError | ✅ |
| TEST 10 | Produit avec offres → Serializer retourne toutes les offres | ✅ |
| TEST 11 | Panier avec 2 fournisseurs → 2 lignes distinctes | ✅ |
| TEST 12 | Commande avec 2 fournisseurs → Lignes conservent fournisseur | ✅ |
| Normalize | 6 tests de normalisation de texte | ✅ |
| Ambiguous | 2 tests de cas ambigus | ✅ |

### Commandes de validation (toutes passent)

```
py manage.py check                                    → System check identified no issues
py manage.py test catalog.tests_dedup --noinput -v 1  → Ran 20 tests... OK
npx ng build --configuration=production               → Application bundle generation complete
```

## 10. Doublons existants détectés

Vérification en base : **0 doublon FournisseurProduit existant** avant l'application de la contrainte.

Commande pour détecter les doublons de produits :
```
py manage.py detect_duplicates
```

## 11. Risques éventuels

- **FournisseurProduit existants sans doublons** : La contrainte `unique_together` a été appliquée sans problème (0 doublon)
- **Matching niveau 3 (LOW)** : Le rattachement par nom normalisé + marque + type peut être moins précis. Le frontend affiche un modal de confirmation pour les matches high et medium. Le niveau low crée un nouveau produit (pas de rattachement automatique)
- **Produit.fournisseur (FK)** : Conservé pour compatibilité. En cas de rattachement, le produit garde son fournisseur d'origine. Le nouveau fournisseur n'est lié que via `FournisseurProduit`

## 12. Fichiers modifiés

### Backend
- `catalog/product_matching.py` (nouveau)
- `catalog/management/commands/detect_duplicates.py` (nouveau)
- `catalog/management/__init__.py` (nouveau, vide)
- `catalog/management/commands/__init__.py` (nouveau, vide)
- `catalog/tests_dedup.py` (nouveau)
- `catalog/models.py` (modifié : `unique_together` sur `FournisseurProduit`)
- `catalog/migrations/0037_unique_fournisseurproduit.py` (nouveau)
- `fournisseur/views.py` (modifié : `perform_create` + `FournisseurProduitMatchView`)
- `fournisseur/urls.py` (modifié : route `match/`)

### Frontend
- `fournisseur/services/produit.service.ts` (modifié : `matchProduit()`)
- `fournisseur/ajouter-produit/ajouter-produit.component.ts` (modifié : matching + modal)
- `fournisseur/ajouter-produit/ajouter-produit.component.html` (modifié : modal HTML)
- `fournisseur/ajouter-produit/ajouter-produit.component.css` (modifié : styles modal)

## 13. Tests manuels restant à effectuer

1. **Fournisseur A** ajoute "Plaquettes de frein Brembo OEM 04465-0K240" → produit créé
2. **Fournisseur B** ajoute le même produit → modal "Ce produit existe déjà" → "Utiliser ce produit" → offre créée
3. Vérifier que le catalogue client affiche **une seule fiche** avec **2 offres**
4. Vérifier que le panier crée **2 lignes distinctes** (Produit 10 + Fournisseur A, Produit 10 + Fournisseur B)
5. Vérifier que la commande conserve les références fournisseur/magasin
6. Lancer `py manage.py detect_duplicates` pour vérifier l'absence de doublons
7. Tester la concurrence : deux fournisseurs soumettent simultanément le même produit

## 14. Résumé

```
PRODUIT GLOBAL (1 entrée catalogue)
       ↓
  plusieurs OFFRES (FournisseurProduit)
       ↓
  plusieurs FOURNISSEURS
       ↓
  plusieurs MAGASINS (via Fournisseur → Magasin OneToOne)
```

Compatible avec : Panier ✅ | Commandes ✅ | Paiement ✅ | Livraison ✅ | Retrait ✅ | Favoris ✅ | Notifications ✅ | Admin ✅ | Interface fournisseur ✅
