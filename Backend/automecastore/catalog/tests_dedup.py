"""
Tests de déduplication des produits AutoMecaStore.

Valident que :
- 1 produit = 1 produit catalogue global
- 1 fournisseur = 1 offre sur ce produit
- Le matching fonctionne par hiérarchie de confiance
- Les contraintes d'unicité empêchent les doublons d'offres
- Le panier et les commandes conservent leurs références
"""
from django.test import TestCase
from decimal import Decimal
from .models import (
    Categorie, TypePiece, Produit, Fournisseur as CatalogFournisseur,
    FournisseurProduit
)
from .product_matching import find_matching_product, normalize_product_text
from account.models import Utilisateur, Fournisseur as AccountFournisseur
from orders.models import Panier, PanierItem, Commande, LigneCommande


class DedupBaseTestCase(TestCase):
    """Classe de base avec données communes pour les tests de déduplication."""

    def setUp(self):
        # Catégorie et type de pièce
        self.categorie = Categorie.objects.create(nom='Freinage', etat=True)
        self.type_piece = TypePiece.objects.create(nom='Freinage', categorie=self.categorie)

        # Utilisateurs fournisseurs
        self.user_a = Utilisateur.objects.create_user(
            email='fournisseur.a@test.com',
            password='testpass123',
            nom='Entreprise A',
            prenom='Jean',
            role='fournisseur'
        )
        self.user_b = Utilisateur.objects.create_user(
            email='fournisseur.b@test.com',
            password='testpass123',
            nom='Entreprise B',
            prenom='Marie',
            role='fournisseur'
        )

        # Fournisseurs compte
        self.fournisseur_a = AccountFournisseur.objects.create(
            user=self.user_a,
            nom_entreprise='Pieces Auto A',
            statut='actif'
        )
        self.fournisseur_b = AccountFournisseur.objects.create(
            user=self.user_b,
            nom_entreprise='Pieces Auto B',
            statut='actif'
        )

        # Fournisseurs catalogue
        self.catalog_f_a = CatalogFournisseur.objects.create(
            nom_entreprise='Pieces Auto A',
            administrateur=self.user_a
        )
        self.catalog_f_b = CatalogFournisseur.objects.create(
            nom_entreprise='Pieces Auto B',
            administrateur=self.user_b
        )

    def _create_produit(self, **kwargs):
        """Crée un produit avec les valeurs par défaut."""
        defaults = {
            'nom': 'Plaquettes de frein avant',
            'description': 'Plaquettes de frein avant Toyota Hilux',
            'prix': Decimal('25000'),
            'stock': 10,
            'marque': 'Brembo',
            'reference_oem': '04465-0K240',
            'reference': 'PLQ-123',
            'fabricant': 'Brembo',
            'categorie': self.categorie,
            'type_piece': self.type_piece,
            'is_active': True,
            'statut': 'actif',
            'statut_approbation': 'approuve',
            'fournisseur': self.fournisseur_a,
        }
        defaults.update(kwargs)
        return Produit.objects.create(**defaults)


class Test1_FournisseurACreeProduit(DedupBaseTestCase):
    """TEST 1 : Fournisseur A crée un produit → Produit créé."""

    def test_produit_cree(self):
        p = self._create_produit()
        self.assertIsNotNone(p.id)
        self.assertEqual(p.nom, 'Plaquettes de frein avant')
        self.assertEqual(p.marque, 'Brembo')


class Test2_FournisseurBCreeMemeProduit(DedupBaseTestCase):
    """TEST 2 : Fournisseur B crée exactement le même produit → Aucun deuxième Produit créé."""

    def test_pas_de_deuxieme_produit(self):
        p1 = self._create_produit()
        result = find_matching_product(
            nom='Plaquettes de frein avant',
            marque='Brembo',
            reference_oem='04465-0K240',
            reference='PLQ-123',
            type_piece_id=self.type_piece.id,
        )
        self.assertTrue(result['found'])
        self.assertFalse(result['ambiguous'])
        self.assertEqual(result['product'].id, p1.id)


class Test3_FournisseurBPossedeNouvelleOffre(DedupBaseTestCase):
    """TEST 3 : Fournisseur B possède une nouvelle FournisseurProduit liée au Produit existant."""

    def test_nouvelle_offre(self):
        p = self._create_produit()
        FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_b,
            produit=p,
            prix_achat=Decimal('42000'),
            prix_vente=Decimal('42000'),
            stock_disponible=5
        )
        offres = FournisseurProduit.objects.filter(produit=p)
        self.assertEqual(offres.count(), 1)
        self.assertEqual(offres[0].fournisseur, self.catalog_f_b)


