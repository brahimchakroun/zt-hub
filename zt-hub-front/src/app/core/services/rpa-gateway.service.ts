import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, first, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  RpaApiErrorBody,
  RpaAuthRequest,
  RpaAuthResponse,
  RpaConfig,
  RpaDechargePayload,
  RpaGatewayError,
  RpaSubmitRequest,
  RpaSubmitResult,
} from '../models/rpa-gateway.model';
import { User } from '../models/user.model';

// Refresh the cached token this many seconds BEFORE the actual expiration
// to avoid race-conditions on long-running calls.
const TOKEN_SAFETY_BUFFER_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class RpaGatewayService {
  private readonly http = inject(HttpClient);

  // -----------------------------------------------------------------------
  // Configuration (pulled from environment)
  // -----------------------------------------------------------------------
  private readonly config: RpaConfig = environment.rpa;
  private readonly authUrl: string = `${this.config.baseUrl}/auth/token`;
  private readonly apiUrl: string = `${this.config.baseUrl}/api/v1/rpa/requests`;

  // -----------------------------------------------------------------------
  // Token cache
  // -----------------------------------------------------------------------
  private token: string | null = null;
  private tokenExpiresAt = 0;
  /**
   * Inflight auth observable — prevents concurrent "re-auth storms" when
   * several callers ask for a token at the same time and the cache is stale.
   */
  private authInFlight$: Observable<string> | null = null;

  /** Monotonic counter used to build unique business keys. */
  private idempotencyCounter = 0;

  // =======================================================================
  // Public API
  // =======================================================================

  /**
   * Submit a "décharge bordereau" request to the RPA Gateway using the
   * standard PROC_GED_DECHARGE_BORD process.
   *
   * Handles authentication (cache + refresh on 401) + single retry
   * transparently for the caller.
   *
   * @param numeroBordereau - Bordereau number (stringified internally).
   * @param user - Currently connected user or equivalent `{ name }` shape.
   */
  submitDecharge(
    numeroBordereau: string | number,
    user: Pick<User, 'firstName' | 'lastName' | 'username'> | { name: string }
  ): Observable<RpaSubmitResult> {
    const numero = String(numeroBordereau);
    const payloadObj: RpaDechargePayload = {
      numero_bordereau: numero,
      utilisateur_connecte: this.resolveUserName(user),
      requestedBy: 'ZT DOC PLUS',
    };

    const businessKey = `${numero}-${++this.idempotencyCounter}-${Date.now()}`;

    const body: RpaSubmitRequest = {
      processCode: this.config.processCodeDecharge,
      businessKey,
      payload: JSON.stringify(payloadObj),
    };

    return this.requestWithRetry(body);
  }

  /**
   * Explicitly clear the cached token. Useful when the caller knows the
   * token has been revoked server-side.
   */
  invalidateToken(): void {
    this.token = null;
    this.tokenExpiresAt = 0;
    this.authInFlight$ = null;
  }

  // =======================================================================
  // Internal: auth + token cache
  // =======================================================================

  /** Returns a valid (non-expired) JWT — either from cache or fresh auth. */
  private getValidToken(): Observable<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return of(this.token);
    }
    return this.authenticate();
  }

  /**
   * Perform the authentication POST against the RPA Gateway.
   * De-duplicates concurrent in-flight auth requests.
   */
  private authenticate(): Observable<string> {
    if (this.authInFlight$) {
      return this.authInFlight$;
    }

    const reqBody: RpaAuthRequest = {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
    };

    this.authInFlight$ = this.http
      .post<RpaAuthResponse>(this.authUrl, reqBody, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      })
      .pipe(
        tap((data) => {
          this.token = data.accessToken;
          const expiresInSec = Number(data.expiresIn) || 3600;
          this.tokenExpiresAt = Date.now() + expiresInSec * 1000 - TOKEN_SAFETY_BUFFER_MS;
        }),
        map((data) => data.accessToken),
        catchError((err: any) => {
          // Reset inflight so subsequent callers can retry.
          console.error('AUTH ERROR', err);
          console.error('status=', err.status);
          console.error('body=', err.error);
          this.authInFlight$ = null;
          return throwError(() => this.mapHttpError(err, 'Auth RPA échouée'));
        }),
        tap({
          complete: () => {
            this.authInFlight$ = null;
          },
        }),
        first()
      );

    return this.authInFlight$;
  }

  // =======================================================================
  // Internal: request pipeline + 401 retry
  // =======================================================================

  /**
   * Execute the POST with a valid token. If the server answers 401,
   * invalidate the cache, re-authenticate, and retry exactly once.
   */
  private requestWithRetry(body: RpaSubmitRequest): Observable<RpaSubmitResult> {
    return this.getValidToken().pipe(
      switchMap((token) => this.doRequest(token, body).pipe(
        catchError((err: unknown) => {
          if (this.isHttpStatus(err, 401)) {
            this.invalidateToken();
            return this.authenticate().pipe(
              switchMap((freshToken) => this.doRequest(freshToken, body))
            );
          }
          return throwError(() => err);
        })
      ))
    );
  }

  /**
   * Raw HTTP POST to the RPA requests endpoint with the given bearer token.
   * Returns a normalized {@link RpaSubmitResult} on success, or throws
   * a typed {@link RpaGatewayError} on failure.
   */
  private doRequest(token: string, body: RpaSubmitRequest): Observable<RpaSubmitResult> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    return this.http.post<unknown>(this.apiUrl, body, { headers }).pipe(
      map((rpaResponse) => ({ rpaResponse, payload: body })),
      catchError((err) => throwError(() => this.mapHttpError(err, 'Erreur API RPA')))
    );
  }

  // =======================================================================
  // Helpers
  // =======================================================================

  private resolveUserName(
    user: Pick<User, 'firstName' | 'lastName' | 'username'> | { name: string }
  ): string {
    // Branche 1 — forme { name: string }
    if ('name' in user) {
      if (user.name) return user.name;
    }

    // Branche 2 — forme Pick<User> : cast explicite (TS ne peut pas
    // affiner l'union au-delà de 'name' in user dans les branches suivantes)
    const u = user as Pick<User, 'firstName' | 'lastName' | 'username'>;
    const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    if (full) return full;
    if (u.username) return u.username;

    return 'Utilisateur Zitouna';
  }

  private isHttpStatus(err: unknown, status: number): boolean {
    return err instanceof HttpErrorResponse && err.status === status;
  }

  private mapHttpError(err: unknown, defaultPrefix: string): RpaGatewayError {
    if (err instanceof RpaGatewayError) return err;

    if (err instanceof HttpErrorResponse) {
      const body = (err.error ?? {}) as RpaApiErrorBody;
      const message = body.message || body.error || `${defaultPrefix} (HTTP ${err.status})`;
      return new RpaGatewayError(message, err.status, body);
    }

    const msg = err instanceof Error ? err.message : defaultPrefix;
    return new RpaGatewayError(msg);
  }
}
