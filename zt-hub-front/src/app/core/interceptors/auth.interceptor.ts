import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, timeout, TimeoutError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const DEFAULT_TIMEOUT_MS = 120_000;
const SLOW_TIMEOUT_MS = 120_000;
const SLOW_URLS = ['/lettre-epargne']; // requêtes connues pour être longues

let redirecting = false; // évite les redirections en cascade (requêtes parallèles)
let isRefreshing = false; // évite de lancer plusieurs requêtes de refresh en même temps

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Avec les cookies HttpOnly, on s'assure que withCredentials est activé.
  let authReq = req;
  if (!req.headers.has('Authorization')) {
    authReq = req.clone({
      withCredentials: true
    });
  }

  const isSlow = SLOW_URLS.some(u => authReq.url.includes(u));

  return next(authReq).pipe(
    timeout(isSlow ? SLOW_TIMEOUT_MS : DEFAULT_TIMEOUT_MS),
    catchError((error: unknown) => {
      const isHttpError = error instanceof HttpErrorResponse;

      // Backoffice injoignable : timeout, status 0, ou erreurs de passerelle
      const backendDown =
        error instanceof TimeoutError ||
        (isHttpError && [0, 502, 503, 504].includes(error.status));

      // Session invalide (401 uniquement : un 403 peut être un simple manque de droits)
      const unauthorized = isHttpError && error.status === 401;

      const onLoginPage = router.url.startsWith('/login');

      // Exclusion totale des routes d'authentification pour éviter les boucles infinies
      const isAuthRoute = authReq.url.includes('/auth/login') || 
                          authReq.url.includes('/auth/logout') || 
                          authReq.url.includes('/auth/refresh');

      // 1. Si le backoffice est down, on redirige vers le login avec la raison "unreachable"
      if (backendDown && !onLoginPage && !redirecting) {
        redirecting = true;
        const returnUrl = router.url;
        auth.logout();
        router.navigate(['/login'], {
          queryParams: { returnUrl, reason: 'unreachable' }
        }).finally(() => (redirecting = false));

        return throwError(() => error);
      }

      // 2. Si on a un 401 sur une requête normale (hors routes d'auth), on tente un Silent Refresh
      if (unauthorized && !isAuthRoute && !onLoginPage && !isRefreshing) {
        isRefreshing = true;

        return auth.refreshToken().pipe(
          switchMap(() => {
            isRefreshing = false;
            // Si le refresh réussit, on rejoue la requête initiale avec les nouveaux cookies HttpOnly
            return next(authReq);
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            // Si le refresh échoue (refreshToken expiré ou invalide), là on déconnecte pour de bon
            if (!redirecting) {
              redirecting = true;
              const returnUrl = router.url;
              auth.logout();
              router.navigate(['/login'], {
                queryParams: { returnUrl, reason: 'expired' }
              }).finally(() => (redirecting = false));
            }
            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};