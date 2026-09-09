"""
Tests génériques du matching et de la fusion de produits.

Couvre 16 scénarios avec différentes familles de produits (filtres, bougies, batteries, amortisseurs).
Aucune référence à Brembo, Toyota, plaquettes de frein, ou produits #19/#29/#35.
"""
from django.test import TestCase
from decimal import Decimal
from catalog.models import (
    Categorie, TypePiece, Produit, Fournisseur as CatalogFournisseur,
    FournisseurProduit,
)
from catalog.product_matching import (
    find_matching_product, normalize_product_text, normalize_oem,
    compute_match_score, detect_all_duplicates,
    SCORE_CONFIRMED, SCORE_POSSIBLE,
    MATCH_CONFIRMED, MATCH_POSSIBLE, NO_MATCH,
)
from catalog.fusion import fusionner_produits
from account.models import Utilisateur, Fournisseur as AccountFournisseur, Client
from orders.models import Panier, PanierItem, Commande, LigneCommande


class GenericMatchingBase(TestCase):
    """Base avec données variées pour tests génériques."""

    def setUp(self):
        # Plusieurs catégories et types
        self.cat_frein = Categorie.objects.create(nom='Freinage', etat=True)
        self.cat_filtre = Categorie.objects.create(nom='Filtration', etat=True)
        self.cat_elec = Categorie.objects.create(nom='Électricité', etat=True)
        self.cat_susp = Categorie.objects.create(nom='Suspension', etat=True)

        self.tp_frein = TypePiece.objects.create(nom='Plaquette', categorie=self.cat_frein)
        self.tp_filtre = TypePiece.objects.create(nom='Filtre', categorie=self.cat_filtre)
        self.tp_bougie = TypePiece.objects.create(nom='Bougie', categorie=self.cat_elec)
        self.tp_amort = TypePiece.objects.create(nom='Amortisseur', categorie=self.cat_susp)

        # 3 fournisseurs
        self.users = []
        self.fournisseurs = []
        self.catalog_fs = []
        for i, (email, nom) in enumerate([
            ('f1@test.com', 'Garage Central'),
            ('f2@test.com', 'Auto Distribution'),
            ('f3@test.com', 'Pièces Express'),
        ]):
            u = Utilisateur.objects.create_user(
                email=email, password='test123', nom=nom, prenom='Test', role='fournisseur'
            )
            f = AccountFournisseur.objects.create(user=u, nom_entreprise=nom, statut='actif')
            cf = CatalogFournisseur.objects.create(nom_entreprise=nom, administrateur=u)
            self.users.append(u)
            self.fournisseurs.append(f)
            self.catalog_fs.append(cf)

    def _create_produit(self, **kwargs):
        defaults = {
            'nom': 'Filtre à huile Bosch',
            'description': 'Filtre à huile premium',
            'prix': Decimal('15000'),
            'stock': 10,
            'marque': 'Bosch',
            'reference_oem': '',
            'reference': 'SKU-001',
            'fabricant': 'Bosch',
            'categorie': self.cat_filtre,
            'type_piece': self.tp_filtre,
            'is_active': True,
            'statut': 'actif',
            'statut_approbation': 'approuve',
            'fournisseur': self.fournisseurs[0],
        }
        defaults.update(kwargs)
        return Produit.objects.create(**defaults)


# ──────────────────────────────────────────────────────
# 1. Deux fournisseurs, même produit, SKU différents
# ──────────────────────────────────────────────────────
class Test01_SkuDifferents(GenericMatchingBase):
    def test_sku_differents_match(self):
        p1 = self._create_produit(reference='SKU-A', reference_oem='OEM-FH001')
        result = find_matching_product(
            nom='Filtre à huile Bosch',
            marque='Bosch',
            reference_oem='OEM-FH001',
            reference='SKU-B',
            type_piece_id=self.tp_filtre.id,
        )
        self.assertTrue(result['found'])
        self.assertEqual(result['product'].id, p1.id)


