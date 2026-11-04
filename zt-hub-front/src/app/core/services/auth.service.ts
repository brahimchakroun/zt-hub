import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest, User } from '../models/user.model';
import {
  ApiResponse,
  AuthTokenDataDto,
  AuthUserDto,
  ChangePasswordBodyDto,
  ForgotPasswordBodyDto,
  ResetPasswordBodyDto,
} from '../models/backend-api.model';
import { asPageCode, normalizeAuthUserDto, toUser, unwrapApiResponse } from './rbac.mapper';
import { PageCode } from '../models/rbac.model';
import { RbacService } from './rbac.service';

const STORAGE_KEY = 'insurance_template_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/api/v1/auth';

  // Plus de tokens en mémoire ou dans le localStorage. Seul l'état utilisateur et ses rôles persistent.
  private readonly _currentUser = signal<User | null>(this.loadFromStorage<User>('user'));
  private readonly _roles = signal<string[]>(this.loadFromStorage<string[]>('roles') ?? []);
  private readonly _pageAccess = signal<Set<string>>(new Set(this.loadFromStorage<string[]>('pageAccess') ?? []));
  private readonly _permissions = signal<Set<string>>(new Set(this.loadFromStorage<string[]>('permissions') ?? []));

  readonly currentUser = this._currentUser.asReadonly();
  // L'application considère l'utilisateur authentifié s'il a un profil utilisateur chargé en mémoire
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly isAdmin = computed(() => this._roles().includes('ADMIN'));
  readonly roles = this._roles.asReadonly();
  readonly pageAccessSignal = computed(() => this._pageAccess());
  readonly permissionsSignal = computed(() => this._permissions());
  private readonly injector = inject(Injector);

  // ========================================================================
  // Authentification — endpoints backend
  // ========================================================================
