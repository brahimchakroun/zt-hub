// ==========================================================================
// Couche d'adaptation DTO backend → Modèles frontend
// ==========================================================================
// Seul endroit autorisé à importer à la fois :
//   - backend-api.model.ts (DTOs Java → TS)
//   - rbac.model.ts / user.model.ts (interfaces frontend publiques)
//
// Toute conversion DTO → Modèle frontend passe par ici.
// Les composants standalone n'ont PAS le droit d'importer de type DTO.
// ==========================================================================

import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiResponse, AuthUserDto, PermissionDto, RbacPageDto, RbacRoleDto, UserResponseDto } from '../models/backend-api.model';
import { PageCode, PageMeta, RbacUser, Role, UserStatus } from '../models/rbac.model';
import { User } from '../models/user.model';

// ==========================================================================
// 1) Constantes globales PAGE_ROUTE_MAP / ICON_MAP / GROUP_ICON_MAP
// ==========================================================================

export const KNOWN_PAGE_CODES: readonly PageCode[] = [
  'dashboard',
  'administration.users',
  'administration.roles',
  'administration.permissions',
  'administration.settings',
  'assurance.vie',
  'assurance.vie.calculator',
  'assurance.vie.lettre-epargne',
  'assurance.vie.mothmer',
  'assurance.auto',
  'assurance.maladie',
  'assurance.transport',
  'assurance.divers',
  'assurance.incendie',
  'bureau-ordre',
  'bureau-ordre.decharge-bordereaux',
  'reassurance',
  'sinistres',
  'partenaires',
  'reporting',
  'documents',
  'auth.profile',
  'auth.change-password',
] as const;

export const PAGE_ROUTE_MAP: Record<PageCode, string> = {
  'dashboard': '/dashboard',
  'administration.users': '/administration/users',
  'administration.roles': '/administration/roles',
  'administration.permissions': '/administration/permissions',
  'administration.settings': '/administration/settings',
  'assurance.vie': '/assurance-vie',
  'assurance.vie.calculator': '/assurance-vie/calculator',
  'assurance.vie.lettre-epargne': '/assurance-vie/lettre-epargne',
  'assurance.vie.mothmer': '/assurance-vie/mothmer',
  'assurance.auto': '/assurance-auto',
  'assurance.maladie': '/assurance-maladie',
  'assurance.transport': '/assurance-transport',
  'assurance.divers': '/assurance-risques-divers',
  'assurance.incendie': '/assurance-incendie',
  'bureau-ordre': '/bureau-ordre',
  'bureau-ordre.decharge-bordereaux': '/decharge-bordereaux',
  'reassurance': '/reassurance',
  'sinistres': '/sinistres',
  'partenaires': '/partenaires',
  'reporting': '/reporting',
  'documents': '/documents',
  'auth.profile': '/auth/profile',
  'auth.change-password': '/auth/change-password',
};

export const ICON_MAP: Readonly<Record<string, string>> = {
  'dashboard': 'pi pi-home',
  'users': 'pi pi-users',
  'shield': 'pi pi-id-card',
  'key': 'pi pi-lock',
  'settings': 'pi pi-sliders-h',
  'heart': 'pi pi-heart',
  'calculate': 'pi pi-calculator',
  'savings': 'pi pi-user',
  'car': 'pi pi-car',
  'medical_services': 'pi pi-plus-circle',
  'local_shipping': 'pi pi-cart-plus',
  'category': 'pi pi-box',
  'fire': 'pi pi-warehouse',
  'inbox': 'pi pi-building',
  'receipt_long': 'pi pi-qrcode',
  'account_tree': 'pi pi-share-alt',
  'report_problem': 'pi pi-exclamation-triangle',
  'handshake': 'pi pi-briefcase',
  'analytics': 'pi pi-chart-bar',
  'description': 'pi pi-folder',
  'person': 'pi pi-user',
  'lock': 'pi pi-lock',
};

export const GROUP_ICON_MAP: Readonly<Record<string, string>> = {
  'general': 'pi pi-home',
  'administration': 'pi pi-cog',
  'assurance.vie': 'pi pi-heart',
  'assurance': 'pi pi-box',
  'bureau-ordre': 'pi pi-building',
  'reassurance': 'pi pi-share-alt',
  'sinistres': 'pi pi-exclamation-triangle',
  'partenaires': 'pi pi-briefcase',
  'reporting': 'pi pi-chart-bar',
  'documents': 'pi pi-folder',
  'auth': 'pi pi-user',
};

const FALLBACK_ICON = 'pi pi-box';
const FALLBACK_GROUP = 'Autres';
const FALLBACK_ROUTE = '/404';

// ==========================================================================
// 2) Validateur + cast sûr d'un string → PageCode
// ==========================================================================

const _KNOWN = new Set<string>(KNOWN_PAGE_CODES);

export function asPageCode(raw: string | null | undefined): PageCode {
  const s = (raw ?? '').trim();
  if (!s) return KNOWN_PAGE_CODES[0];
  if (!_KNOWN.has(s)) {
    console.warn(`[rbac.mapper] PageCode backend "${s}" absent de KNOWN_PAGE_CODES. Considéré valide (source backend = vérité).`);
  }
  return s as PageCode;
}