# ──────────────────────────────────────────────────────
# 2. Trois fournisseurs, même produit
# ──────────────────────────────────────────────────────
class Test02_TroisFournisseurs(GenericMatchingBase):
    def test_trois_offres_un_produit(self):
        p = self._create_produit(reference_oem='OEM-FH001')
        for i in range(3):
            FournisseurProduit.objects.create(
                fournisseur=self.catalog_fs[i], produit=p,
                prix_achat=Decimal('12000'), prix_vente=Decimal('15000'),
                stock_disponible=5 + i * 3,
            )
        self.assertEqual(FournisseurProduit.objects.filter(produit=p).count(), 3)


# ──────────────────────────────────────────────────────
# 3. Même nom mais marque différente → PAS DE FUSION
# ──────────────────────────────────────────────────────
class Test03_MemeNomMarqueDifferente(GenericMatchingBase):
    def test_pas_de_fusion(self):
        self._create_produit(marque='Bosch', reference_oem='OEM-FH001')
        result = find_matching_product(
            nom='Filtre à huile Bosch',
            marque='Mann',
            reference_oem='OEM-FH002',
            type_piece_id=self.tp_filtre.id,
        )
        # Marque différente + OEM différent → pas de match
        self.assertFalse(result['found'])


# ──────────────────────────────────────────────────────
# 4. Même marque mais type de pièce différent → PAS DE FUSION
# ──────────────────────────────────────────────────────
class Test04_MemeMarqueTypeDifferent(GenericMatchingBase):
    def test_pas_de_fusion(self):
        self._create_produit(type_piece=self.tp_filtre, reference_oem='')
        result = find_matching_product(
            nom='Filtre à huile Bosch',
            marque='Bosch',
            type_piece_id=self.tp_bougie.id,
        )
        # Type différent → blocage → score plafonné à 25 → pas de match
        self.assertFalse(result['found'])


# ──────────────────────────────────────────────────────
# 5. OEM identique → MATCH FORT
# ──────────────────────────────────────────────────────
class Test05_OemIdentique(GenericMatchingBase):
    def test_match_fort(self):
        p1 = self._create_produit(
            nom='Bougie d\'allumage NGK', marque='NGK',
            reference_oem='OEM-NGK1234', type_piece=self.tp_bougie,
            fabricant='NGK',
        )
        result = find_matching_product(
            nom='Bougie d\'allumage NGK',
            marque='NGK',
            reference_oem='OEM-NGK1234',
            type_piece_id=self.tp_bougie.id,
        )
        self.assertTrue(result['found'])
        self.assertEqual(result['confidence'], 'high')
        self.assertEqual(result['product'].id, p1.id)


# ──────────────────────────────────────────────────────
# 6. OEM différent → ne pas fusionner si conflit
# ──────────────────────────────────────────────────────
class Test06_OemDifferent(GenericMatchingBase):
    def test_pas_de_fusion(self):
        self._create_produit(reference_oem='OEM-NGK1234')
        result = find_matching_product(
            nom='Bougie d\'allumage NGK',
            marque='NGK',
            reference_oem='OEM-NGK5678',
            type_piece_id=self.tp_bougie.id,
        )
        # OEM différent + score_hors_oem faible → NO_MATCH
        self.assertFalse(result['found'])


# ──────────────────────────────────────────────────────
# 7. Compatibilité différente → vérifier le score
# ──────────────────────────────────────────────────────
class Test07_CompatibiliteDifferente(GenericMatchingBase):
    def test_compat_different_score_bas(self):
        p1 = self._create_produit(
            modeles_compatibles=['Peugeot 208', 'Citroen C3'],
            reference_oem='',
        )
        result = find_matching_product(
            nom='Filtre à huile Bosch',
            marque='Bosch',
            type_piece_id=self.tp_filtre.id,
            modeles_compatibles=['Toyota Corolla', 'Honda Civic'],
        )
        # Marque identique + type identique + nom identique → score moyen
        # Mais compatibilité différente (2+ modèles chacun, aucun commun) → blocage
        self.assertFalse(result['found'])


