import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { catchError, map, Observable, of, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PageCode } from '../models/rbac.model';

const LOGIN_URL = '/auth/login';
const DEFAULT_URL = '/';

function ensureSessionLoaded(): Observable<boolean> {
  const auth = inject(AuthService);
  // Si l'utilisateur est déjà dans les signaux, pas besoin d'aller chercher /me.
  if (auth.isAuthenticated()) return of(true);
  const token = auth.getToken();
  if (!token) return of(false);
  // Token présent mais pas de session en mémoire → restauration via /auth/me.
  return auth.loadMe(false).pipe(
    map(dto => !!dto),
    // Token expiré / backoffice injoignable : on considère "non connecté"
    // au lieu de faire échouer la navigation.
    catchError(() => of(false)),
    take(1)
  );
}

/** N'accepte que les chemins internes (protection contre les open redirects). */
function isSafeReturnUrl(url: string | null): url is string {
  return (
    !!url &&
    url.startsWith('/') &&
    !url.startsWith('//') &&
    !url.startsWith('/auth')
  );
}

function toLogin(router: Router, state: RouterStateSnapshot): UrlTree {
  return router.createUrlTree([LOGIN_URL], {
    queryParams: isSafeReturnUrl(state.url) ? { returnUrl: state.url } : {},
  });
}

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return ensureSessionLoaded().pipe(
    map(loaded => {
      if (!loaded) {
        return toLogin(router, state);
      }
      const requiredPage = (route.data?.['rbac'] as { page?: PageCode } | undefined)?.page;
      if (requiredPage) {
        const allowed = auth.authorizedPages();
        if (!allowed.has(requiredPage)) {
          return router.createUrlTree(['/', '403'], {
            queryParams: { page: requiredPage },
          });
        }
      }
      return true;
    })
  );
};

export const guestGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  return ensureSessionLoaded().pipe(
    map(loaded => {
      if (!loaded) return true;
      // Déjà connecté : on renvoie vers la page demandée, sinon l'accueil.
      const returnUrl = route.queryParamMap.get('returnUrl');
      return router.parseUrl(isSafeReturnUrl(returnUrl) ? returnUrl : DEFAULT_URL);
    })
  );
};

export const roleGuard: (role: string) => CanActivateFn =
  (role: string) => (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return ensureSessionLoaded().pipe(
      map(loaded => {
        if (!loaded) return toLogin(router, state);
        if (auth.hasRole(role)) return true;
        return router.createUrlTree(['/', '403']);
      })
    );
  };