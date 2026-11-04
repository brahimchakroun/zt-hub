import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EMPTY, firstValueFrom, from, Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { PageCode, PageMeta, RbacUser, Role, UserStatus } from '../models/rbac.model';
import { User } from '../models/user.model';
import {
  ApiResponse,
  PermissionDto,
  RbacAccessDto,
  RbacMenuDto,
  RbacPageCodesRequestDto,
  RbacPageDto,
  RbacRoleCodesRequestDto,
  RbacRoleDto,
  RbacRoleRequestDto,
  UserCreateRequestDto,
  UserResponseDto,
  UserUpdateRequestDto,
} from '../models/backend-api.model';
import {
  asPageCode,
  groupPermissions,
  PermissionsGrouped,
  toPageMeta,
  toRbacUser,
  toRole,
  unwrapApiResponse,
} from './rbac.mapper';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RbacService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl + '/api/v1/rbac';

  // ------------------------------------------------------------------
  // State (signals synchronisés depuis le backend)
  // ------------------------------------------------------------------

  readonly #roles = signal<Role[]>([]);
  readonly roles = this.#roles.asReadonly();

  readonly #users = signal<RbacUser[]>([]);
  readonly users = this.#users.asReadonly();

  readonly #pages = signal<PageMeta[]>([]);
  readonly pages = this.#pages.asReadonly();

  readonly #rawPageDtos = signal<RbacPageDto[]>([]);
  readonly rawPageDtos = this.#rawPageDtos.asReadonly();

  readonly #permissions = signal<PermissionDto[]>([]);
  readonly permissions = this.#permissions.asReadonly();

  readonly #loaded = signal(false);
  readonly loaded = this.#loaded.asReadonly();

  readonly #myMenus = signal<RbacMenuDto[]>([]);
  readonly myMenus = this.#myMenus.asReadonly();

  readonly #myPages = signal<RbacPageDto[]>([]);
  readonly myPages = this.#myPages.asReadonly();

  readonly #myPermissions = signal<Set<string>>(new Set());
  readonly myPermissions = this.#myPermissions.asReadonly();

  // ------------------------------------------------------------------
  // Sélecteurs dérivés
  // ------------------------------------------------------------------

  readonly activeUsers = computed(() => this.#users().filter(u => u.status === 'ACTIVE'));

  readonly roleByCode = computed(() => {
    const map = new Map<string, Role>();
    for (const r of this.#roles()) map.set(r.code, r);
    return map;
  });

  readonly groupedPermissions = computed<PermissionsGrouped[]>(() =>
    groupPermissions(this.#permissions())
  );

  // ========================================================================
  // CHARGEMENT — ensureLoaded() (appelé au démarrage de l'app par AppInitializer ou composant racine)
  // ========================================================================

  private _loadPromise: Promise<void> | null = null;
  
  ensureLoaded(force = false): Promise<void> {
   
    if (this.#loaded() && !force) return Promise.resolve();
    if (!force && this._loadPromise) return this._loadPromise;
    this._loadPromise = this.doLoad().toPromise().then(() => undefined).finally(() => {
      this._loadPromise = null;
    });
    return this._loadPromise;
  }

  private doLoad(): Observable<void> {
  // On vérifie si l'utilisateur est authentifié via le signal de l'AuthService
  if (!this.auth.isAuthenticated()) {
    this.resetAll();
    return of(undefined);
  }
  return from(this.loadRefs()).pipe(tap(() => this.#loaded.set(true)));
}

  private async loadRefs(): Promise<void> {
   
    try {
     const [roles, pages, users, permissions, myPages, myAccess, myMenus] = await Promise.all([
      firstValueFrom(this.listRoles().pipe(catchError(() => of([])))),
      firstValueFrom(this.listPages().pipe(catchError(() => of([])))),
      firstValueFrom(this.listUsers().pipe(catchError(() => of([])))), // Sécurisé contre les 403/401
      firstValueFrom(this.listPermissions().pipe(catchError(() => of([])))),
      firstValueFrom(this.loadMyPages().pipe(catchError(() => of([])))),
      firstValueFrom(this.loadMyAccess().pipe(catchError(() => of(null)))),
      firstValueFrom(this.loadMyMenus().pipe(catchError(() => of([])))),
    ]);
      this.#pages.set(pages.map(toPageMeta));
      this.#rawPageDtos.set(pages);
      this.#permissions.set(permissions);
      this.#myPages.set(myPages);
      this.#myMenus.set(myMenus);
      if (myAccess) {
        const s = new Set<string>();
        for (const p of myAccess.permissions ?? []) s.add(p);
        this.#myPermissions.set(s);
      }
      // Enrichir les rôles avec leurs pages
      const finalRoles: Role[] = [];
      for (const dto of roles) {
        const rolePages: PageCode[] = [];
        try {
          const codes = await firstValueFrom(this.getRolePages(dto.code));
          for (const c of codes) rolePages.push(asPageCode(c));
        } catch { /* noop */ }
        finalRoles.push(toRole(dto, rolePages));
      }
      this.#roles.set(finalRoles);
      this.#users.set(users.map(toRbacUser));
    } catch (err) {
      console.error('[rbac] Échec chargement référentiels RBAC', err);
    }
  }

  resetAll(): void {
    this.#roles.set([]);
    this.#users.set([]);
    this.#pages.set([]);
    this.#rawPageDtos.set([]);
    this.#permissions.set([]);
    this.#myPages.set([]);
    this.#myMenus.set([]);
    this.#myPermissions.set(new Set());
    this.#loaded.set(false);
  }

  // ========================================================================
  // Pages — référentiel
  // ========================================================================

  pageCatalog(): readonly PageMeta[] { return this.#pages(); }

  pageGrouped(): { group: string; pages: readonly PageMeta[] }[] {
    const groups = new Map<string, PageMeta[]>();
    for (const p of this.#pages()) {
      const arr = groups.get(p.group) ?? [];
      arr.push(p);
      groups.set(p.group, arr);
    }
    return Array.from(groups.entries()).map(([group, pages]) => ({ group, pages }));
  }

  listPages(): Observable<RbacPageDto[]> {
    return this.http.get<ApiResponse<RbacPageDto[]>>(`${this.base}/pages`).pipe(unwrapApiResponse);
  }

  loadMyPages(): Observable<RbacPageDto[]> {
    return this.http.get<ApiResponse<RbacPageDto[]>>(`${this.base}/me/pages`).pipe(
      unwrapApiResponse,
      tap(list => this.#myPages.set(list))
    );
  }

  /** Charge les menus RBAC pour l'utilisateur courant. */
 loadMyMenus(): Observable<RbacMenuDto[]> {
   return this.http.get<ApiResponse<RbacMenuDto[]>>(`${this.base}/me/menus`).pipe(
     unwrapApiResponse,
     tap(menus => this.#myMenus.set(menus))
   );
 }

  loadMyAccess(): Observable<RbacAccessDto | null> {
    return this.http.get<ApiResponse<RbacAccessDto>>(`${this.base}/me/access`).pipe(
      unwrapApiResponse,
      catchError(() => of(null)),
      tap(dto => {
        if (!dto) return;
        const s = new Set<string>();
        for (const p of dto.permissions ?? []) s.add(p);
        this.#myPermissions.set(s);
        // Mettre aussi à jour les rôles dans AuthService si vide
        if (dto.roleCodes?.length && this.auth.roles().length === 0) {
          // AuthService expose un signal readonly roles; ne peut pas être set depuis ici.
          // On laisse la charge utile /auth/me faire le travail.
        }
      })
    );
  }

  // ========================================================================
  // Permissions — liste groupée
  // ========================================================================

  listPermissions(): Observable<PermissionDto[]> {
    return this.http.get<ApiResponse<PermissionDto[]>>(`${this.base}/permissions`).pipe(unwrapApiResponse);
  }

  // ========================================================================
  // Rôles — CRUD
  // ========================================================================

  listRoles(): Observable<RbacRoleDto[]> {
    return this.http.get<ApiResponse<RbacRoleDto[]>>(`${this.base}/roles`).pipe(unwrapApiResponse);
  }

  createRole(input: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Observable<Role> {
    const body: RbacRoleRequestDto = {
      code: input.code.toUpperCase(),
      label: input.name,
      description: input.description ?? undefined,
      displayOrder: 0,
      active: true,
    };
    return this.http.post<ApiResponse<RbacRoleDto>>(`${this.base}/roles`, body).pipe(
      unwrapApiResponse,
      switchMap(dto => this.setRolePages(dto.code, input.pageAccess).pipe(
        map(() => toRole(dto, [...input.pageAccess]))
      )),
      tap(r => this.#roles.update(list => [...list, r]))
    );
  }

  updateRole(id: string, patch: Partial<Omit<Role, 'id' | 'createdAt'>>): Observable<Role | null> {
    const existing = this.#roles().find(r => r.id === id);
    if (!existing) return of(null);
    return this.http.get<ApiResponse<RbacRoleDto>>(`${this.base}/roles/${existing.code}`).pipe(
      unwrapApiResponse,
      switchMap(current => {
        const body: RbacRoleRequestDto = {
          code: existing.code,
          label: patch.name ?? current.label,
          description: patch.description ?? undefined,
          displayOrder: current.displayOrder,
          active: current.active,
        };
        return this.http.put<ApiResponse<RbacRoleDto>>(`${this.base}/roles/${existing.code}`, body).pipe(
          unwrapApiResponse,
          switchMap(dto => {
            const nextPages = patch.pageAccess ?? existing.pageAccess;
            return this.setRolePages(dto.code, nextPages).pipe(
              map(pageCodes => toRole(dto, pageCodes.map(asPageCode)))
            );
          })
        );
      }),
      tap(role => this.#roles.update(list => list.map(current => current.id === id ? role : current)))
    );
  }

  deleteRole(id: string): Observable<void> {
    const existing = this.#roles().find(r => r.id === id);
    if (!existing) return of(undefined);
    if (existing.code === 'ADMIN') {
      return throwError(() => new Error("Le rôle ADMIN ne peut pas être supprimé."));
    }
    return this.http.delete(`${this.base}/roles/${existing.code}`).pipe(
      map(() => undefined),
      tap(() => {
        this.#roles.update(list => list.filter(r => r.id !== id));
        this.#users.update(list => list.map(u => ({
          ...u,
          roleCodes: u.roleCodes.filter(c => c !== existing.code),
          updatedAt: new Date().toISOString(),
        })));
      }),
      catchError(err => {
        console.error('[rbac] deleteRole failed', err);
        return throwError(() => err);
      })
    );
  }

  getRolePages(code: string): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.base}/roles/${code}/pages`).pipe(unwrapApiResponse);
  }

  setRolePages(code: string, pages: PageCode[]): Observable<string[]> {
    const body: RbacPageCodesRequestDto = { pageCodes: pages.map(String) };
    return this.http.put<ApiResponse<string[]>>(`${this.base}/roles/${code}/pages`, body).pipe(unwrapApiResponse);
  }

  addRolePage(code: string, page: PageCode): Observable<string[]> {
    return this.http.post<ApiResponse<string[]>>(`${this.base}/roles/${code}/pages/${page}`, {}).pipe(unwrapApiResponse);
  }

  removeRolePage(code: string, page: PageCode): Observable<string[]> {
    return this.http.delete<ApiResponse<string[]>>(`${this.base}/roles/${code}/pages/${page}`).pipe(unwrapApiResponse);
  }

  // ========================================================================
  // Utilisateurs — CRUD
  // ========================================================================

  listUsers(): Observable<UserResponseDto[]> {
    return this.http.get<ApiResponse<UserResponseDto[]>>(`${this.base}/users`).pipe(unwrapApiResponse);
  }

  createUser(input: Omit<RbacUser, 'id' | 'createdAt' | 'updatedAt'>): Observable<RbacUser> {
    return throwError(() => new Error(
      '[rbac.createUser] — signature synchronisée obsolète. Utilisez createUserFromForm(...) avec mot de passe en clair.'
    ));
  }

  createUserFromForm(input: {
    username: string; email: string; firstName: string; lastName: string;
    password: string; roleCodes: string[]; status?: UserStatus;
  }): Observable<RbacUser> {
    const body: UserCreateRequestDto = {
      username: input.username.trim().toLowerCase(),
      email: input.email.trim(),
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      enabled: (input.status ?? 'ACTIVE') === 'ACTIVE',
      roleCodes: input.roleCodes,
    };
    return this.http.post<ApiResponse<UserResponseDto>>(`${this.base}/users`, body).pipe(
      unwrapApiResponse,
      map(dto => toRbacUser(dto)),
      tap(user => this.#users.update(list => [...list, user]))
    );
  }

  updateUser(id: string, patch: Partial<Omit<RbacUser, 'id' | 'createdAt'>>): Observable<RbacUser | null> {
    const existing = this.#users().find(u => u.id === id);
    if (!existing) return of(null);
    const body: UserUpdateRequestDto = {};
    if (patch.email != null) body.email = patch.email;
    if (patch.firstName != null) body.firstName = patch.firstName;
    if (patch.lastName != null) body.lastName = patch.lastName;
    if (patch.status != null) body.enabled = patch.status === 'ACTIVE';
    if (patch.roleCodes != null) body.roleCodes = patch.roleCodes;
    return this.http.put<ApiResponse<UserResponseDto>>(`${this.base}/users/${existing.id}`, body).pipe(
      unwrapApiResponse,
      map(dto => toRbacUser(dto)),
      tap(user => this.#users.update(list => list.map(u => u.id === id ? user : u))),
      catchError(err => {
        console.error('[rbac] updateUser failed', err);
        return of(null);
      })
    );
  }

  changeUserPassword(userId: string, newPassword: string): Observable<void> {
    const existing = this.#users().find(u => u.id === userId);
    if (!existing) return of(undefined);
    const body: UserUpdateRequestDto = { password: newPassword };
    return this.http.put<ApiResponse<UserResponseDto>>(`${this.base}/users/${existing.id}`, body).pipe(
      unwrapApiResponse,
      map(dto => toRbacUser(dto)),
      tap(user => this.#users.update(list => list.map(u => u.id === userId ? user : u))),
      map(() => undefined)
    );
  }

  setUserStatus(id: string, status: UserStatus): Observable<void> {
    return this.updateUser(id, { status }).pipe(map(() => undefined));
  }

  toggleUserStatus(id: string): Observable<void> {
    const u = this.#users().find(x => x.id === id);
    if (!u) return of(undefined);
    return this.setUserStatus(id, u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
  }

  assignRoles(id: string, roleCodes: string[]): Observable<void> {
    const existing = this.#users().find(u => u.id === id);
    if (!existing) return of(undefined);
    const body: RbacRoleCodesRequestDto = { roleCodes };
    return this.http.put<ApiResponse<string[]>>(`${this.base}/users/${existing.id}/roles`, body).pipe(
      unwrapApiResponse,
      tap(codes => {
        this.#users.update(list => list.map(u => u.id === id ? {
          ...u,
          roleCodes: [...codes],
          updatedAt: new Date().toISOString(),
        } : u));
      }),
      map(() => undefined)
    );
  }

  deleteUser(id: string): Observable<void> {
    const existing = this.#users().find(u => u.id === id);
    if (!existing) return of(undefined);
    return this.http.delete(`${this.base}/users/${existing.id}`).pipe(
      map(() => undefined),
      tap(() => this.#users.update(list => list.filter(u => u.id !== id)))
    );
  }

  // ========================================================================
  // Authentification locale (OBSOLÈTE — AuthService est la source de vérité)
  // ========================================================================

  authenticate(_username: string, _password: string): RbacUser | null {
    console.warn('[rbac.authenticate] OBSOLÈTE. Utilisez AuthService.login().');
    return null;
  }

  toAuthUser(u: RbacUser): User {
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      roles: [...u.roleCodes],
    };
  }

  // ========================================================================
  // Autorisation — canAccess
  // ========================================================================

  pageAccessForUser(user: Pick<User, 'roles'> | null): Set<PageCode> {
    if (!user) return new Set();
    // Priorité 1: si c'est l'utilisateur courant, utiliser le set de AuthService
    const current = this.auth.currentUser();
    if (current && user && current.id === (user as User).id) {
      return new Set<PageCode>([...this.auth.authorizedPages()].map(String) as PageCode[]);
    }
    // Fallback: croisement role.pageAccess
    const set = new Set<PageCode>();
    const rbc = this.roleByCode();
    for (const code of user.roles) {
      const role = rbc.get(code);
      if (role) for (const p of role.pageAccess) set.add(p);
    }
    return set;
  }

  canAccess(user: Pick<User, 'roles'> | null, page: PageCode): boolean {
    if (!user) {
      if (this.auth.currentUser()) {
        return this.auth.authorizedPages().has(String(page));
      }
      return false;
    }
    const current = this.auth.currentUser();
    if (current && (user as User).id === current.id) {
      return this.auth.authorizedPages().has(String(page));
    }
    return this.pageAccessForUser(user).has(page);
  }
}