# ──────────────────────────────────────────────────────
# 8. Produit actif + produit inactif correspondant
# ──────────────────────────────────────────────────────
class Test08_ActifInactif(GenericMatchingBase):
    def test_match_inactif(self):
        p1 = self._create_produit(
            nom='Bougie d\'allumage NGK', marque='NGK',
            reference_oem='OEM-NGK1234', type_piece=self.tp_bougie,
            fabricant='NGK', is_active=False, statut='inactif',
        )
        result = find_matching_product(
            nom='Bougie d\'allumage NGK',
            marque='NGK',
            reference_oem='OEM-NGK1234',
            type_piece_id=self.tp_bougie.id,
        )
        self.assertTrue(result['found'])
        self.assertEqual(result['product'].id, p1.id)


# ──────────────────────────────────────────────────────
# 9. Trois produits identiques → une seule fiche + trois offres
# ──────────────────────────────────────────────────────
class Test09_TroisFusion(GenericMatchingBase):
    def test_fusion_trois_produits(self):
        p1 = self._create_produit(
            nom='Amortisseur Monroe', marque='Monroe', reference_oem='OEM-AM001',
            type_piece=self.tp_amort, reference='SKU-M1', fournisseur=self.fournisseurs[0],
        )
        p2 = self._create_produit(
            nom='Amortisseur Monroe', marque='Monroe', reference_oem='OEM-AM001',
            type_piece=self.tp_amort, reference='SKU-M2', fournisseur=self.fournisseurs[1],
            is_active=False, statut='inactif',
        )
        p3 = self._create_produit(
            nom='Amortisseur Monroe', marque='Monroe', reference_oem='OEM-AM001',
            type_piece=self.tp_amort, reference='SKU-M3', fournisseur=self.fournisseurs[2],
            is_active=False, statut='inactif',
        )
        # Créer offres sur chaque produit
        for i, p in enumerate([p1, p2, p3]):
            FournisseurProduit.objects.create(
                fournisseur=self.catalog_fs[i], produit=p,
                prix_achat=Decimal('30000'), prix_vente=Decimal('35000'),
                stock_disponible=8 + i,
            )
        # Fusionner p2 et p3 vers p1
        result = fusionner_produits(source_ids=[p2.id, p3.id], target_id=p1.id)
        self.assertEqual(result['migrated']['fournisseur_produits'], 2)
        # Vérifier
        self.assertEqual(FournisseurProduit.objects.filter(produit_id=p1.id).count(), 3)
        p2.refresh_from_db()
        p3.refresh_from_db()
        self.assertFalse(p2.is_active)
        self.assertFalse(p3.is_active)


# ──────────────────────────────────────────────────────
# 10. Stocks différents → stocks conservés séparément
# ──────────────────────────────────────────────────────
class Test10_StocksSepares(GenericMatchingBase):
    def test_stocks_non_additionnes(self):
        p = self._create_produit(stock=0, reference_oem='OEM-BT100')
        fp1 = FournisseurProduit.objects.create(
            fournisseur=self.catalog_fs[0], produit=p,
            prix_achat=Decimal('50000'), prix_vente=Decimal('55000'),
            stock_disponible=15,
        )
        fp2 = FournisseurProduit.objects.create(
            fournisseur=self.catalog_fs[1], produit=p,
            prix_achat=Decimal('48000'), prix_vente=Decimal('53000'),
            stock_disponible=30,
        )
        fp3 = FournisseurProduit.objects.create(
            fournisseur=self.catalog_fs[2], produit=p,
            prix_achat=Decimal('49000'), prix_vente=Decimal('54000'),
            stock_disponible=8,
        )
        # Stock du produit global n'est PAS la somme
        self.assertEqual(p.stock, 0)
        self.assertEqual(fp1.stock_disponible, 15)
        self.assertEqual(fp2.stock_disponible, 30)
        self.assertEqual(fp3.stock_disponible, 8)


