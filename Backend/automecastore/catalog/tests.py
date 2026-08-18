from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Categorie, Produit


class ProduitSearchTests(APITestCase):
    def setUp(self):
        self.categorie = Categorie.objects.create(nom='Freinage', etat=True)
        self.p1 = Produit.objects.create(
            nom='Plaquettes de frein',
            marque='Bosch',
            reference='PLQ-123',
            reference_oem='04465-0K240',
            description='Plaquettes avant',
            mots_cles=['plaquettes', 'frein', 'toyota'],
            modeles_compatibles=['Hilux'],
            compatibilites=[
                {'marque': 'Toyota', 'modele': 'Hilux', 'annee_debut': 2015, 'annee_fin': 2020}
            ],
            annee_debut=2015,
            annee_fin=2020,
            prix=25000,
            stock=10,
            categorie=self.categorie,
            is_active=True,
            statut='actif',
            statut_approbation='approuve'
        )
        self.p2 = Produit.objects.create(
            nom='Amortisseur arrière Peugeot 308',
            marque='Monroe',
            reference='AMO-456',
            description='Amortisseur pour Peugeot',
            mots_cles=['amortisseur', 'peugeot', '308'],
            prix=45000,
            stock=5,
            is_active=True,
            statut='actif',
            statut_approbation='approuve'
        )

    def _results(self, r):
        return r.data.get('results', r.data) if isinstance(r.data, dict) else r.data

    def test_search_multi_token(self):
        r = self.client.get('/api/produits/', {'search': 'plaquette frein'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._results(r)), 1)

    def test_search_oem(self):
        r = self.client.get('/api/produits/', {'search': '04465-0K240'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._results(r)), 1)
        self.assertEqual(self._results(r)[0]['reference_oem'], '04465-0K240')

    def test_search_no_result(self):
        r = self.client.get('/api/produits/', {'search': 'volant ferrari'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._results(r)), 0)

    def test_autocomplete(self):
        r = self.client.get('/api/produits/autocomplete/', {'q': 'plaq'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('suggestions', r.data)
        self.assertTrue(len(r.data['suggestions']) > 0)

    def test_vehicle_filter(self):
        r = self.client.get('/api/produits/', {'veh_marque': 'Toyota', 'veh_modele': 'Hilux', 'veh_annee': 2018})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._results(r)), 1)
