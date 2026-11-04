// ==========================================================================
// RBAC — modèles Utilisateurs, Rôles & accès pages
// ==========================================================================

/**
 * Statut d'un utilisateur :
 * - ACTIVE   : peut se connecter
 * - INACTIVE : désactivé, ne peut plus se connecter
 */
export type UserStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Identifiant unique d'une page protégée de l'application.
 * Ces constantes sont utilisées à la fois dans :
 *   1) Role.pageAccess[]  (quelles pages un rôle peut voir)
 *   2) route.data.rbac.page  (clé d'autorisation à matcher sur le guard)
 */
export type PageCode =
  | 'dashboard'
  | 'administration.users'
  | 'administration.roles'
  | 'administration.permissions'
  | 'administration.settings'
  | 'assurance.vie'
  | 'assurance.vie.calculator'
  | 'assurance.vie.lettre-epargne'
  | 'assurance.vie.mothmer'
  | 'assurance.auto'
  | 'assurance.maladie'
  | 'assurance.transport'
  | 'assurance.divers'
  | 'assurance.incendie'
  | 'bureau-ordre'
  | 'bureau-ordre.decharge-bordereaux'
  | 'reassurance'
  | 'sinistres'
  | 'partenaires'
  | 'reporting'
  | 'documents'
  | 'auth.profile'
  | 'auth.change-password';

export interface PageMeta {
  code: PageCode;
  label: string;
  group: string;
}

/**
 * Rôle applicatif, avec un jeu de pages autorisées.
 */
export interface Role {
  id: string;
  code: string;         // ex. 'ADMIN'
  name: string;         // ex. 'Administrateur'
  description?: string;
  pageAccess: PageCode[];
  createdAt: string;    // ISO date
  updatedAt: string;    // ISO date
}

/**
 * Énumération libre (identique à `string`) — utilisée uniquement pour
 * typer User.roleCodes[] afin de signaler qu'il s'agit de Role.code.
 */
export type RoleCode = string;

/**
 * Utilisateur du référentiel RBAC.
 * Rq : il est volontairement distinct de User dans user.model.ts (utilisé
 * pour la session connectée) — un transformateur est fourni par le service
 * RBAC pour convertir `RbacUser -> auth User` au login.
 */
export interface RbacUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCodes: RoleCode[];     // ex. ['ADMIN', 'USER'] — rôles affectés
  status: UserStatus;
  passwordHash: string;      // TODO: simple hash md5-like mock → remplacer par vrai back
  createdAt: string;
  updatedAt: string;
}