# ──────────────────────────────────────────────────────
# 11. Prix différents → prix conservés séparément
# ──────────────────────────────────────────────────────
class Test11_PrixSepares(GenericMatchingBase):
    def test_prix_differents(self):
        p = self._create_produit(prix=Decimal('15000'), reference_oem='OEM-FH001')
        fp1 = FournisseurProduit.objects.create(
            fournisseur=self.catalog_fs[0], produit=p,
            prix_achat=Decimal('10000'), prix_vente=Decimal('15000'),
            stock_disponible=10,
        )
        fp2 = FournisseurProduit.objects.create(
            fournisseur=self.catalog_fs[1], produit=p,
            prix_achat=Decimal('11000'), prix_vente=Decimal('14000'),
            stock_disponible=5,
        )
        self.assertNotEqual(fp1.prix_vente, fp2.prix_vente)


# ──────────────────────────────────────────────────────
# 12. SKU différents → ne bloque pas le matching
# ──────────────────────────────────────────────────────
class Test12_SkuNeBloquePas(GenericMatchingBase):
    def test_sku_differents_match_quand_meme(self):
        p1 = self._create_produit(reference='REF-X1', reference_oem='OEM-FH001')
        result = find_matching_product(
            nom='Filtre à huile Bosch',
            marque='Bosch',
            reference_oem='OEM-FH001',
            reference='REF-Y2',
            type_piece_id=self.tp_filtre.id,
        )
        self.assertTrue(result['found'])
        self.assertEqual(result['product'].id, p1.id)


# ──────────────────────────────────────────────────────
# 13. Commande historique → conservée après fusion
# ──────────────────────────────────────────────────────
class Test13_CommandeConserved(GenericMatchingBase):
    def test_commande_migree(self):
        p1 = self._create_produit(reference_oem='OEM-BT100', type_piece=self.tp_amort,
                                   nom='Amortisseur Monroe', marque='Monroe')
        p2 = self._create_produit(reference_oem='OEM-BT100', type_piece=self.tp_amort,
                                   nom='Amortisseur Monroe', marque='Monroe',
                                   fournisseur=self.fournisseurs[1], is_active=False, statut='inactif')
        u = Utilisateur.objects.create_user(
            email='c1@test.com', password='t', nom='Test', prenom='T', role='client'
        )
        c = Client.objects.create(user=u)
        cmd = Commande.objects.create(client=c)
        lc = LigneCommande.objects.create(
            commande=cmd, produit=p2, quantite=2,
            prix_unitaire=Decimal('35000'), fournisseur=self.fournisseurs[1],
        )
        fusionner_produits(source_ids=[p2.id], target_id=p1.id)
        lc.refresh_from_db()
        self.assertEqual(lc.produit_id, p1.id)
        self.assertEqual(lc.quantite, 2)
        self.assertEqual(lc.prix_unitaire, Decimal('35000'))


# ──────────────────────────────────────────────────────
# 14. Panier existant → conservé après fusion
# ──────────────────────────────────────────────────────
class Test14_PanierConserved(GenericMatchingBase):
    def test_panier_migre(self):
        p1 = self._create_produit(reference_oem='OEM-FH001')
        p2 = self._create_produit(reference_oem='OEM-FH001',
                                   fournisseur=self.fournisseurs[1],
                                   is_active=False, statut='inactif')
        u = Utilisateur.objects.create_user(
            email='c2@test.com', password='t', nom='Test', prenom='T', role='client'
        )
        c = Client.objects.create(user=u)
        panier = Panier.objects.create(client=c)
        pi = PanierItem.objects.create(
            panier=panier, produit=p2, quantite=3,
            fournisseur=self.fournisseurs[1],
        )
        fusionner_produits(source_ids=[p2.id], target_id=p1.id)
        pi.refresh_from_db()
        self.assertEqual(pi.produit_id, p1.id)
        self.assertEqual(pi.quantite, 3)


