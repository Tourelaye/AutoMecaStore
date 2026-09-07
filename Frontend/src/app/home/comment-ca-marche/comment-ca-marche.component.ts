import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Etape {
  icon: string;
  titre: string;
  texte: string;
  couleur: string;
}

/**
 * Section « Comment ça marche » : les 3 étapes du parcours d'achat
 * + appel à l'action vers la demande de pièce introuvable.
 */
@Component({
  selector: 'app-comment-ca-marche',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './comment-ca-marche.component.html',
  styleUrls: ['./comment-ca-marche.component.css']
})
export class CommentCaMarcheComponent {

  etapes: Etape[] = [
    {
      icon: 'bi-search',
      titre: 'Recherchez votre pièce',
      texte: 'Par référence, par nom ou directement à partir de votre véhicule : le catalogue vérifie la compatibilité pour vous.',
      couleur: '#fa5807'
    },
    {
      icon: 'bi-shop',
      titre: 'Comparez les vendeurs',
      texte: 'Prix, stock, distance, avis et délais : choisissez le magasin qui vous convient, en livraison ou en retrait.',
      couleur: '#2563eb'
    },
    {
      icon: 'bi-bag-check',
      titre: 'Commandez en toute sécurité',
      texte: 'Paiement sécurisé, suivi de commande en temps réel et pièces garanties. Votre véhicule repart vite.',
      couleur: '#16a34a'
    }
  ];
}
