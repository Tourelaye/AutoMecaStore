from rest_framework.test import APITestCase
from rest_framework import status
from django.test import TestCase
from .models import Utilisateur, Client, VehiculeClient
from catalog.models import Produit
from catalog.serializers import evaluer_compatibilite


class VehiculeClientTests(APITestCase):
    def setUp(self):
        self.user = Utilisateur.objects.create_user(
            email='client@test.com', password='pass1234', nom='Doe', prenom='John', role='client'
        )
        self.client_ = Client.objects.create(user=self.user)
        self.client.force_authenticate(user=self.user)

    def test_creer_vehicule(self):
        r = self.client.post('/api/vehicules/', {
            'marque': 'Toyota', 'modele': 'Hilux', 'annee': 2018,
            'motorisation': '2.4 D-4D', 'carburant': 'Diesel'
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(VehiculeClient.objects.count(), 1)

    def test_seul_client_voit_ses_vehicules(self):
        other_user = Utilisateur.objects.create_user(
            email='other@test.com', password='pass1234', nom='A', prenom='B', role='client'
        )
        other_client = Client.objects.create(user=other_user)
        VehiculeClient.objects.create(client=other_client, marque='Peugeot', modele='308', annee=2021)
        VehiculeClient.objects.create(client=self.client_, marque='Toyota', modele='Hilux', annee=2018)
        r = self.client.get('/api/vehicules/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]['marque'], 'Toyota')

    def test_un_seul_vehicule_actif(self):
        v1 = VehiculeClient.objects.create(client=self.client_, marque='Toyota', modele='Hilux', annee=2018, actif=True)
        v2 = VehiculeClient.objects.create(client=self.client_, marque='Kia', modele='Sportage', annee=2020, actif=True)
        self.assertFalse(VehiculeClient.objects.get(pk=v1.pk).actif)
        self.assertTrue(VehiculeClient.objects.get(pk=v2.pk).actif)

    def test_supprimer_vehicule(self):
        v = VehiculeClient.objects.create(client=self.client_, marque='Kia', modele='Sportage', annee=2020)
        r = self.client.delete(f'/api/vehicules/{v.pk}/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(VehiculeClient.objects.count(), 0)


class CompatibiliteVehiculeTests(TestCase):
    def setUp(self):
        self.vehicule = {'marque': 'Toyota', 'modele': 'Hilux', 'annee': 2018, 'motorisation': '2.4 D-4D'}

    def test_compatible(self):
        p = Produit(nom='Plaquettes', compatibilites=[
            {'marque': 'Toyota', 'modele': 'Hilux', 'annee_debut': 2016, 'annee_fin': 2020, 'motorisation': '2.4 D-4D'}
        ])
        self.assertEqual(evaluer_compatibilite(p, self.vehicule)['statut'], 'compatible')

    def test_incompatible_annee(self):
        p = Produit(nom='Plaquettes', compatibilites=[
            {'marque': 'Toyota', 'modele': 'Hilux', 'annee_debut': 2010, 'annee_fin': 2015}
        ])
        self.assertEqual(evaluer_compatibilite(p, self.vehicule)['statut'], 'non_compatible')

    def test_a_verifier_incomplet(self):
        p = Produit(nom='Plaquettes', compatibilites=[
            {'marque': 'Toyota', 'modele': 'Hilux'}
        ])
        self.assertEqual(evaluer_compatibilite(p, self.vehicule)['statut'], 'a_verifier')

    def test_a_verifier_sans_info(self):
        p = Produit(nom='Plaquettes')
        self.assertEqual(evaluer_compatibilite(p, self.vehicule)['statut'], 'a_verifier')