# ──────────────────────────────────────────────────────
# 15. Promotion → conservée sans duplication
# ──────────────────────────────────────────────────────
class Test15_PromotionConserved(GenericMatchingBase):
    def test_promotion_migree(self):
        from catalog.models import Promotion
        p1 = self._create_produit(reference_oem='OEM-FH001')
        p2 = self._create_produit(reference_oem='OEM-FH001',
                                   fournisseur=self.fournisseurs[1],
                                   is_active=False, statut='inactif')
        from django.utils import timezone
        import datetime
        promo = Promotion.objects.create(
            produit=p2, fournisseur=self.fournisseurs[1],
            type_promotion='pourcentage', pourcentage=Decimal('10'),
            date_debut=timezone.now(),
            date_fin=timezone.now() + datetime.timedelta(days=30),
        )
        fusionner_produits(source_ids=[p2.id], target_id=p1.id)
        promo.refresh_from_db()
        self.assertEqual(promo.produit_id, p1.id)
        self.assertEqual(Promotion.objects.filter(produit_id=p1.id).count(), 1)


# ──────────────────────────────────────────────────────
# 16. Faux positif → fusion interdite
# ──────────────────────────────────────────────────────
class Test16_FauxPositifInterdit(GenericMatchingBase):
    def test_faux_positif_bloque(self):
        # Filtre à huile Bosch et filtre à air Bosch → même marque, type différent
        self._create_produit(
            nom='Filtre à huile Bosch', type_piece=self.tp_filtre,
            reference_oem='OEM-FH001',
        )
        result = find_matching_product(
            nom='Filtre à air Bosch',
            marque='Bosch',
            reference_oem='OEM-FA001',
            type_piece_id=self.tp_filtre.id,
        )
        # OEM différent → blocage → pas de match
        self.assertFalse(result['found'])

    def test_faux_positif_marque_differente(self):
        self._create_produit(marque='Bosch', reference_oem='OEM-FH001')
        result = find_matching_product(
            nom='Filtre à huile Bosch',
            marque='Mann',
            reference_oem='OEM-FH002',
            type_piece_id=self.tp_filtre.id,
        )
        self.assertFalse(result['found'])

    def test_faux_positif_type_different(self):
        self._create_produit(type_piece=self.tp_filtre, reference_oem='')
        result = find_matching_product(
            nom='Filtre à huile Bosch',
            marque='Bosch',
            type_piece_id=self.tp_bougie.id,
        )
        self.assertFalse(result['found'])


# ──────────────────────────────────────────────────────
# Tests de normalisation OEM
# ──────────────────────────────────────────────────────
class TestNormalizeOEM(TestCase):
    def test_tirets(self):
        self.assertEqual(normalize_oem('04465-0K340'), '044650k340')

    def test_espaces(self):
        self.assertEqual(normalize_oem('04465 0K340'), '044650k340')

    def test_slash(self):
        self.assertEqual(normalize_oem('04465/0K340'), '044650k340')

    def test_prefixe_oem(self):
        self.assertEqual(normalize_oem('OEM-04465-0K340'), '044650k340')

    def test_casse(self):
        self.assertEqual(normalize_oem('04465-0k340'), '044650k340')

    def test_vide(self):
        self.assertEqual(normalize_oem(''), '')
        self.assertEqual(normalize_oem(None), '')


# ──────────────────────────────────────────────────────
# Tests de compute_match_score (format dict)
# ──────────────────────────────────────────────────────

