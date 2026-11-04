import { ApplicationConfig, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { MessageService } from "primeng/api";
import { provideAppInitializer, inject } from '@angular/core';

import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { RbacService } from './core/services/rbac.service';

export const appConfig: ApplicationConfig = {
  providers: [
    MessageService,
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),

    provideAppInitializer(async () => {
      const auth = inject(AuthService);
      const rbac = inject(RbacService);

      console.log('[app-init] démarrage - tentative de réhydratation via cookie HttpOnly');

      try {
        // On tente toujours de charger le profil utilisateur au démarrage (le cookie HttpOnly est envoyé automatiquement)
        const user = await firstValueFrom(
          auth.loadMe(true).pipe(
            catchError(() => of(null))
          )
        );

        if (user) {
          console.log('[app-init] Utilisateur réhydraté avec succès, chargement RBAC...');
          await rbac.ensureLoaded(true);
          console.log('[app-init] RBAC chargé avec succès');
        } else {
          console.log('[app-init] Aucun utilisateur connecté (ou session expirée).');
        }
      } catch (err) {
        console.warn('[app-init] Échec de l\'initialisation de la session', err);
      }
    }),

    { provide: LOCALE_ID, useValue: 'fr-FR' },

    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false
        }
      }
    }),
  ]
};