class Test4_DeuxFournisseursPrixDifferents(DedupBaseTestCase):
    """TEST 4 : Deux fournisseurs avec prix différents → Un seul Produit + deux offres."""

    def test_un_produit_deux_offres(self):
        p = self._create_produit()
        FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_a,
            produit=p,
            prix_achat=Decimal('45000'),
            prix_vente=Decimal('45000'),
            stock_disponible=10
        )
        FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_b,
            produit=p,
            prix_achat=Decimal('42000'),
            prix_vente=Decimal('42000'),
            stock_disponible=5
        )
        self.assertEqual(Produit.objects.filter(reference_oem='04465-0K240').count(), 1)
        self.assertEqual(FournisseurProduit.objects.filter(produit=p).count(), 2)


class Test5_DeuxFournisseursStocksDifferents(DedupBaseTestCase):
    """TEST 5 : Deux fournisseurs avec stocks différents → Stocks conservés séparément."""

    def test_stocks_separement(self):
        p = self._create_produit()
        fp_a = FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_a,
            produit=p,
            prix_achat=Decimal('45000'),
            prix_vente=Decimal('45000'),
            stock_disponible=10
        )
        fp_b = FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_b,
            produit=p,
            prix_achat=Decimal('42000'),
            prix_vente=Decimal('42000'),
            stock_disponible=5
        )
        self.assertEqual(fp_a.stock_disponible, 10)
        self.assertEqual(fp_b.stock_disponible, 5)


class Test6_MemeNomOEMDifferent(DedupBaseTestCase):
    """TEST 6 : Deux produits avec mêmes noms mais OEM différents → Deux Produits."""

    def test_deux_produits_oem_differents(self):
        p1 = self._create_produit(reference_oem='OEM-001')
        p2 = self._create_produit(
            reference_oem='OEM-002',
            fournisseur=self.fournisseur_b
        )
        self.assertNotEqual(p1.id, p2.id)
        self.assertEqual(Produit.objects.filter(nom='Plaquettes de frein avant').count(), 2)


class Test7_MemeOEMMarquesDifferentes(DedupBaseTestCase):
    """TEST 7 : Même OEM mais marques différentes → Ne PAS fusionner (blocage critique)."""

    def test_oem_marques_differentes(self):
        p1 = self._create_produit(marque='Brembo', reference_oem='OEM-001')
        result = find_matching_product(
            nom='Plaquettes de frein avant',
            marque='ATE',
            reference_oem='OEM-001',
        )
        # OEM identique mais marque différente → blocage critique → pas de match
        self.assertFalse(result['found'])


class Test8_MemeNomTypePieceDifferent(DedupBaseTestCase):
    """TEST 8 : Même nom mais type de pièce différent → Pas de match."""

    def test_nom_type_different(self):
        type_piece2 = TypePiece.objects.create(nom='Suspension', categorie=self.categorie)
        p1 = self._create_produit(type_piece=self.type_piece)
        # Cherche avec même OEM+marque mais type différent
        result = find_matching_product(
            nom='Plaquettes de frein avant',
            marque='Brembo',
            reference_oem='04465-0K240',
            type_piece_id=type_piece2.id,
        )
        # OEM identique + marque identique mais type différent → blocage critique → pas de match
        self.assertFalse(result['found'])

    def test_nom_type_different_sans_oem(self):
        """Sans OEM, nom identique mais type différent → pas de match NIVEAU 2."""
        type_piece2 = TypePiece.objects.create(nom='Suspension', categorie=self.categorie)
        p1 = self._create_produit(reference_oem='', type_piece=self.type_piece)
        result = find_matching_product(
            nom='Plaquettes de frein avant',
            marque='Brembo',
            type_piece_id=type_piece2.id,
        )
        # NIVEAU 2 filtre par type_piece_id → p1 a un type différent → pas de match
        # NIVEAU 3: pas de modeles_compatibles → pas de match
        self.assertFalse(result['found'])


class Test9_MemeFournisseurMemeProduit(DedupBaseTestCase):
    """TEST 9 : Même fournisseur + même produit → Impossible de créer deux offres identiques."""

    def test_unique_constraint(self):
        p = self._create_produit()
        FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_a,
            produit=p,
            prix_achat=Decimal('45000'),
            prix_vente=Decimal('45000'),
            stock_disponible=10
        )
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            FournisseurProduit.objects.create(
                fournisseur=self.catalog_f_a,
                produit=p,
                prix_achat=Decimal('42000'),
                prix_vente=Decimal('42000'),
                stock_disponible=5
            )


