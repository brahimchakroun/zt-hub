import { Routes } from '@angular/router';
import { DechargeBordereauxComponent } from './decharge-bordereaux';

export const DECHARGE_ROUTES: Routes = [
  {
    path: '',
    component: DechargeBordereauxComponent,
    data: { rbac: { page: 'bureau-ordre.decharge-bordereaux' as const } }
  }
];
