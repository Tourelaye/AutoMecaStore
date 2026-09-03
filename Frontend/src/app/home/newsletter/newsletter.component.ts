import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-newsletter',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './newsletter.component.html',
  styleUrls: ['./newsletter.component.css']
})
export class NewsletterComponent {
  email = '';
  subscribed = false;
  loading = false;

  subscribe(): void {
    if (!this.email || !this.email.includes('@')) return;
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
      this.subscribed = true;
      this.email = '';
      setTimeout(() => this.subscribed = false, 4000);
    }, 1200);
  }
}