class Test10_ProduitDetailSerializerOffres(DedupBaseTestCase):
    """TEST 10 : Produit avec plusieurs offres → ProduitDetailSerializer retourne toutes les offres."""

    def test_serializer_retourne_offres(self):
        from catalog.serializers import ProduitDetailSerializer
        from rest_framework.request import Request
        from rest_framework.test import APIRequestFactory

        p = self._create_produit()
        FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_a,
            produit=p,
            prix_achat=Decimal('45000'),
            prix_vente=Decimal('45000'),
            stock_disponible=10
        )
        FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_b,
            produit=p,
            prix_achat=Decimal('42000'),
            prix_vente=Decimal('42000'),
            stock_disponible=5
        )

        factory = APIRequestFactory()
        request = factory.get('/')
        serializer = ProduitDetailSerializer(p, context={'request': request})
        data = serializer.data

        self.assertIn('offres', data)
        self.assertEqual(len(data['offres']), 2)


class Test11_PanierDeuxFournisseurs(DedupBaseTestCase):
    """TEST 11 : Panier avec deux fournisseurs pour le même produit → Deux lignes distinctes."""

    def test_panier_deux_lignes(self):
        from account.models import Client

        user_client = Utilisateur.objects.create_user(
            email='client@test.com',
            password='testpass123',
            nom='Dupont',
            prenom='Pierre',
            role='client'
        )
        client = Client.objects.create(user=user_client)

        p = self._create_produit()
        fp_a = FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_a,
            produit=p,
            prix_achat=Decimal('45000'),
            prix_vente=Decimal('45000'),
            stock_disponible=10
        )
        fp_b = FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_b,
            produit=p,
            prix_achat=Decimal('42000'),
            prix_vente=Decimal('42000'),
            stock_disponible=5
        )

        panier = Panier.objects.create(client=client)
        PanierItem.objects.create(
            panier=panier,
            produit=p,
            fournisseur=self.fournisseur_a,
            quantite=1
        )
        PanierItem.objects.create(
            panier=panier,
            produit=p,
            fournisseur=self.fournisseur_b,
            quantite=2
        )

        self.assertEqual(panier.items.count(), 2)
        items = list(panier.items.all())
        self.assertNotEqual(items[0].fournisseur_id, items[1].fournisseur_id)


class Test12_CommandeDeuxFournisseurs(DedupBaseTestCase):
    """TEST 12 : Commande avec deux fournisseurs pour le même produit → LigneCommande conservent fournisseur."""

    def test_commande_deux_lignes(self):
        from account.models import Client

        user_client = Utilisateur.objects.create_user(
            email='client2@test.com',
            password='testpass123',
            nom='Martin',
            prenom='Sophie',
            role='client'
        )
        client = Client.objects.create(user=user_client)

        p = self._create_produit()
        FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_a,
            produit=p,
            prix_achat=Decimal('45000'),
            prix_vente=Decimal('45000'),
            stock_disponible=10
        )
        FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_b,
            produit=p,
            prix_achat=Decimal('42000'),
            prix_vente=Decimal('42000'),
            stock_disponible=5
        )

        commande = Commande.objects.create(client=client)
        LigneCommande.objects.create(
            commande=commande,
            produit=p,
            fournisseur=self.fournisseur_a,
            quantite=1,
            prix_unitaire=Decimal('45000')
        )
        LigneCommande.objects.create(
            commande=commande,
            produit=p,
            fournisseur=self.fournisseur_b,
            quantite=2,
            prix_unitaire=Decimal('42000')
        )

        self.assertEqual(commande.lignes.count(), 2)
        lignes = list(commande.lignes.all())
        self.assertNotEqual(lignes[0].fournisseur_id, lignes[1].fournisseur_id)
        self.assertEqual(lignes[0].produit_id, lignes[1].produit_id)


class TestNormalizeText(TestCase):
    """Tests pour normalize_product_text()."""

    def test_minuscules(self):
        self.assertEqual(normalize_product_text('PLAQUETTES'), 'plaquettes')

    def test_accents(self):
        self.assertEqual(normalize_product_text('plaquéttes'), 'plaquettes')

    def test_espaces_multiples(self):
        self.assertEqual(normalize_product_text('plaquettes  de  frein'), 'plaquettes de frein')

    def test_tirets(self):
        self.assertEqual(normalize_product_text('plaquettes-de-frein'), 'plaquettes de frein')

    def test_trim(self):
        self.assertEqual(normalize_product_text('  plaquettes  '), 'plaquettes')

    def test_vide(self):
        self.assertEqual(normalize_product_text(''), '')
        self.assertEqual(normalize_product_text(None), '')


class TestMatchAmbiguous(DedupBaseTestCase):
    """Tests pour les cas ambigus du matching."""

    def test_ambiguous_oem(self):
        """Deux produits avec même OEM et même marque → ambiguous."""
        p1 = self._create_produit(reference_oem='OEM-DUP')
        p2 = self._create_produit(
            reference_oem='OEM-DUP',
            fournisseur=self.fournisseur_b,
            nom='Plaquettes avant autre'
        )
        result = find_matching_product(
            nom='Plaquettes',
            marque='Brembo',
            reference_oem='OEM-DUP',
            fabricant='Brembo',
            type_piece_id=self.type_piece.id,
        )
        # Deux produits avec même OEM + même marque → ambiguous (high confidence)
        self.assertTrue(result['found'])
        self.assertTrue(result['ambiguous'])

    def test_no_match(self):
        """Aucun produit correspondant."""
        result = find_matching_product(
            nom='Filtre à air',
            marque='Mann',
            reference_oem='OEM-NEW',
        )
        self.assertFalse(result['found'])