// ==========================================================================
// 3) Mappers DTO → Modèle frontend
// ==========================================================================
export interface LoginResponseDto {
  readonly user: AuthUserDto;
  readonly accessToken?: string;
}
export function toUser(dto: AuthUserDto): User {
  return {
    id: dto.id,
    username: dto.username,
    email: dto.email,
    firstName: dto.firstName,
    lastName: dto.lastName,
    roles: [...dto.roles],
  };
}

export function normalizeAuthUserDto(value: unknown): AuthUserDto {
  const response = isRecord(value) && isRecord(value['user']) ? value['user'] : value;
  if (!isRecord(response)) {
    throw new Error('Réponse d’authentification invalide : profil utilisateur absent.');
  }

  const roles = response['roles'] ?? response['roleCodes'];
  if (typeof response['id'] !== 'string' || typeof response['username'] !== 'string' ||
      typeof response['email'] !== 'string' || typeof response['firstName'] !== 'string' ||
      typeof response['lastName'] !== 'string' || !Array.isArray(roles)) {
    throw new Error('Réponse d’authentification invalide : champs utilisateur ou rôles absents. Vérifiez la version du backend.');
  }

  const pageAccess = response['pageAccess'];
  if (pageAccess !== undefined && !Array.isArray(pageAccess)) {
    throw new Error('Réponse d’authentification invalide : pageAccess doit être un tableau.');
  }

  return {
        id: response['id'],
    username: response['username'],
    email: response['email'],
    firstName: response['firstName'],
    lastName: response['lastName'],
    roles,
    pageAccess: pageAccess ?? [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toRbacUser(dto: UserResponseDto): RbacUser {
  const status = (dto.status ?? 'ACTIVE') === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return {
    id: dto.id,
    username: dto.username,
    email: dto.email,
    firstName: dto.firstName,
    lastName: dto.lastName,
    roleCodes: [...dto.roleCodes],
    status: status as UserStatus,
    passwordHash: '',
    createdAt: typeof dto.createdAt === 'string' ? dto.createdAt : new Date(dto.createdAt as unknown as Date).toISOString(),
    updatedAt: typeof dto.updatedAt === 'string' ? dto.updatedAt : new Date(dto.updatedAt as unknown as Date).toISOString(),
  };
}

export function toRole(dto: RbacRoleDto, pageAccess: PageCode[] = []): Role {
  const now = new Date().toISOString();
  return {
    id: dto.code,
    code: dto.code,
    name: dto.label,
    description: dto.description ?? undefined,
    pageAccess: [...pageAccess],
    createdAt: now,
    updatedAt: now,
  };
}

export function toPageMeta(dto: RbacPageDto): PageMeta {
  return {
    code: asPageCode(dto.pageCode),
    label: dto.label,
    group: dto.groupName ?? FALLBACK_GROUP,
  };
}

export function resolveIcon(backendIcon?: string | null): string {
  if (!backendIcon) return FALLBACK_ICON;
  return ICON_MAP[backendIcon] ?? FALLBACK_ICON;
}

export function resolveGroupIcon(groupName: string | undefined | null, firstChildIcon = FALLBACK_ICON): string {
  if (!groupName) return firstChildIcon;
  return GROUP_ICON_MAP[groupName] ?? firstChildIcon;
}

export function resolveRoute(code: PageCode): string {
  return PAGE_ROUTE_MAP[code] ?? FALLBACK_ROUTE;
}

// ==========================================================================
// 4) Permissions DTO → liste groupée simple
// ==========================================================================

export interface PermissionsGrouped {
  group: string;
  items: readonly PermissionDto[];
}

export function groupPermissions(list: readonly PermissionDto[]): PermissionsGrouped[] {
  const map = new Map<string, PermissionDto[]>();
  for (const p of list) {
    const g = p.groupName ?? FALLBACK_GROUP;
    const arr = map.get(g) ?? [];
    arr.push(p);
    map.set(g, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, items]) => ({ group, items: Object.freeze(items) }));
}

// ==========================================================================
// 5) Helper RxJS : unwrap ApiResponse<T> → T
// ==========================================================================

export function unwrapApiResponse<T>(source: Observable<ApiResponse<T>>): Observable<T> {
  return source.pipe(
    map(resp => {
      if (resp == null) throw new Error('Réponse HTTP vide.');
      return resp.data;
    }),
    catchError(err => {
      const msg = extractErrorMessage(err);
      return throwError(() => ({ ...err, message: msg }));
    })
  );
}

function extractErrorMessage(err: any): string {
  try {
    const body = err?.error;
    if (!body) return err?.message ?? 'Erreur réseau ou serveur indisponible.';
    if (typeof body === 'string') return body;
    if (typeof body.message === 'string') return body.message;
    if (Array.isArray(body.errors) && body.errors.length) {
      const first = body.errors[0];
      if (typeof first === 'string') return first;
      if (first?.defaultMessage) return String(first.defaultMessage);
    }
    if (body.data?.message) return String(body.data.message);
  } catch { /* noop */ }
  return err?.message ?? 'Erreur inattendue.';
}