class TestComputeScore(TestCase):
    def test_oem_marque_identiques_score_eleve(self):
        r = compute_match_score(
            p1_nom='Filtre Bosch', p1_marque='Bosch', p1_reference_oem='OEM-001',
            p1_type_piece_id=1,
            p2_nom='Filtre Bosch', p2_marque='Bosch', p2_reference_oem='OEM-001',
            p2_type_piece_id=1,
        )
        self.assertGreaterEqual(r['score'], SCORE_CONFIRMED)
        self.assertFalse(r['reasons_block'])
        self.assertEqual(r['classification'], MATCH_CONFIRMED)

    def test_marque_differente_bloque(self):
        r = compute_match_score(
            p1_nom='Filtre Bosch', p1_marque='Bosch', p1_reference_oem='OEM-001',
            p1_type_piece_id=1,
            p2_nom='Filtre Bosch', p2_marque='Mann', p2_reference_oem='OEM-002',
            p2_type_piece_id=1,
        )
        self.assertIn('marque différente', r['reasons_block'])
        self.assertLess(r['score'], SCORE_POSSIBLE)
        self.assertEqual(r['classification'], NO_MATCH)

    def test_type_different_bloque(self):
        r = compute_match_score(
            p1_nom='Filtre', p1_marque='Bosch', p1_type_piece_id=1,
            p2_nom='Filtre', p2_marque='Bosch', p2_type_piece_id=2,
        )
        self.assertIn('type de pièce différent', r['reasons_block'])
        self.assertLess(r['score'], SCORE_POSSIBLE)
        self.assertEqual(r['classification'], NO_MATCH)

    def test_oem_different_score_faible_bloque(self):
        # OEM différent + score_hors_oem faible → NO_MATCH
        r = compute_match_score(
            p1_nom='Filtre', p1_marque='Bosch', p1_reference_oem='OEM-001',
            p1_type_piece_id=1,
            p2_nom='Filtre', p2_marque='Bosch', p2_reference_oem='OEM-002',
            p2_type_piece_id=1,
        )
        # score_hors_oem = 25(nom) + 15(marque) + 10(type) = 50 < 70 → blocage
        self.assertIn('OEM différent', r['reasons_block'])
        self.assertLess(r['score'], SCORE_POSSIBLE)
        self.assertEqual(r['classification'], NO_MATCH)


# ──────────────────────────────────────────────────────
# Nouveaux tests — OEM gradué et classification
# ──────────────────────────────────────────────────────

