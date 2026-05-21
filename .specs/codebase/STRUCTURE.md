# Project Structure

**Root:** `auth-patterns-ref/`

## Directory Tree (max 3 levels)

```
auth-patterns-ref/
├── .specs/                 # Spec-driven (PROJECT, codebase, features)
├── docs/                   # DDD analyses + how-to guides
├── prisma/                 # schema + migrations
├── generated/prisma/       # Prisma client output
├── scripts/                # check-domain-boundaries.mjs, etc.
├── src/
│   ├── app.module.ts       # User, Auth, AuditLog wired
│   ├── user/
│   │   ├── application/
│   │   ├── domain/ports/
│   │   └── dto/
│   ├── auth/
│   │   ├── authentication/
│   │   ├── authorization/
│   │   └── auth.module.ts
│   ├── audit-log/
│   │   ├── events/
│   │   └── contracts/
│   ├── permissions-api/
│   ├── shared/
│   │   ├── database/
│   │   ├── hashing/
│   │   ├── contracts/
│   │   └── swagger/
│   └── __mocks__/
├── test/                   # e2e (app + auth-user)
└── coverage/
```

> **`src/identity/`** does not exist. Deprecated — [docs/identity-stack-decision.md](../../docs/identity-stack-decision.md).

## Module Organization

### User Directory (`src/user/`)

**Purpose:** CRUD, pagination, audit emit  
**Key files:** `application/user.module.ts`, `user.controller.ts`, `user.service.ts`, `user.repository.ts`, `domain/ports/user-directory.port.ts`, `dto/`  
**Statements:** ~148 (42% IAM scope) — [inventory](../../docs/component-inventory.md)

### Authentication (`src/auth/authentication/`)

**Purpose:** Sign-in, JWT, `AuthGuard`, `@Public`  
**Key files:** `auth.service.ts`, `auth.controller.ts`, `auth.repository.ts` (`USER_CREDENTIALS_READER`)

### Authorization (`src/auth/authorization/`)

**Purpose:** RBAC, policy map, `PermissionsGuard`, `AbilityPermissionChecker`  
**Facade for consumers:** `src/permissions-api/`

### Audit Log (`src/audit-log/`)

**Purpose:** Event listener + Prisma persist  
**Contract surface:** `events/publish-audit.ts`, `contracts/audit-event.v1.schema.json`

### Shared (`src/shared/`)

**Purpose:** Prisma, Argon2, Swagger, `JwtPayload`

## Where Things Live

| Capability | HTTP | Business logic | Data access |
|------------|------|----------------|-------------|
| Users | `user/application/user.controller.ts` | `user.service.ts` | `user.repository.ts` → `USER_DIRECTORY` |
| Sign-in | `auth/authentication/auth.controller.ts` | `auth.service.ts` | `auth.repository.ts` → `USER_CREDENTIALS_READER` |
| Permissions | decorators + global guard | `ability-factory.ts` | — |
| Audit | — (event-driven) | `audit-log.service.ts` | `audit-log.repository.ts` |
| DB | — | — | `shared/database/prisma.service.ts` |

## Special Directories

| Path | Purpose |
|------|---------|
| `docs/` | DDD analyses + operational guides — **not replaced by `.specs/`** |
| `.specs/` | Vision, brownfield summary, executable spec/tasks |
| `generated/prisma` | Client + enums SSOT (`UserRole`, `AuditAction`) |
