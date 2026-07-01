import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-messagerie',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messagerie.component.html',
  styleUrls: ['./messagerie.component.css']
})
export class MessagerieComponent {
  conversations = [
    { 
      id: 1, 
      client: 'Jean Dupont', 
      avatar: 'JD',
      lastMessage: 'Merci pour votre réponse rapide !',
      date: '2024-06-28',
      unread: 2,
      messages: [
        { sender: 'client', text: 'Bonjour, j\'ai une question sur ma commande', time: '10:30' },
        { sender: 'fournisseur', text: 'Bonjour, je suis à votre écoute', time: '10:35' },
        { sender: 'client', text: 'Merci pour votre réponse rapide !', time: '10:36' }
      ]
    },
    { 
      id: 2, 
      client: 'Marie Martin', 
      avatar: 'MM',
      lastMessage: 'Les produits sont arrivés en bon état',
      date: '2024-06-27',
      unread: 0,
      messages: [
        { sender: 'client', text: 'Les produits sont arrivés en bon état', time: '14:20' }
      ]
    },
    { 
      id: 3, 
      client: 'Pierre Bernard', 
      avatar: 'PB',
      lastMessage: 'Pouvez-vous me donner un devis ?',
      date: '2024-06-26',
      unread: 1,
      messages: [
        { sender: 'client', text: 'Pouvez-vous me donner un devis ?', time: '09:15' }
      ]
    }
  ];

  selectedConversation: any = null;
  newMessage = '';

  selectConversation(conversation: any): void {
    this.selectedConversation = conversation;
    conversation.unread = 0;
  }

  sendMessage(): void {
    if (this.newMessage.trim() && this.selectedConversation) {
      this.selectedConversation.messages.push({
        sender: 'fournisseur',
        text: this.newMessage,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      });
      this.selectedConversation.lastMessage = this.newMessage;
      this.newMessage = '';
    }
  }
}
