import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },

  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout/auth-layout').then(m => m.AuthLayoutComponent),
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent),
        data: { auth: { title: 'Créer un compte', subtitle: 'Inscrivez-vous à la plateforme' } }
      },
      {
        path: 'forgot-password',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent),
        data: { auth: { title: 'Mot de passe oublié', subtitle: 'Réinitialisez votre mot de passe' } }
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/auth/profile/profile').then(m => m.ProfileComponent),
        data: {
          auth: { title: 'Profil utilisateur', subtitle: 'Gérez vos informations personnelles' },
          rbac: { page: 'auth.profile' }
        }
      },
      {
        path: 'change-password',
        canActivate: [authGuard],
        loadComponent: () => import('./features/auth/change-password/change-password').then(m => m.ChangePasswordComponent),
        data: {
          auth: { title: 'Changer le mot de passe', subtitle: 'Mettez à jour votre mot de passe' },
          rbac: { page: 'auth.change-password' }
        }
      }
    ]
  },

  // Protected app
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout').then(m => m.MainLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
        data: { rbac: { page: 'dashboard' } }
      },

      // Administration
      {
        path: 'administration/users',
        loadComponent: () => import('./features/administration/user-management/user-management').then(m => m.UserManagementComponent),
        data: { rbac: { page: 'administration.users' } }
      },
      {
        path: 'administration/roles',
        loadComponent: () => import('./features/administration/role-management/role-management').then(m => m.RoleManagementComponent),
        data: { rbac: { page: 'administration.roles' } }
      },
      {
        path: 'administration/permissions',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: {
          title: 'Permissions',
          description: 'Gestion fine des permissions — espace réservé.',
          icon: 'pi pi-lock',
          rbac: { page: 'administration.permissions' }
        }
      },
      {
        path: 'administration/settings',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: {
          title: 'Paramétrage général',
          description: 'Paramètres de la plateforme — espace réservé.',
          icon: 'pi pi-sliders-h',
          rbac: { page: 'administration.settings' }
        }
      },

      // Branches Assurance
      {
        path: 'assurance-vie',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: 'Assurance Vie', icon: 'pi pi-heart', rbac: { page: 'assurance.vie' } }
      },
      {
        path: 'assurance-vie/calculator',
        loadComponent: () => import('./features/assurance-vie/calculator/calculator.component').then(m => m.VieCalculatorComponent),
        data: { title: 'Calculateur EC — Assurance Vie', rbac: { page: 'assurance.vie.calculator' } }
      },
      {
        path: 'assurance-auto',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: 'Assurance Auto', icon: 'pi pi-car', rbac: { page: 'assurance.auto' } }
      },
      {
        path: 'assurance-maladie',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: 'Assurance Maladie', icon: 'pi pi-plus-circle', rbac: { page: 'assurance.maladie' } }
      },
      {
        path: 'assurance-transport',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: 'Assurance Transport', icon: 'pi pi-cart-plus', rbac: { page: 'assurance.transport' } }
      },
      {
        path: 'assurance-agricole',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: 'Assurance Agricole', icon: 'pi pi-sun', rbac: { page: 'assurance.agricole' } }
      },
       {
        path: 'assurance-incendie',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: 'Assurance Incendie', icon: 'pi pi-sun', rbac: { page: 'assurance.incendie' } }
      },
      {
        path: 'assurance-risques-divers',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: 'Assurance Risques Divers', icon: 'pi pi-box', rbac: { page: 'assurance.divers' } }
      },
      {
        path: 'bureau-ordre',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: "Bureau d'ordre", icon: 'pi pi-building', rbac: { page: 'bureau-ordre' } }
      },
      {
        path: 'reassurance',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: 'Réassurance', icon: 'pi pi-share-alt', rbac: { page: 'reassurance' } }
      },
      {
        path: 'sinistres',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: 'Sinistres', icon: 'pi pi-exclamation-triangle', rbac: { page: 'sinistres' } }
      },
      {
        path: 'partenaires',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: 'Partenaires', icon: 'pi pi-briefcase', rbac: { page: 'partenaires' } }
      },
      {
        path: 'reporting',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: 'Reporting', icon: 'pi pi-chart-bar', rbac: { page: 'reporting' } }
      },
      {
        path: 'documents',
        loadComponent: () => import('./shared/components/placeholder-page/placeholder-page').then(m => m.PlaceholderPageComponent),
        data: { title: 'Documents', icon: 'pi pi-folder', rbac: { page: 'documents' } }
      },

      // Décharge bordereaux
       {
        path: 'decharge-bordereaux',
        loadChildren: () =>
          import('./features/bureau-ordre/decharge-bordereaux/decharge-bordereaux.routes')
            .then(m => m.DECHARGE_ROUTES)
      },
            {
        path: 'assurance-vie/calculator',
        loadComponent: () => import('./features/assurance-vie/calculator/calculator.component').then(m => m.VieCalculatorComponent),
        data: { title: 'Calculateur EC — Assurance Vie', rbac: { page: 'assurance.vie.calculator' } }
      },
            {
              path: 'assurance-vie/lettre-epargne',
              loadComponent: () => import('./features/assurance-vie/lettre/lettre-epargne.component').then(m => m.LettreEpargneComponent),
              data: { title: 'Lettre d’épargne — Assurance Vie', rbac: { page: 'assurance.vie.lettre-epargne' } }
            },

            // Errors
      {
        path: '403',
        loadComponent: () => import('./features/errors/forbidden').then(m => m.ForbiddenComponent)
      },
      {
        path: '500',
        loadComponent: () => import('./features/errors/server-error').then(m => m.ServerErrorComponent)
      }
    ]
  },

  { path: '**', loadComponent: () => import('./features/errors/not-found').then(m => m.NotFoundComponent) }
];
