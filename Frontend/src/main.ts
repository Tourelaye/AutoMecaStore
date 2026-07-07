import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import fr from '@angular/common/locales/fr';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { AuthInterceptor } from './app/core/interceptors/auth.interceptor';

registerLocaleData(fr);

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),

    // Active HttpClient avec support des intercepteurs DI
    provideHttpClient(withInterceptorsFromDi()),
    
    // Active les animations
    provideAnimations(),
    
    // Enregistrement de l'intercepteur JWT
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
}).catch(err => console.error(err));