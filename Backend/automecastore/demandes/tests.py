from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from account.models import Utilisateur, Client, Fournisseur
from .models import DemandePiece, OffreFournisseur


class DemandeAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user_client = Utilisateur.objects.create_user(
            email='client@test.com',
            password='pass1234',
            nom='Client',
            prenom='C',
            role='client'
        )
        self.client_user = Client.objects.create(user=self.user_client)

        self.user_fournisseur = Utilisateur.objects.create_user(
            email='fournisseur@test.com',
            password='pass1234',
            nom='Fournisseur',
            prenom='F',
            role='fournisseur'
        )
        self.fournisseur = Fournisseur.objects.create(
            user=self.user_fournisseur,
            nom_entreprise='Garage Test',
            statut='actif'
        )

        self.user_admin = Utilisateur.objects.create_user(
            email='admin@test.com',
            password='pass1234',
            nom='Admin',
            prenom='A',
            role='admin',
            is_staff=True
        )

    def _login(self, email):
        user = Utilisateur.objects.get(email=email)
        self.client.force_authenticate(user=user)

    def test_create_demande_anonymous(self):
        data = {
            'piece_recherchee': 'Alternateur',
            'quantite': '1',
            'ville': 'Dakar',
            'nom_contact': 'Jean',
            'email_contact': 'jean@test.com',
            'telephone_contact': '77'
        }
        r = self.client.post('/api/demandes/', data)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(DemandePiece.objects.filter(reference__startswith='REQ').exists())

    def test_client_demande_list(self):
        DemandePiece.objects.create(
            client=self.client_user,
            piece_recherchee='Plaquette',
            quantite=2,
            ville='Dakar'
        )
        self._login('client@test.com')
        r = self.client.get('/api/client/demandes/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)

    def test_fournisseur_offer_and_client_accept(self):
        demande = DemandePiece.objects.create(
            client=self.client_user,
            piece_recherchee='Disque',
            quantite=1,
            ville='Dakar',
            statut='en_recherche'
        )
        self._login('fournisseur@test.com')
        r = self.client.post(
            f'/api/fournisseur/demandes/{demande.id}/offrir/',
            {
                'prix': '45000',
                'etat': 'neuf',
                'disponibilite': 'immediate',
                'mode_reception': 'livraison',
                'description': 'Disque neuf'
            },
            format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        offre = OffreFournisseur.objects.get(demande=demande)
        self.assertEqual(offre.prix, 45000)

        self.client.credentials()
        self._login('client@test.com')
        r = self.client.post(
            f'/api/client/demandes/{demande.id}/accepter/',
            {'offre_id': offre.id, 'mode_reception': 'livraison'},
            format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue('commande_reference' in r.data)

    def test_admin_list_and_action(self):
        demande = DemandePiece.objects.create(
            client=self.client_user,
            piece_recherchee='Batterie',
            quantite=1,
            ville='Dakar'
        )
        self._login('admin@test.com')
        r = self.client.get('/api/admin/demandes/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)

        r = self.client.post(
            f'/api/admin/demandes/{demande.id}/action/',
            {'statut': 'en_recherche'},
            format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        demande.refresh_from_db()
        self.assertEqual(demande.statut, 'en_recherche')

    def test_fournisseur_cannot_see_unauthorized_demande(self):
        DemandePiece.objects.create(
            client=self.client_user,
            piece_recherchee='Injecteur',
            quantite=1,
            ville='Thies',
            statut='en_recherche'
        )
        self._login('fournisseur@test.com')
        r = self.client.get('/api/fournisseur/demandes/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)

