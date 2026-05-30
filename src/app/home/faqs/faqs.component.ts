import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FAQ {
  question: string;
  answer: string;
  category: string;
  open?: boolean;
  helpful?: boolean;
}

@Component({
  selector: 'app-faqs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './faqs.component.html',
  styleUrl: './faqs.component.css'
})
export class FaqsComponent {

  faqs: FAQ[] = [
    {
      question: 'Comment puis-je retourner une commande ?',
      answer: 'Vous avez 30 jours pour retourner votre commande sans frais. Contactez simplement notre service client avec votre numéro de commande. Nous traiterons votre demande dans les 24 heures ouvrées.',
      category: 'Retours',
      open: false,
      helpful: undefined
    },
    {
      question: 'Quels sont les délais de livraison ?',
      answer: 'Les délais de livraison sont généralement de 3 à 5 jours ouvrés pour Dakar et sa banlieue. Pour les autres régions du Sénégal, comptez 5 à 7 jours ouvrés. Une notification vous sera envoyée dès l\'expédition.',
      category: 'Livraison',
      open: false,
      helpful: undefined
    },
    {
      question: 'Comment puis-je payer en toute sécurité ?',
      answer: 'Nous utilisons un cryptage SSL pour sécuriser vos paiements. Vous pouvez payer par carte bancaire, mobile money (Orange Money, Wave, Free Money) ou à la livraison. Toutes vos transactions sont 100% sécurisées.',
      category: 'Paiement',
      open: false,
      helpful: undefined
    },
    {
      question: 'Puis-je changer ma commande après l\'avoir passée ?',
      answer: 'Oui, vous pouvez modifier votre commande dans un délai de 24h après validation. Contactez notre service client par téléphone ou email avec votre numéro de commande. Passé ce délai, les modifications ne seront plus possibles.',
      category: 'Commande',
      open: false,
      helpful: undefined
    },
    {
      question: 'Les pièces sont-elles garanties ?',
      answer: 'Toutes nos pièces sont garanties conformes aux normes de qualité. La garantie varie selon le type de pièce : 12 mois pour les pièces neuves, 6 mois pour les pièces reconditionnées. Consultez notre politique de garantie pour plus de détails.',
      category: 'Garantie',
      open: false,
      helpful: undefined
    },
    {
      question: 'Comment suivre ma commande ?',
      answer: 'Vous pouvez suivre votre commande en vous connectant à votre compte et en accédant à la section "Mes commandes". Vous recevrez également des notifications par SMS et email à chaque étape de la livraison.',
      category: 'Suivi',
      open: false,
      helpful: undefined
    }
  ];

  searchQuery = '';
  filteredFaqs: FAQ[] = [...this.faqs];

  toggleFaq(index: number): void {
    this.faqs[index].open = !this.faqs[index].open;
  }

  markHelpful(index: number, helpful: boolean): void {
    this.faqs[index].helpful = helpful;
  }

  filterFaqs(): void {
    if (!this.searchQuery.trim()) {
      this.filteredFaqs = [...this.faqs];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredFaqs = this.faqs.filter(faq =>
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query) ||
      faq.category.toLowerCase().includes(query)
    );
  }
}
