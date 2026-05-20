# Project Structure

**Root:** `auth-patterns-ref/`

## Directory Tree (max 3 levels)

```
auth-patterns-ref/
├── .specs/                 # Spec-driven (PROJECT, codebase, features)
├── docs/                   # DDD analyses + how-to guides
├── prisma/                 # schema + migrations
├── generated/prisma/       # Prisma client output
├── scripts/                # e.g. component-sizing-v2.mjs
├── src/
│   ├── app.module.ts       # User, Auth, AuditLog wired
│   ├── user/
│   ├── auth/
│   │   ├── authorization/
│   │   └── dto/
│   ├── audit-log/
│   │   └── events/
│   ├── shared/
│   │   ├── database/
│   │   ├── hashing/
│   │   └── swagger/
│   ├── identity/           # parallel stack (not in AppModule)
│   └── __mocks__/
├── test/                   # e2e
└── coverage/               # jest output
```

## Module Organization

### User Directory (`src/user/`)

**Purpose:** CRUD de usuários, paginação, audit emit  
**Key files:** `user.module.ts`, `user.controller.ts`, `user.service.ts`, `user.repository.ts`, `dto/`  
**Statements:** ~148 (42% do escopo IAM) — [inventory](../../docs/component-inventory.md)

### Authentication (`src/auth/` root)

**Purpose:** Sign-in, JWT, `AuthGuard`, `Public` decorator  
**Key files:** `auth.service.ts`, `auth.controller.ts`, `auth.repository.ts`, `auth.guard.ts`  
**Planned:** mover para `auth/authentication/` (Story 1)

### Authorization (`src/auth/authorization/`)

**Purpose:** RBAC, policy map, permissions guard  
**Key files:** `ability-factory.ts`, `policy-map.ts`, `permissions.guard.ts`

### Audit Log (`src/audit-log/`)

**Purpose:** Listener de eventos + persistência Prisma  
**Contract surface:** `events/audit.event.ts`

### Shared (`src/shared/`)

**Purpose:** Prisma service, Argon2 hashing, Swagger bootstrap

### Identity (`src/identity/`) — parallel

**Purpose:** Layout clean-arch-lite com `domain/`, `ports/`, `infrastructure/`  
**Status:** Não registrado em `AppModule`

## Where Things Live

| Capability | HTTP | Business logic | Data access |
|------------|------|----------------|-------------|
| Users | `user.controller.ts` | `user.service.ts` | `user.repository.ts` |
| Sign-in | `auth.controller.ts` | `auth.service.ts` | `auth.repository.ts` |
| Permissions | decorators + guard | `ability-factory.ts` | — |
| Audit | — (event-driven) | `audit-log.service.ts` | `audit-log.repository.ts` |
| DB | — | — | `shared/database/prisma.service.ts` |

## Special Directories

| Path | Purpose |
|------|---------|
| `docs/` | Análises DDD + guias operacionais — **não substituir por `.specs/`** |
| `.specs/` | Visão, brownfield resumido, spec/tasks executáveis |
| `generated/prisma` | Client tipado; enums SSOT |
