# Coding Patterns

Living reference for patterns in the **active IAM stack** (`src/user/`, `src/auth/`, `src/audit-log/`, `src/permissions-api/`, `src/shared/`). New bounded contexts (e.g. `billing/`) should follow the same **clean-arch-lite** stance unless they fall under [§ When NOT To Use](#when-not-to-use).

Rules come from the [clean-arch-lite skill](../.cursor/skills/clean-arch-lite/SKILL.md). This doc adds repo-grounded examples so you do not re-read the skill plus every module.

> **Historical note:** A richer `src/identity/` layout (entities, VOs, `infrastructure/`) was explored and **deprecated**. See [identity-stack-decision.md](./identity-stack-decision.md). For full tactical DDD (entities, `pullEvents`, VOs), use the [tactical-ddd skill](../.cursor/skills/tactical-ddd/SKILL.md) when a module truly needs it — not required for the current IAM code.

---

## Goals & Non-Goals

**Goals (priority order):**

1. **Business logic testable** — services orchestrate; repositories isolate Prisma.
2. **Dependency inversion at infra boundaries** — ports (`Symbol` + interface) for DB projections and cross-module reads.
3. **Loose coupling** — audit via `publishAudit`; RBAC via `permissions-api` for non-auth consumers.

**Non-goals (this repo today):**

- A separate `application/` folder per feature everywhere (only User Directory uses `user/application/`).
- Use-case classes per method.
- Mapper-per-field or DTO-per-internal-state.
- A live rich-domain tree under `src/identity/` (removed).

---

## Active Module Layout

```
src/
├── user/
│   ├── application/          # UserModule, controller, service, repository adapter
│   ├── domain/ports/         # IUserDirectory (only ports today)
│   └── dto/
├── auth/
│   ├── authentication/       # sign-in, AuthGuard, AuthRepository (credentials)
│   ├── authorization/        # RBAC, guards, policy map
│   └── auth.module.ts
├── audit-log/
│   ├── events/               # publishAudit, AUDIT_EVENT (IAM may import only this)
│   └── contracts/            # v1 schema + AUDIT_CONTRACT_VERSION
├── permissions-api/          # facade: Action, Subject, CheckPermissions, IPermissionChecker
└── shared/
    ├── database/
    ├── hashing/
    └── contracts/            # JwtPayload SSOT
```

Canonical wiring: [app.module.ts](../src/app.module.ts), [user.module.ts](../src/user/application/user.module.ts), [auth.module.ts](../src/auth/auth.module.ts).

---

## Ports (infra boundaries)

Add a port **only** when crossing DB, hashing, JWT, or another module’s persistence. One `*.port.ts` per port: `Symbol` token + `IPascalCase` interface.

**User Directory** — public projection without password hash:

Reference: [user-directory.port.ts](../src/user/domain/ports/user-directory.port.ts).

```ts
export const USER_DIRECTORY = Symbol('USER_DIRECTORY');

export type UserDirectoryRecord = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

export interface IUserDirectory {
  findById(id: string): Promise<UserDirectoryRecord | null>;
  // ...
}
```

**Credentials read** (auth only) — includes `passwordHash` for sign-in:

Reference: [user-credentials-reader.port.ts](../src/user/domain/ports/user-credentials-reader.port.ts).

Adapter: [user.repository.ts](../src/user/application/user.repository.ts) implements `IUserDirectory` with `omit: { passwordHash: true }`.  
Adapter: [auth.repository.ts](../src/auth/authentication/auth.repository.ts) implements `IUserCredentialsReader`.

---

## Repository adapters

- `@Injectable()` class implements the port.
- **Only** place in that module that imports Prisma for that aggregate.
- Use Prisma `omit` / separate methods so password hash never leaks on directory reads.

Reference: [user.repository.ts](../src/user/application/user.repository.ts).

---

## Application services

Standard write flow (active stack):

```
pre-check (uniqueness / existence)
  → Prisma create/update via port
  → publishAudit(emitter, { action, entityId, userId, metadata })
  → return projection
```

- Inject ports with `@Inject(USER_DIRECTORY)` (or credentials reader in auth).
- Use `HashingService` from `shared/hashing` for passwords.
- Throw Nest HTTP exceptions at this layer (`ConflictException`, `NotFoundException`, `UnauthorizedException`).
- **Do not** call `AuditLogService` directly — use `publishAudit` from `audit-log/events/`.

Reference: [user.service.ts](../src/user/application/user.service.ts), [auth.service.ts](../src/auth/authentication/auth.service.ts).

```ts
import { publishAudit } from '../../audit-log/events/publish-audit';

publishAudit(this.eventEmitter, {
  action: 'USER_CREATED',
  entityId: user.id,
  userId: performedBy ?? null,
  metadata: { email: user.email, role: user.role },
});
```

Audit helper sets `schemaVersion` (v1 contract). See [publish-audit.ts](../src/audit-log/events/publish-audit.ts), [audit-contract.ts](../src/audit-log/contracts/audit-contract.ts).

---

## Controllers

- Pass-through: validation via DTO + global `ValidationPipe`.
- Decorators: `@CheckPermissions`, `@ApiTags`, `@Req` for actor id.
- **User module** imports RBAC from `permissions-api`, not from `auth/authorization/` paths.

Reference: [user.controller.ts](../src/user/application/user.controller.ts).

```ts
import { Action, CheckPermissions, Subject } from '../../permissions-api';

@CheckPermissions({ action: Action.READ, subject: Subject.USER })
findAll() { ... }
```

Extract actor: `req['user']?.sub` (typed helper in controller). JWT shape: [jwt-payload.ts](../src/shared/contracts/jwt-payload.ts).

Auth routes: [auth.controller.ts](../src/auth/authentication/auth.controller.ts) with `@Public()` where needed.

---

## DI wiring

**UserModule** — directory port → repository:

```ts
providers: [
  { provide: USER_DIRECTORY, useClass: UserRepository },
  UserService,
],
```

**AuthModule** — credentials port → auth repository; JWT global; exports `AbilityFactory` + `AbilityPermissionChecker`:

```ts
providers: [
  { provide: USER_CREDENTIALS_READER, useClass: AuthRepository },
  AuthService,
  AbilityFactory,
  AbilityPermissionChecker,
],
```

**AppModule** — `UserModule`, `AuthModule`, `AuditLogModule`; global `AuthGuard`, `PermissionsGuard`, `ThrottlerGuard`.

References: [user.module.ts](../src/user/application/user.module.ts), [auth.module.ts](../src/auth/auth.module.ts), [app.module.ts](../src/app.module.ts).

---

## Authorization

RBAC lives in `src/auth/authorization/`. Consumers outside auth use `src/permissions-api/` (re-exports + `IPermissionChecker`).

| Piece | File |
|-------|------|
| Actions / subjects | `action.enum.ts`, `subject.enum.ts` |
| Policy matrix | [policy-map.ts](../src/auth/authorization/policy-map.ts) |
| Ability | [ability-factory.ts](../src/auth/authorization/ability-factory.ts) |
| Decorator | [check-permissions.decorator.ts](../src/auth/authorization/check-permissions.decorator.ts) |
| Guard | [permissions.guard.ts](../src/auth/authorization/permissions.guard.ts) |
| Facade | [permissions-api/index.ts](../src/permissions-api/index.ts) |

Details: [authorization.md](./authorization.md).

---

## DTOs

- Location: `src/user/dto/`, `src/auth/authentication/sign-in.dto.ts`.
- Naming: `CreateUserDto`, `UpdateUserDto`, `FindAllUsersQueryDto`, `SignInDto`.
- `UserRole` and `AuditAction`: import from `@generated/prisma` (SSOT) — no duplicate enums in DTOs.

---

## Audit integration

| Rule | Detail |
|------|--------|
| Emit | `publishAudit` only |
| Import path | `audit-log/events/*` from IAM modules |
| Forbidden | `audit-log.service`, `audit-log.repository`, `audit-log.module` from user/auth |
| Listener | [audit-log.service.ts](../src/audit-log/audit-log.service.ts) `@OnEvent(AUDIT_EVENT)` |

Fitness function: `yarn run check:boundaries` ([scripts/check-domain-boundaries.mjs](../scripts/check-domain-boundaries.mjs)).

---

## Tests

**Services / guards:** `Test.createTestingModule` with `{ provide: USER_DIRECTORY, useValue: mock }`.

References: [user.service.spec.ts](../src/user/application/user.service.spec.ts), [auth.service.spec.ts](../src/auth/authentication/auth.service.spec.ts), [permissions.guard.spec.ts](../src/auth/authorization/permissions.guard.spec.ts).

**E2E:** `test/auth-user.e2e-spec.ts` — sign-in + authorized `GET /user/:id` with mocked Prisma.

**Rich domain (optional):** If you add `domain/*.entity.ts`, test without Nest — hand-roll port fakes. Not required for current IAM services.

---

## Anti-Bloat Rules

- One new string field on `User` ≈ schema + repository + DTO(s) + service metadata — aim for ≤4 files.
- No interface-per-class; ports only at boundaries.
- No use-case classes; methods on `UserService` / `AuthService`.
- No empty barrels; `permissions-api` and `authorization/index.ts` are intentional public surfaces.

---

## New-Module Checklist

- [ ] `yarn run check:boundaries` passes after cross-module imports.
- [ ] IAM audit uses `publishAudit`, not direct service calls.
- [ ] Non-auth modules import RBAC from `permissions-api` only.
- [ ] Password hash never returned from `IUserDirectory` paths.
- [ ] `JwtPayload` defined once in `shared/contracts`.
- [ ] Service specs mock ports via `Symbol` tokens.
- [ ] `yarn test` and `yarn test:e2e` green.

---

## Optional: Rich Domain Module (not in active IAM)

When a bounded context has real invariants, use the layout from clean-arch-lite / tactical-ddd:

```
src/<module>/
├── domain/          # entity, VO, events, ports — zero @nestjs/@prisma
├── infrastructure/  # adapters
├── *.service.ts
├── *.controller.ts
└── dto/
```

Do **not** recreate `src/identity/` unless product explicitly reopens [identity-stack-decision.md](./identity-stack-decision.md).

---

## When NOT To Use

- Pure CRUD with no invariants — keep services + repository; skip entities.
- One-off scripts, migrations, demos.
- Thin proxy over an external system that owns the aggregate.

---

## Spec & ADR References

| Topic | Doc |
|-------|-----|
| IAM requirements | [.specs/features/modular-monolith-iam/spec.md](../.specs/features/modular-monolith-iam/spec.md) |
| Architecture summary | [.specs/codebase/ARCHITECTURE.md](../.specs/codebase/ARCHITECTURE.md) |
| Shared Kernel (User table) | [adr-shared-kernel-user.md](./adr-shared-kernel-user.md) |
| Extraction readiness | [extraction-feasibility-gate.md](./extraction-feasibility-gate.md) |
