// ==========================================================================
// Interfaces TypeScript correspondant aux DTOs Spring Boot backend
// (records Java sous zt-hub-api/src/main/java/com/zt/hub/dto)
// ==========================================================================
// Ces types sont la FRONTIÈRE avec le backend. Ils ne doivent JAMAIS être
// importés par un composant standalone. Ils sont strictement réservés aux
// services (AuthService/RbacService/MenuService) + rbac.mapper.ts.
// ==========================================================================

export interface ApiResponse<T> {
  readonly ok: boolean;
  readonly data: T;
}

export interface AuthTokenDataDto {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresIn: number;
  readonly refreshToken: string;
  readonly user: AuthUserDto;
}

export interface AuthUserDto {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly roles: readonly string[];
  readonly pageAccess: readonly string[];
}

export interface RbacRoleDto {
  readonly code: string;
  readonly label: string;
  readonly description?: string | null;
  readonly displayOrder: number;
  readonly active: boolean;
}

export interface RbacPageDto {
  readonly pageCode: string;
  readonly label: string;
  readonly urlRoot: string;
  readonly groupName?: string | null;
  readonly icon?: string | null;
  readonly displayOrder: number;
  readonly active: boolean;
  readonly description?: string | null;
}

export interface RbacMenuDto {
  readonly menuCode: string;
  readonly label: string;
  readonly urlRoot?: string | null;
  readonly icon?: string | null;
  readonly displayOrder: number;
  readonly active: boolean;
  readonly pages: readonly RbacPageDto[];
}

export interface RbacAccessDto {
  readonly roleCodes: readonly string[];
  readonly pageAccess: readonly string[];
  readonly permissions: readonly string[];
}

export interface PermissionDto {
  readonly permissionCode: string;
  readonly label: string;
  readonly groupName?: string | null;
  readonly displayOrder: number;
  readonly active: boolean;
  readonly description?: string | null;
}

export interface UserResponseDto {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly status: 'ACTIVE' | 'INACTIVE';
  readonly roleCodes: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ==========================================================================
// Corps de requêtes — MUTABLES (les services peuvent construire un objet
// littéral incrémentalement avant l'envoi HTTP).
// ==========================================================================

export interface UserCreateRequestDto {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  enabled?: boolean;
  roleCodes: readonly string[];
}

export interface UserUpdateRequestDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  password?: string;
  roleCodes?: readonly string[];
}

export interface RbacRoleRequestDto {
  code: string;
  label: string;
  description?: string;
  displayOrder: number;
  active: boolean;
}

export interface RbacPageCodesRequestDto {
  pageCodes: readonly string[];
}

export interface RbacRoleCodesRequestDto {
  roleCodes: readonly string[];
}

export interface ChangePasswordBodyDto {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordBodyDto {
  email: string;
}

export interface ResetPasswordBodyDto {
  resetToken: string;
  newPassword: string;
}

export interface LogoutBodyDto {
  refreshToken?: string;
}

export interface MessageResponseDto {
  readonly message: string;
}
