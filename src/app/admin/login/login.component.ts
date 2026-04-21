import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(40px)' }),
        animate('500ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ])
    ])
  ]
})
export class LoginComponent implements OnInit {

  email = '';
  password = '';
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  loginSuccess = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // Initialisation du composant
    // Les particules seront ajoutées plus tard si nécessaire
  }

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';

    // Simulation login
    setTimeout(() => {
      this.isLoading = false;

      if (this.email === 'admin@automeca.com' && this.password === 'admin') {
        this.loginSuccess = true;

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1200);

      } else {
        this.errorMessage = "Email ou mot de passe incorrect";
      }

    }, 1500);
  }

  toggleTheme() {
    document.body.classList.toggle('dark');
  }
}