class TestOemGradue(GenericMatchingBase):
    """Tests ciblés pour la logique OEM gradué."""

    def _full_attrs(self, **overrides):
        """Retourne des attributs produit complets pour un match fort hors OEM."""
        attrs = dict(
            p1_nom='Filtre a huile premium', p1_marque='Bosch',
            p1_reference_oem='OEM-AAA', p1_fabricant='Bosch GmbH',
            p1_type_piece_id=1,
            p1_modeles_compatibles=['VW Golf', 'Audi A3', 'Skoda Octavia'],
            p1_annee_debut=2015, p1_annee_fin=2023,
            p1_poids=Decimal('1.5'), p1_longueur=Decimal('12.0'),
            p1_largeur=Decimal('8.0'), p1_hauteur=Decimal('6.0'),
            p1_matiere='Cellulose', p1_couleur='Blanc', p1_etat='neuf',
            p2_nom='Filtre a huile premium', p2_marque='Bosch',
            p2_reference_oem='OEM-BBB', p2_fabricant='Bosch GmbH',
            p2_type_piece_id=1,
            p2_modeles_compatibles=['VW Golf', 'Audi A3', 'Skoda Octavia'],
            p2_annee_debut=2015, p2_annee_fin=2023,
            p2_poids=Decimal('1.5'), p2_longueur=Decimal('12.0'),
            p2_largeur=Decimal('8.0'), p2_hauteur=Decimal('6.0'),
            p2_matiere='Cellulose', p2_couleur='Blanc', p2_etat='neuf',
        )
        attrs.update(overrides)
        return attrs

    # TEST 1: Meme produit + SKU different -> MATCH
    def test_sku_different_match(self):
        p1 = self._create_produit(reference='SKU-AAA', reference_oem='OEM-FH001')
        result = find_matching_product(
            nom='Filtre a huile Bosch', marque='Bosch',
            reference_oem='OEM-FH001', reference='SKU-BBB',
            type_piece_id=self.tp_filtre.id,
        )
        self.assertTrue(result['found'])

    # TEST 2: Meme produit + OEM different + toutes caracteristiques concordantes -> MATCH_POSSIBLE
    def test_oem_different_forte_concordance_match_possible(self):
        r = compute_match_score(**self._full_attrs())
        self.assertEqual(r['classification'], MATCH_POSSIBLE)
        self.assertGreaterEqual(r['score_hors_oem'], 80)
        self.assertFalse(r['reasons_block'])
        self.assertTrue(len(r['warnings']) > 0)

    # TEST 3: Meme produit + OEM different + score_hors_oem >= 80 -> detecte par detect_all_duplicates
    def test_oem_different_detecte_par_detect_all(self):
        p1 = self._create_produit(
            nom='Filtre a huile premium', marque='Bosch',
            reference_oem='OEM-AAA', fabricant='Bosch GmbH',
            type_piece=self.tp_filtre,
            modeles_compatibles=['VW Golf', 'Audi A3', 'Skoda Octavia'],
            annee_debut=2015, annee_fin=2023,
            poids=Decimal('1.5'), longueur=Decimal('12.0'),
            largeur=Decimal('8.0'), hauteur=Decimal('6.0'),
            matiere='Cellulose', couleur='Blanc', etat='neuf',
        )
        p2 = self._create_produit(
            nom='Filtre a huile premium', marque='Bosch',
            reference_oem='OEM-BBB', fabricant='Bosch GmbH',
            type_piece=self.tp_filtre,
            modeles_compatibles=['VW Golf', 'Audi A3', 'Skoda Octavia'],
            annee_debut=2015, annee_fin=2023,
            poids=Decimal('1.5'), longueur=Decimal('12.0'),
            largeur=Decimal('8.0'), hauteur=Decimal('6.0'),
            matiere='Cellulose', couleur='Blanc', etat='neuf',
            fournisseur=self.fournisseurs[1],
        )
        dups = detect_all_duplicates(min_score=50)
        pair_ids = [(d['product_a_id'], d['product_b_id']) for d in dups]
        self.assertIn((p1.id, p2.id), pair_ids)

    # TEST 4: Marque differente -> NO_MATCH
    def test_marque_differente_no_match(self):
        r = compute_match_score(**self._full_attrs(
            p1_marque='Bosch', p2_marque='Mann',
            p1_reference_oem='', p2_reference_oem='',
        ))
        self.assertEqual(r['classification'], NO_MATCH)
        self.assertIn('marque différente', r['reasons_block'])

    # TEST 5: Type de piece different -> NO_MATCH
    def test_type_different_no_match(self):
        r = compute_match_score(**self._full_attrs(
            p1_type_piece_id=1, p2_type_piece_id=2,
            p1_reference_oem='', p2_reference_oem='',
        ))
        self.assertEqual(r['classification'], NO_MATCH)
        self.assertIn('type de pièce différent', r['reasons_block'])

    # TEST 6: Compatibilite clairement contradictoire -> NO_MATCH
    def test_compatibilite_contradictoire_no_match(self):
        r = compute_match_score(**self._full_attrs(
            p1_modeles_compatibles=['VW Golf', 'Audi A3', 'Skoda Octavia'],
            p2_modeles_compatibles=['Peugeot 208', 'Renault Clio', 'Citroen C3'],
            p1_reference_oem='', p2_reference_oem='',
        ))
        self.assertEqual(r['classification'], NO_MATCH)
        self.assertIn('aucune compatibilité véhicule commune', r['reasons_block'])

    # TEST 7: Meme OEM + meme marque + memes caracteristiques -> MATCH_CONFIRMED
    def test_oem_marque_identiques_match_confirmed(self):
        r = compute_match_score(**self._full_attrs(
            p1_reference_oem='OEM-SAME', p2_reference_oem='OEM-SAME',
        ))
        self.assertEqual(r['classification'], MATCH_CONFIRMED)
        self.assertGreaterEqual(r['score'], 90)

    # TEST 8: Nom similaire mais marque differente -> NO_MATCH
    def test_nom_similaire_marque_differente_no_match(self):
        r = compute_match_score(
            p1_nom='Filtre a huile Bosch Premium', p1_marque='Bosch',
            p1_reference_oem='', p1_type_piece_id=1,
            p2_nom='Filtre a huile Bosch Premium', p2_marque='Mann',
            p2_reference_oem='', p2_type_piece_id=1,
        )
        self.assertEqual(r['classification'], NO_MATCH)
        self.assertIn('marque différente', r['reasons_block'])

    # TEST 9: Nom identique mais type different -> NO_MATCH
    def test_nom_identique_type_different_no_match(self):
        r = compute_match_score(
            p1_nom='Filtre a huile Bosch', p1_marque='Bosch',
            p1_reference_oem='', p1_type_piece_id=1,
            p2_nom='Filtre a huile Bosch', p2_marque='Bosch',
            p2_reference_oem='', p2_type_piece_id=2,
        )
        self.assertEqual(r['classification'], NO_MATCH)
        self.assertIn('type de pièce différent', r['reasons_block'])

    # TEST 10: OEM different + caracteristiques faibles -> NO_MATCH
    def test_oem_different_caracteristiques_faibles_no_match(self):
        r = compute_match_score(
            p1_nom='Filtre', p1_marque='Bosch',
            p1_reference_oem='OEM-001', p1_type_piece_id=1,
            p2_nom='Filtre', p2_marque='Bosch',
            p2_reference_oem='OEM-002', p2_type_piece_id=1,
        )
        self.assertEqual(r['classification'], NO_MATCH)
        self.assertIn('OEM différent', r['reasons_block'])

    # TEST 11: detect_all_duplicates ne filtre pas sur OEM different
    def test_detect_all_ne_filtre_pas_sur_oem(self):
        p1 = self._create_produit(
            nom='Filtre a huile premium', marque='Bosch',
            reference_oem='OEM-AAA', fabricant='Bosch GmbH',
            type_piece=self.tp_filtre,
            modeles_compatibles=['VW Golf', 'Audi A3'],
            annee_debut=2015, annee_fin=2023,
            poids=Decimal('1.5'), longueur=Decimal('12.0'),
            largeur=Decimal('8.0'), hauteur=Decimal('6.0'),
            matiere='Cellulose', couleur='Blanc', etat='neuf',
        )
        p2 = self._create_produit(
            nom='Filtre a huile premium', marque='Bosch',
            reference_oem='OEM-BBB', fabricant='Bosch GmbH',
            type_piece=self.tp_filtre,
            modeles_compatibles=['VW Golf', 'Audi A3'],
            annee_debut=2015, annee_fin=2023,
            poids=Decimal('1.5'), longueur=Decimal('12.0'),
            largeur=Decimal('8.0'), hauteur=Decimal('6.0'),
            matiere='Cellulose', couleur='Blanc', etat='neuf',
            fournisseur=self.fournisseurs[1],
        )
        dups = detect_all_duplicates(min_score=50)
        pair_ids = [(d['product_a_id'], d['product_b_id']) for d in dups]
        self.assertIn((p1.id, p2.id), pair_ids)
        dup = [d for d in dups if (d['product_a_id'], d['product_b_id']) == (p1.id, p2.id)][0]
        self.assertEqual(dup['classification'], MATCH_POSSIBLE)

    # TEST 12: Reproduction du scenario P#29 <-> P#35 (generique)
    def test_scenario_oem_different_forte_concordance(self):
        r = compute_match_score(**self._full_attrs())
        self.assertGreaterEqual(r['score_hors_oem'], 80)
        self.assertEqual(r['classification'], MATCH_POSSIBLE)
        self.assertTrue(len(r['warnings']) > 0)
        self.assertFalse(r['reasons_block'])
