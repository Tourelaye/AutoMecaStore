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
  // TODO: brancher sur un endpoint de messagerie une fois disponible
  conversations: any[] = [];

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
