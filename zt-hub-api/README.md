# ZT Hub API

Template de reference pour tous les futurs microservices Spring Boot.

Stack : Java 17, Spring Boot 3.3, Spring Security (JWT stateless), Spring Data JPA,
SQL Server (H2 en DEV/test), Flyway, Lombok, MapStruct, Swagger/OpenAPI, Actuator.

Architecture en couches simple : **Controller -> Service -> Repository -> Database**,
organisee par domaine fonctionnel (pas de couche globale).

```
src/main/java/com/zt/hub
├── config       (JpaConfig, CorsConfig + CorsProperties, OpenApiConfig, RequestLoggingFilter)
├── security     (JwtService, JwtAuthenticationFilter, JwtAuthenticationEntryPoint,
│                 CustomUserDetailsService, SecurityConfig)
├── audit        (AuditLogEntity, AuditRepository, AuditService, AuditAction)
├── common       (BaseEntity, dto/PageResponse)
├── users        (controller, service, repository, entity, dto, mapper)
├── roles        (controller, service, repository, entity, dto, mapper)
├── auth         (controller, service, entity/RefreshToken, repository, dto)
└── exception    (GlobalExceptionHandler, BusinessException, ResourceNotFoundException,
                  UnauthorizedException, ErrorResponse)
```

## Demarrage

```bash
# DEV (H2 en memoire, compte admin/admin123)
mvn spring-boot:run

# PROD (SQL Server)
export DB_URL="jdbc:sqlserver://serveur:1433;databaseName=ZT_HUB;encrypt=true"
export DB_USERNAME=zt_hub
export DB_PASSWORD=*****
export JWT_SECRET=$(openssl rand -base64 64)
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

Swagger : http://localhost:8080/swagger-ui.html

## Compte de demonstration (seed V2)

| Username  | Password   | Roles           |
|-----------|------------|-----------------|
| admin     | admin123   | ADMIN           |
| manager   | admin123   | MANAGER         |
| demo      | admin123   | USER            |

> A supprimer / regenerer avant toute mise en production.

## Authentification JWT

```bash
# 1. Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. Appel authentifie
curl http://localhost:8080/api/users \
  -H "Authorization: Bearer <accessToken>"

# 3. Refresh (rotation : l'ancien refresh token est revoque)
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'

# 4. Logout (revocation du refresh token)
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

## Securite

- JWT stateless (`SessionCreationPolicy.STATELESS`), access token 1 h, refresh token 7 jours.
- Autorisation par roles avec `@PreAuthorize("hasRole('ADMIN')")` (method security activee).
- `BCryptPasswordEncoder` pour les mots de passe.
- Headers de securite : `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'`,
  `Referrer-Policy: same-origin`.
- CORS externalise dans `application.yml` (`app.cors.allowed-origins`).

## Audit

- `BaseEntity` : `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `version`
  (verrouillage optimiste) via `@EnableJpaAuditing` + `AuditingEntityListener`.
- `AuditService` : journalise login, logout, creations, modifications, suppressions et erreurs
  dans `AUDIT_LOG` (transaction `REQUIRES_NEW` : l'audit survit au rollback metier).

## Logging

`RequestLoggingFilter` (SLF4J/Logback) : URL, utilisateur, code HTTP, temps d'execution.
Les parametres `password`, `token`, `secret` sont masques (`***`).

## Endpoints Actuator

- `/actuator/health`
- `/actuator/info`
- `/actuator/metrics`

## Acces RBAC

`GET /api/v1/rbac/me/access` retourne les roles, codes de pages et permissions affectes en base a l'utilisateur authentifie :

```json
{
  "roleCodes": ["ADMIN", "USER"],
  "pageAccess": ["dashboard", "administration.users"],
  "permissions": ["DASHBOARD_VIEW", "USERS_READ"]
}
```

`GET /api/v1/rbac/me/pages` retourne les metadonnees des pages actives autorisees (libelle, groupe, icone et ordre) pour construire le menu sans constantes frontend.

Les routes de gestion suivantes requierent le role `ADMIN` :

- Roles : `GET/POST /api/v1/rbac/roles`, `GET/PUT/DELETE /api/v1/rbac/roles/{roleCode}`.
- Pages : `GET/POST /api/v1/rbac/pages`, `GET/PUT/DELETE /api/v1/rbac/pages/{pageCode}`.
- Roles d'un utilisateur : `GET/PUT /api/v1/rbac/users/{userId}/roles`, `POST/DELETE /api/v1/rbac/users/{userId}/roles/{roleCode}`.
- Pages d'un role : `GET/PUT /api/v1/rbac/roles/{roleCode}/pages`, `POST/DELETE /api/v1/rbac/roles/{roleCode}/pages/{pageCode}`.

## Tests

```bash
mvn clean install
```

- `ZtHubApiApplicationTests` : chargement du contexte Spring (H2).
- `JwtServiceTest` : cycle generate / validate / extract des jetons.
- `UserServiceTest` : tests unitaires du service utilisateurs (Mockito).

## Base de donnees

- Scripts SQL Server et migrations Flyway : `sql/` (l'application doit etre lancee avec ce dossier disponible).
- `V009` etend les metadonnees de pages et roles, `V010` cree le catalogue des permissions,
  puis `V011` a `V014` initialisent pages, roles, permissions et affectations RBAC.
- Scripts H2 (DEV/test) : `src/main/resources/db/migration/h2/`
- `ddl-auto: none` : le schema est exclusivement gere par Flyway.
