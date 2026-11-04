# ZT-hub

Template Angular **générique** et **réutilisable** destiné à toutes les équipes et entités de la compagnie d'assurance.

Aucune logique métier spécifique n'est incluse. Ce projet sert de base technique (framework, layout, auth mock, menus par branche, pages placeholder) pour accélérer le démarrage des applications front-office / back-office.

## Stack

| Technologie | Version |
|-------------|---------|
| Angular | 21 |
| PrimeNG | 21 (thème Aura) |
| TypeScript | 5.9 |
| Standalone Components | Oui |
| Lazy Loading | Oui |

## Architecture

```
src/app/
├── core/                 # Singleton, guards, interceptors, services transverses
│   ├── guards/
│   ├── interceptors/
│   ├── models/
│   └── services/         # AuthService (mock), MenuService, ToastService
├── shared/               # Composants, directives, pipes réutilisables
│   └── components/
│       └── placeholder-page/
├── layouts/
│   ├── main-layout/      # Sidebar + Header + Footer + User menu
│   └── auth-layout/      # Layout pages login / register / forgot
└── features/
    ├── auth/             # Login, Register, Forgot, Profile, Change password
    ├── dashboard/
    ├── administration/   # Users, Roles, Permissions, Settings (placeholders)
    ├── assurance-vie/    # Espaces réservés par branche
    ├── assurance-auto/
    ├── assurance-sante/
    ├── assurance-habitation/
    ├── assurance-entreprise/
    ├── assurance-agricole/
    ├── reassurance/
    ├── sinistres/
    ├── partenaires/
    ├── reporting/
    ├── documents/
    └── errors/           # 403, 404, 500
```

## Installation

```bash
npm install
```

## Démarrage

```bash
npm start
# → http://localhost:4200
```

**Login mock** : n'importe quel identifiant + mot de passe non vides fonctionne.

## Ajout d'une nouvelle branche métier

1. Créer le dossier `src/app/features/ma-branche/`.
2. Ajouter les composants (liste, formulaire, détail…) en standalone.
3. Enregistrer les routes lazy dans `app.routes.ts` sous le layout principal.
4. Étendre `MenuService.menuItems` avec la nouvelle entrée.

Exemple de route :

```ts
{
  path: 'ma-branche',
  loadChildren: () => import('./features/ma-branche/ma-branche.routes').then(m => m.MA_BRANCHE_ROUTES)
}
```

## Ajout d'un écran

1. Générer un composant standalone dans la feature concernée.
2. Externaliser toujours `templateUrl` et `styleUrl` (pas de template/styles inline).
3. Brancher la route (lazy) et éventuellement le menu.

## Ajout d'un menu

Modifier `src/app/core/services/menu.service.ts` :

```ts
{
  label: 'Ma branche',
  icon: 'pi pi-...',
  children: [
    { label: 'Liste', icon: 'pi pi-list', route: '/ma-branche' }
  ]
}
```

## Gestion des rôles

- Le `AuthService` mock expose `hasRole(role: string)` et `isAdmin`.
- Le `authGuard` protège les routes authentifiées.
- Remplacez `AuthService` par un service réel (Keycloak, Azure AD, API custom…) en gardant la même interface.
- Ajoutez des guards de permissions si nécessaire (ex. `permissionGuard`).

## Authentification (couche mock)

| Endpoint logique | Méthode mock | Remplaçable par |
|------------------|--------------|-----------------|
| login | AuthService.login | POST /auth/login |
| register | AuthService.register | POST /auth/register |
| forgot-password | AuthService.forgotPassword | POST /auth/forgot |
| change-password | AuthService.changePassword | PUT /auth/password |
| session | localStorage + signals | Cookie / JWT réel |

Le token est injecté via `authInterceptor`.

## Build & Déploiement

```bash
npm run build
# Artifacts → dist/zt-hub/
```

Servir le contenu de `dist/zt-hub/browser` derrière un reverse-proxy (nginx, IIS, etc.).

Variables d'environnement : `src/environments/`.

## Pages génériques fournies

- Dashboard
- Placeholder (liste / formulaire / tableau vide)
- 404 / 403 / 500
- Login / Register / Forgot password / Profile / Change password

## Licence

Usage interne compagnie d'assurance. 
