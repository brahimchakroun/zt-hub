// src/app/features/assurance-vie/calculator/calculator.routes.ts
import { Routes } from '@angular/router';

export const CALCULATOR_ROUTES: Routes = [
  { path: '', redirectTo: 'mothmer', pathMatch: 'full' },
  {
    path: 'mothmer',
    loadComponent: () => import('./mothmer/mothmer.component').then(m => m.MothmerComponent),
    data: { rbac: { page: 'assurance.vie.calculator.mothmer' } }
  },
  {
    path: 'dirassa',
    loadComponent: () => import('./dirassa/dirassa.component').then(m => m.DirassaComponent),
    data: { rbac: { page: 'assurance.vie.calculator.dirassa' } }
  }
];