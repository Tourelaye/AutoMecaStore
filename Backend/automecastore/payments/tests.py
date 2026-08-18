from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from account.models import Utilisateur, Client
from orders.models import Commande
from payments.models import Paiement


class PaiementAPITestCase(APITestCase):

    def setUp(self):
        self.client_user = Utilisateur.objects.create_user(
            email='client@auto.test',
            password='testpass123',
            nom='Client',
            prenom='Test',
            role='client'
        )
        self.client_obj = Client.objects.create(user=self.client_user)

        self.admin_user = Utilisateur.objects.create_user(
            email='admin@auto.test',
            password='testpass123',
            nom='Admin',
            prenom='Test',
            role='admin',
            is_staff=True
        )

        self.commande = Commande.objects.create(
            client=self.client_obj,
            statut='en_attente_paiement',
            montant_total='15000',
            frais_livraison='0',
            mode_reception='livraison',
            adresse_livraison='Dakar, Rue 1',
            telephone_client='77 000 00 00'
        )

        self.init_url = '/api/paiement/initier/'

    def _login_client(self):
        self.client.force_authenticate(user=self.client_user)

    def _login_admin(self):
        self.client.force_authenticate(user=self.admin_user)

    def test_paiement_initier_cash_a_la_livraison(self):
        """Paiement à la livraison : commande en attente de confirmation."""
        self._login_client()
        response = self.client.post(self.init_url, {
            'commande': self.commande.id,
            'moyen': 'a_la_livraison',
            'idempotence_key': 'idem-001'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['moyen'], 'a_la_livraison')
        self.assertEqual(response.data['statut'], 'en_attente')

        self.commande.refresh_from_db()
        self.assertEqual(self.commande.mode_paiement, 'a_la_livraison')
        self.assertEqual(self.commande.statut, 'en_attente_confirmation')

    def test_paiement_initier_mobile_money(self):
        """Paiement mobile : commande en attente de confirmation backend."""
        self._login_client()
        response = self.client.post(self.init_url, {
            'commande': self.commande.id,
            'moyen': 'mobile_money',
            'idempotence_key': 'idem-002'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['statut'], 'en_attente')

        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, 'en_attente_paiement')

    def test_paiement_idempotence(self):
        """Double clic : la même clé d'idempotence renvoie le même paiement."""
        self._login_client()
        payload = {
            'commande': self.commande.id,
            'moyen': 'mobile_money',
            'idempotence_key': 'idem-double'
        }

        r1 = self.client.post(self.init_url, payload, format='json')
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        ref1 = r1.data['reference']

        r2 = self.client.post(self.init_url, payload, format='json')
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        ref2 = r2.data['reference']

        self.assertEqual(ref1, ref2)
        self.assertEqual(Paiement.objects.filter(cle_idempotence='idem-double').count(), 1)

    def test_paiement_client_annule(self):
        """Le client peut annuler un paiement en attente."""
        self._login_client()
        r = self.client.post(self.init_url, {
            'commande': self.commande.id,
            'moyen': 'mobile_money',
            'idempotence_key': 'idem-annule'
        }, format='json')
        paiement_id = r.data['id']

        annul_url = f'/api/client/paiements/{paiement_id}/annuler/'
        r2 = self.client.post(annul_url, {}, format='json')

        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data['statut'], 'annule')

        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, 'annulee')

    def test_admin_confirme_paiement(self):
        """Seul le backend/admin confirme la réussite d'un paiement."""
        self._login_client()
        r = self.client.post(self.init_url, {
            'commande': self.commande.id,
            'moyen': 'mobile_money',
            'idempotence_key': 'idem-admin'
        }, format='json')
        paiement_id = r.data['id']

        self._login_admin()
        action_url = f'/api/admin/paiements/{paiement_id}/action/'
        r2 = self.client.post(action_url, {'action': 'confirmer'}, format='json')

        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data['statut'], 'reussi')

        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, 'acceptee')

    def test_admin_marque_echoue_paiement(self):
        """Admin marque un paiement comme échoué : commande reste payable."""
        self._login_client()
        r = self.client.post(self.init_url, {
            'commande': self.commande.id,
            'moyen': 'carte',
            'idempotence_key': 'idem-echoue'
        }, format='json')
        paiement_id = r.data['id']

        self._login_admin()
        action_url = f'/api/admin/paiements/{paiement_id}/action/'
        r2 = self.client.post(action_url, {'action': 'echouer', 'motif': 'Fonds insuffisants'}, format='json')

        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data['statut'], 'echoue')

        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, 'en_attente_paiement')

    def test_client_ne_peut_pas_confirmer(self):
        """Le client ne peut pas forcer le statut 'reussi' via l'API admin."""
        self._login_client()
        r = self.client.post(self.init_url, {
            'commande': self.commande.id,
            'moyen': 'mobile_money',
            'idempotence_key': 'idem-tamper'
        }, format='json')
        paiement_id = r.data['id']

        # Le client tente d'appeler l'action admin
        action_url = f'/api/admin/paiements/{paiement_id}/action/'
        r2 = self.client.post(action_url, {'action': 'confirmer'}, format='json')

        self.assertEqual(r2.status_code, status.HTTP_403_FORBIDDEN)
        p = Paiement.objects.get(id=paiement_id)
        self.assertNotEqual(p.statut, 'reussi')

    def test_transition_refus_si_invalide(self):
        """On ne peut pas confirmer un paiement déjà annulé."""
        self._login_client()
        r = self.client.post(self.init_url, {
            'commande': self.commande.id,
            'moyen': 'mobile_money',
            'idempotence_key': 'idem-transition'
        }, format='json')
        paiement_id = r.data['id']

        self.client.post(
            f'/api/client/paiements/{paiement_id}/annuler/',
            {}, format='json'
        )

        self._login_admin()
        r2 = self.client.post(
            f'/api/admin/paiements/{paiement_id}/action/',
            {'action': 'confirmer'}, format='json'
        )
        self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)