class Test13_MatchingInactifs(DedupBaseTestCase):
    """TEST 13 : Le matching inclut les produits inactifs (soft-deleted)."""

    def test_match_produit_inactif(self):
        p1 = self._create_produit(is_active=False, statut='inactif')
        result = find_matching_product(
            nom='Plaquettes de frein avant',
            marque='Brembo',
            reference_oem='04465-0K240',
            type_piece_id=self.type_piece.id,
        )
        self.assertTrue(result['found'])
        self.assertEqual(result['product'].id, p1.id)

    def test_match_produit_inactif_par_nom(self):
        p1 = self._create_produit(
            is_active=False, statut='inactif', reference_oem='',
            modeles_compatibles=['Toyota Hilux', 'Nissan Navara'],
            matiere='Ceramique', etat='neuf', poids=Decimal('1.2'),
        )
        result = find_matching_product(
            nom='Plaquettes de frein avant',
            marque='Brembo',
            type_piece_id=self.type_piece.id,
            fabricant='Brembo',
            modeles_compatibles=['Toyota Hilux', 'Nissan Navara'],
            matiere='Ceramique', etat='neuf', poids=Decimal('1.2'),
        )
        self.assertTrue(result['found'])
        self.assertEqual(result['product'].id, p1.id)


class Test14_ReferenceSkipped(DedupBaseTestCase):
    """TEST 14 : Produit.reference (SKU interne) n'est pas utilisé pour le matching."""

    def test_ref_differente_nom_identique_match(self):
        """Deux produits avec références différentes mais même nom/marque/type → match."""
        p1 = self._create_produit(
            reference='SKU-A', reference_oem='',
            modeles_compatibles=['Toyota Hilux', 'Nissan Navara'],
            matiere='Ceramique', etat='neuf', poids=Decimal('1.2'),
        )
        result = find_matching_product(
            nom='Plaquettes de frein avant',
            marque='Brembo',
            reference='SKU-B',
            type_piece_id=self.type_piece.id,
            fabricant='Brembo',
            modeles_compatibles=['Toyota Hilux', 'Nissan Navara'],
            matiere='Ceramique', etat='neuf', poids=Decimal('1.2'),
        )
        # NIVEAU 2: nom normalisé identique + marque + type + fabricant + compat → match
        self.assertTrue(result['found'])
        self.assertEqual(result['confidence'], 'medium')
        self.assertEqual(result['product'].id, p1.id)


class Test15_StockDecrement(DedupBaseTestCase):
    """TEST 15 : Décrémentation de stock — seul FP.stock_disponible est décrémenté si offre existe."""

    def test_decrement_fp_only(self):
        """Quand une offre FP existe, seul FP.stock_disponible est décrémenté, pas Produit.stock."""
        from orders.views import _offre_et_stock

        p = self._create_produit(stock=20)
        fp = FournisseurProduit.objects.create(
            fournisseur=self.catalog_f_a,
            produit=p,
            prix_achat=Decimal('45000'),
            prix_vente=Decimal('45000'),
            stock_disponible=10
        )

        offre, stock = _offre_et_stock(p, self.fournisseur_a)
        self.assertIsNotNone(offre)
        self.assertEqual(stock, 10)

        # Simuler décrémentation
        if offre and offre.stock_disponible is not None:
            offre.stock_disponible = max(0, offre.stock_disponible - 1)
            offre.save()
        else:
            p.stock = max(0, p.stock - 1)
            p.save()

        p.refresh_from_db()
        fp.refresh_from_db()
        self.assertEqual(fp.stock_disponible, 9)
        self.assertEqual(p.stock, 20)  # Inchangé

    def test_decrement_produit_stock_no_fp(self):
        """Sans offre FP, Produit.stock est décrémenté (fallback legacy)."""
        from orders.views import _offre_et_stock

        p = self._create_produit(stock=20, fournisseur=self.fournisseur_b)
        # Pas de FournisseurProduit pour ce fournisseur
        offre, stock = _offre_et_stock(p, self.fournisseur_b)
        self.assertIsNone(offre)
        self.assertEqual(stock, 20)

        if offre and offre.stock_disponible is not None:
            offre.stock_disponible = max(0, offre.stock_disponible - 1)
            offre.save()
        else:
            p.stock = max(0, p.stock - 1)
            p.save()

        p.refresh_from_db()
        self.assertEqual(p.stock, 19)
