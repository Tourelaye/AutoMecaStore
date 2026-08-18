from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from account.models import Utilisateur, Client, Fournisseur
from catalog.models import Produit, Fournisseur as CatalogFournisseur, FournisseurProduit
from fournisseur.models import Magasin
from .models import Commande, LigneCommande, HistoriqueCommande, Panier, PanierItem


class CommandeFlowAndSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Utilisateurs
        self.user_client_a = Utilisateur.objects.create_user(
            email='clienta@test.com', password='pass1234', nom='ClientA', prenom='A', role='client'
        )
        self.client_a = Client.objects.create(user=self.user_client_a)

        self.user_client_b = Utilisateur.objects.create_user(
            email='clientb@test.com', password='pass1234', nom='ClientB', prenom='B', role='client'
        )
        self.client_b = Client.objects.create(user=self.user_client_b)

        self.user_fournisseur_a = Utilisateur.objects.create_user(
            email='fournisseura@test.com', password='pass1234', nom='FournisseurA', prenom='A', role='fournisseur'
        )
        self.fournisseur_a = Fournisseur.objects.create(
            user=self.user_fournisseur_a, nom_entreprise='Garage A', statut='actif'
        )

        self.user_fournisseur_b = Utilisateur.objects.create_user(
            email='fournisseurb@test.com', password='pass1234', nom='FournisseurB', prenom='B', role='fournisseur'
        )
        self.fournisseur_b = Fournisseur.objects.create(
            user=self.user_fournisseur_b, nom_entreprise='Garage B', statut='actif'
        )

        self.user_admin = Utilisateur.objects.create_user(
            email='admin@test.com', password='pass1234', nom='Admin', prenom='A', role='admin', is_staff=True
        )

        # Fournisseur catalogue et magasin
        self.catalog_f = CatalogFournisseur.objects.create(
            administrateur=self.user_fournisseur_a,
            nom_entreprise='Garage A',
            contrat_actif=True
        )
        self.magasin = Magasin.objects.create(
            fournisseur=self.fournisseur_a,
            nom_magasin='Magasin A',
            ville='Dakar',
            livraison_disponible=True,
            retrait_magasin=True,
            frais_livraison=1000,
            mode_tarif_livraison='fixe'
        )

        # Produit
        self.produit = Produit.objects.create(
            nom='Plaquettes de frein',
            description='Plaquettes',
            prix=5000,
            stock=20,
            fournisseur=self.fournisseur_a,
            is_active=True
        )

        FournisseurProduit.objects.create(
            fournisseur=self.catalog_f,
            produit=self.produit,
            prix_achat=3000,
            prix_vente=5000,
            stock_disponible=15
        )

        # Panier client A
        self.panier = Panier.objects.create(client=self.client_a)
        self.panier_item = PanierItem.objects.create(
            panier=self.panier,
            produit=self.produit,
            fournisseur=self.fournisseur_a,
            magasin=self.magasin,
            quantite=2,
            mode_reception='livraison'
        )

    def _login(self, user):
        self.client.force_authenticate(user=user)

    def test_scenario_complet_commande_et_statuts(self):
        # Étape 1-5 : client crée une commande depuis le panier
        self._login(self.user_client_a)
        r = self.client.post(
            '/api/commande/panier/',
            {
                'adresse': {
                    'nom_destinataire': 'Client A',
                    'telephone': '77',
                    'ville': 'Dakar',
                    'adresse': 'Quartier A'
                }
            },
            format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        commande_id = r.data['id']
        self.assertEqual(r.data['statut'], 'nouvelle_commande')
        self.assertTrue(LigneCommande.objects.filter(commande_id=commande_id, fournisseur=self.fournisseur_a).exists())

        # Étape 6 : fournisseur reçoit la commande
        self.client.credentials()
        self._login(self.user_fournisseur_a)
        r = self.client.get('/api/fournisseur/commandes/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]['id'], commande_id)

        # Étape 7-8 : fournisseur accepte, client voit "acceptee"
        r = self.client.patch(
            f'/api/fournisseur/commandes/{commande_id}/statut/',
            {'statut': 'acceptee', 'commentaire': 'Commande acceptée'},
            format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['statut'], 'acceptee')

        self.client.credentials()
        self._login(self.user_client_a)
        r = self.client.get(f'/api/mes-commandes/{commande_id}/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['statut'], 'acceptee')
        self.assertTrue(any(h['statut'] == 'acceptee' for h in r.data['historique']))

        # Étape 9-12 : préparation -> en cours livraison -> livrée -> terminée
        self.client.credentials()
        self._login(self.user_fournisseur_a)
        for s in ['en_preparation', 'en_cours_livraison', 'livree', 'terminee']:
            r = self.client.patch(
                f'/api/fournisseur/commandes/{commande_id}/statut/',
                {'statut': s},
                format='json'
            )
            self.assertEqual(r.status_code, status.HTTP_200_OK)

        self.client.credentials()
        self._login(self.user_client_a)
        r = self.client.get(f'/api/mes-commandes/{commande_id}/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['statut'], 'terminee')

    def test_admin_voit_toutes_les_commandes(self):
        Commande.objects.create(client=self.client_a, statut='nouvelle_commande')
        Commande.objects.create(client=self.client_b, statut='nouvelle_commande')
        self._login(self.user_admin)
        r = self.client.get('/api/admin/commandes/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 2)

    def test_client_a_ne_voit_pas_commande_client_b(self):
        Commande.objects.create(client=self.client_b, statut='nouvelle_commande')
        self._login(self.user_client_a)
        r = self.client.get('/api/mes-commandes/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 0)

    def test_client_a_ne_peut_pas_voir_commande_b(self):
        commande_b = Commande.objects.create(client=self.client_b, statut='nouvelle_commande')
        self._login(self.user_client_a)
        r = self.client.get(f'/api/mes-commandes/{commande_b.id}/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_fournisseur_a_ne_voit_pas_commande_fournisseur_b(self):
        commande = Commande.objects.create(client=self.client_a, statut='nouvelle_commande')
        # ligne appartient au fournisseur B
        LigneCommande.objects.create(
            commande=commande,
            produit=self.produit,
            fournisseur=self.fournisseur_b,
            magasin=Magasin.objects.create(fournisseur=self.fournisseur_b, nom_magasin='Magasin B', livraison_disponible=True),
            quantite=1,
            prix_unitaire=5000,
            mode_reception='livraison'
        )
        self._login(self.user_fournisseur_a)
        r = self.client.get('/api/fournisseur/commandes/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 0)

    def test_client_ne_peut_pas_modifier_statut(self):
        commande = Commande.objects.create(client=self.client_a, statut='nouvelle_commande')
        self._login(self.user_client_a)
        r = self.client.patch(
            f'/api/fournisseur/commandes/{commande.id}/statut/',
            {'statut': 'acceptee'},
            format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
