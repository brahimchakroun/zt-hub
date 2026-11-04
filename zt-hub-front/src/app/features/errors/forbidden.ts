import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  template: `
    <div class="error-page">
      <h1>403</h1>
      <p>Accès refusé</p>
      <a pButton routerLink="/dashboard" label="Retour au dashboard" icon="pi pi-home"></a>
    </div>
  `,
  styles: [`
    .error-page { text-align: center; padding: 4rem 1rem; }
    h1 { font-size: 5rem; margin: 0; color: #ef4444; }
    p { color: #64748b; margin: 0.5rem 0 1.5rem; }
  `]
})
export class ForbiddenComponent {}