login(request: LoginRequest): Observable<LoginResponse> {
  return this.http
    .post<ApiResponse<AuthUserDto>>(`${this.base}/login`, {
      username: request.username.trim().toLowerCase(),
      password: request.password,
    }, { withCredentials: true })
    .pipe(
      unwrapApiResponse,
      map(normalizeAuthUserDto),
      map(dto => {
        // Hydrater directement l'utilisateur et ses droits reçus du login
        this.hydrateFromUserDto(dto);
        return { user: toUser(dto) };
      }),
      switchMap(resp => {
        const rbac = this.injector.get(RbacService);
        return from(rbac.ensureLoaded(true)).pipe(
          map(() => resp)
        );
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
}

  /** Permet à l'intercepteur de déclencher un rafraîchissement silencieux via le cookie refreshToken HttpOnly */
  refreshToken(): Observable<AuthUserDto> {
    return this.http
      .post<ApiResponse<AuthUserDto>>(`${this.base}/refresh`, {}, { withCredentials: true })
      .pipe(
        unwrapApiResponse,
        map(normalizeAuthUserDto),
        tap(dto => this.hydrateFromUserDto(dto)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
  }

  register(request: RegisterRequest): Observable<{ message: string }> {
    return this.http
      .post<ApiResponse<AuthTokenDataDto>>(`${this.base}/register`, {
        username: request.username.trim().toLowerCase(),
        email: request.email.trim().toLowerCase(),
        password: request.password,
        firstName: request.firstName.trim(),
        lastName: request.lastName.trim(),
      }, { withCredentials: true })
      .pipe(
        unwrapApiResponse,
        map(() => ({ message: 'Compte créé avec succès. Connectez-vous.' })),
        shareReplay({ bufferSize: 1, refCount: false })
      );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    const body: ForgotPasswordBodyDto = { email: email.trim().toLowerCase() };
    return this.http.post<{ message: string }>(`${this.base}/forgot-password`, body, { withCredentials: true }).pipe(
      catchError(err => {
        const msg = (err as any)?.error?.message ?? (err as any)?.message;
        return of({ message: msg ?? `Un email de réinitialisation a été envoyé à ${email} (si le compte existe).` });
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    const body: ResetPasswordBodyDto = { resetToken: token, newPassword };
    return this.http.post<{ message: string }>(`${this.base}/reset-password`, body, { withCredentials: true }).pipe(
      catchError(err => {
        const msg = (err as any)?.error?.message ?? (err as any)?.message;
        return throwError(() => new Error(msg ?? 'Lien invalide ou expiré.'));
      })
    );
  }

  changePassword(current: string, newPassword: string): Observable<{ message: string }> {
    const body: ChangePasswordBodyDto = { currentPassword: current, newPassword };
    return this.http.post<ApiResponse<{ message?: string }>>(`${this.base}/change-password`, body, { withCredentials: true }).pipe(
      unwrapApiResponse,
      map(data => ({ message: data?.message ?? 'Mot de passe modifié avec succès.' }))
    );
  }

  logout(): void {
  // On envoie la requête de déconnexion sans passer par les mécanismes de l'intercepteur si besoin, 
  // ou on s'assure qu'en cas d'erreur sur le logout, on ne boucle pas.
  this.http.post(`${this.base}/logout`, {}, { withCredentials: true }).subscribe({
    next: () => this.clearSession(),
    error: () => this.clearSession(), // Même si le serveur répond 401/500 sur le logout, on nettoie le front
  });
}

  /** /auth/me — recharge l'utilisateur et ses droits depuis le backend via les cookies HttpOnly. */
  loadMe(force = false): Observable<AuthUserDto | null> {
    return this.http.get<ApiResponse<AuthUserDto>>(`${this.base}/me`, { withCredentials: true }).pipe(
      unwrapApiResponse,
      tap(dto => this.hydrateFromUserDto(dto)),
      catchError(err => {
        const status = (err as any)?.status;
        if (status === 401 || status === 403) {
          this.clearSession();
          return of(null);
        }
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  // ========================================================================
  // API publique (contrats préservés)
  // ========================================================================

  setSession(response: LoginResponse): void {
    this._currentUser.set(response.user);
    this.persistSnapshot();
  }

  /** @deprecated Conservé pour rétrocompatibilité, retourne toujours null puisque le token est en HttpOnly */
  getToken(): string | null {
    return null;
  }

  hasRole(role: string): boolean {
    return this._roles().includes(role);
  }

  hasPermission(code: string): boolean {
    return this._permissions().has(code);
  }

  authorizedPages(): Set<string> {
    return this._pageAccess();
  }

  canAccessPage(code: string | PageCode): boolean {
    return this._pageAccess().has(String(code));
  }

  // ========================================================================
  // Interne — hydratation & storage
  // ========================================================================

  private fromUserDtoToLoginResponse(dto: AuthUserDto): LoginResponse {
    const user = toUser(dto);
    return { user };
  }

  private hydrateFromUserDto(dto: AuthUserDto): void {
    const user = toUser(dto);
    this._currentUser.set(user);
    this._roles.set([...(dto.roles ?? [])]);
    const pages = new Set<string>();
    for (const raw of dto.pageAccess ?? []) pages.add(String(asPageCode(raw)));
    this._pageAccess.set(pages);
    const perms = new Set<string>();
    this._permissions.set(perms);
    this.persistSnapshot();
  }

  private clearSession(): void {
    this._currentUser.set(null);
    this._roles.set([]);
    this._pageAccess.set(new Set());
    this._permissions.set(new Set());
    localStorage.removeItem(STORAGE_KEY);
    try {
      this.injector.get(RbacService).resetAll();
    } catch {
      // noop
    }
  }

  private persistSnapshot(): void {
    const u = this._currentUser();
    const snapshot = {
      user: u ?? null,
      roles: this._roles(),
      pageAccess: [...this._pageAccess()],
      permissions: [...this._permissions()],
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private loadFromStorage<T>(slot: 'user' | 'roles' | 'pageAccess' | 'permissions'): T | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return (obj?.[slot] as T) ?? null;
    } catch {
      return null;
    }
  }
}