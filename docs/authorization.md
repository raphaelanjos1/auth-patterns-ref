# Authorization (RBAC with granular permissions)

## Overview

The authorization system uses an **RBAC with Permissions** model — user roles are mapped to discrete permissions (action + subject), and access decisions are based on those permissions, not the role directly.

This allows the permission matrix to evolve without changing guards or controllers.

## Concepts

| Concept        | Description                                                      | Example                          |
|----------------|------------------------------------------------------------------|----------------------------------|
| **Action**     | Operation that can be performed                                  | `CREATE`, `READ`, `UPDATE`, `DELETE` |
| **Subject**    | Resource on which the action is performed                        | `User`                           |
| **Policy Map** | Declarative matrix that defines permissions per role             | `ADMIN → [CREATE, READ, ...]`    |
| **Ability**    | Object generated for a user with `can`/`cannot` methods          | `ability.can(READ, User) → true` |
| **Guard**      | Protects endpoints by checking permissions via ability           | `PermissionsGuard`               |

## Authorization flow

```
Request with Bearer token
        |
        v
   AuthGuard
   (validates JWT, injects request.user with { sub, email, role })
        |
        v
   PermissionsGuard
        |--- Reads @CheckPermissions metadata from the endpoint
        |--- If no metadata, allows access (unrestricted route)
        |--- Extracts role from request.user
        |--- Calls AbilityFactory.createForRole(role)
        |--- Checks ability.can(action, subject)
        |
    +---+---+
    |       |
  can()   cannot()
    |       |
    v       v
  200     403 Forbidden
```

## Current permission matrix

| Action / Role | ADMIN | MANAGER | USER |
|---------------|:-----:|:-------:|:----:|
| User:CREATE   |  ✅   |   ✅    |  ❌  |
| User:READ     |  ✅   |   ✅    |  ✅  |
| User:UPDATE   |  ✅   |   ✅    |  ❌  |
| User:DELETE   |  ✅   |   ❌    |  ❌  |

Defined in `src/auth/authorization/policy-map.ts`:

```typescript
export const POLICY_MAP: Record<UserRole, Permission[]> = {
  ADMIN: [
    { action: Action.CREATE, subject: Subject.USER },
    { action: Action.READ, subject: Subject.USER },
    { action: Action.UPDATE, subject: Subject.USER },
    { action: Action.DELETE, subject: Subject.USER },
  ],
  MANAGER: [
    { action: Action.CREATE, subject: Subject.USER },
    { action: Action.READ, subject: Subject.USER },
    { action: Action.UPDATE, subject: Subject.USER },
  ],
  USER: [{ action: Action.READ, subject: Subject.USER }],
};
```

## How to protect an endpoint

Apply the `@CheckPermissions` decorator to the route:

```typescript
import { Action, CheckPermissions, Subject } from '../../permissions-api';

@Controller('user')
export class UserController {
  @Get()
  @CheckPermissions({ action: Action.READ, subject: Subject.USER })
  findAll() { }

  @Post()
  @CheckPermissions({ action: Action.CREATE, subject: Subject.USER })
  create() { }

  @Patch(':id')
  @CheckPermissions({ action: Action.UPDATE, subject: Subject.USER })
  update() { }
}
```

Routes **without** `@CheckPermissions` are accessible to any authenticated user
(the `PermissionsGuard` allows access when no metadata is found).

### Permissions API facade (`permissions-api/`)

The **public RBAC contract** is **defined** in `src/permissions-api/` (not re-exported from `auth`). Implementation (`POLICY_MAP`, `AbilityFactory`, `PermissionsGuard`) stays in `src/auth/authorization/` and imports enums/decorator from the facade.

Modules outside `auth` must not import `src/auth/authorization/*` directly. Import from `src/permissions-api/` instead — enforced by `yarn run check:boundaries`.

| Export | Purpose |
|--------|---------|
| `Action`, `Subject`, `CheckPermissions`, `PermissionRequirement` | Contract SSOT |
| `IPermissionChecker` | Port for guard implementations (`AbilityPermissionChecker` in auth) |

Reference: [adr-rbac-contract-ssot.md](./adr-rbac-contract-ssot.md), [permissions-api/index.ts](../src/permissions-api/index.ts), [user.controller.ts](../src/user/application/user.controller.ts).

## Components

### Action (`src/permissions-api/action.enum.ts`)

Enum with available operations (`CREATE`, `READ`, `UPDATE`, `DELETE`).

### Subject (`src/permissions-api/subject.enum.ts`)

Enum with system resources (e.g. `USER = 'User'`).

To add a new resource, extend `Subject` in `permissions-api` and expand `POLICY_MAP` in `auth/authorization`.

### AbilityFactory (`ability-factory.ts`)

Injectable service that generates an `Ability` object from the user's role:

```typescript
const ability = abilityFactory.createForRole('MANAGER');
ability.can(Action.READ, Subject.USER);    // true
ability.can(Action.DELETE, Subject.USER);  // false
ability.cannot(Action.DELETE, Subject.USER); // true
```

### CheckPermissions (`src/permissions-api/check-permissions.decorator.ts`)

Decorator that sets the `PermissionRequirement` (action + subject) as route metadata, consumed by the `PermissionsGuard`.

### PermissionsGuard (`permissions.guard.ts`)

Global guard registered in `AppModule` via `APP_GUARD`. Global guard execution order:

```
1. AuthGuard        → validates JWT
2. PermissionsGuard → checks permissions
3. ThrottlerGuard   → rate limiting
```

The guard:

1. Reads the `PermissionRequirement` from route metadata via `Reflector`
2. If no metadata, returns `true` (route without permission restriction)
3. Extracts the user from `request['user']` (injected by `AuthGuard`)
4. Generates the `Ability` via `AbilityFactory.createForRole(user.role)`
5. Checks `ability.can(action, subject)`
6. Returns `403 Forbidden` if the user lacks permission

## File structure

```
src/permissions-api/              — Contract SSOT
  action.enum.ts
  subject.enum.ts
  check-permissions.decorator.ts
  permission-checker.port.ts
  index.ts

src/auth/authorization/           — Implementation
  index.ts                       — Re-exports facade + implementation barrel
  policy-map.ts                  — Role → permissions matrix
  ability-factory.ts             — Generates Ability with can()/cannot()
  ability-permission-checker.ts  — IPermissionChecker adapter
  permissions.guard.ts           — Global guard that checks permissions
```

## Adding permissions (checklist)

Use this when introducing a new **action**, **subject**, or protected route:

1. **Contract** — Add or extend `Action` / `Subject` in `src/permissions-api/` (`action.enum.ts`, `subject.enum.ts`).
2. **Policy** — Extend `POLICY_MAP` in `src/auth/authorization/policy-map.ts` for each `UserRole` that should have the permission.
3. **HTTP** — Apply `@CheckPermissions({ action, subject })` on controllers; import `Action`, `Subject`, `CheckPermissions` from `permissions-api` (see [user.controller.ts](../src/user/application/user.controller.ts)).
4. **Verify** — `npm run verify` (boundaries + unit + e2e) and add/adjust guard specs under `auth/authorization/*.spec.ts` if behavior changes.

Do not add role checks with raw `if (user.role)` in services — keep the matrix in `POLICY_MAP`.

## How to add a new resource

Example: adding authorization for a `Product` resource.

**1. Add to the subjects enum** (`src/permissions-api/subject.enum.ts`):

```typescript
export enum Subject {
  USER = 'User',
  PRODUCT = 'Product',
}
```

**2. Expand the policy map:**

```typescript
export const POLICY_MAP: Record<UserRole, Permission[]> = {
  ADMIN: [
    // ... existing permissions
    { action: Action.CREATE, subject: Subject.PRODUCT },
    { action: Action.READ, subject: Subject.PRODUCT },
    { action: Action.UPDATE, subject: Subject.PRODUCT },
    { action: Action.DELETE, subject: Subject.PRODUCT },
  ],
  MANAGER: [
    // ... existing permissions
    { action: Action.CREATE, subject: Subject.PRODUCT },
    { action: Action.READ, subject: Subject.PRODUCT },
  ],
  USER: [
    // ... existing permissions
    { action: Action.READ, subject: Subject.PRODUCT },
  ],
};
```

**3. Apply to the controller:**

```typescript
@Get()
@CheckPermissions({ action: Action.READ, subject: Subject.PRODUCT })
findAll() { }
```

## Model classification

| Concept                                        | Model                  | Present |
|------------------------------------------------|------------------------|:-------:|
| Permissions derived from role                  | RBAC                   |   ✅    |
| Action + Subject (verb + resource)             | Permission-Based       |   ✅    |
| Declarative policy map                         | Policy-Based           |   ✅    |
| `can()` / `cannot()` (ability)                 | Inspired by ABAC/CASL  |   ✅    |
| Resource attributes (e.g. "owner of the data") | ABAC                   |   ❌    |
| Role hierarchy                                 | Hierarchical RBAC      |   ❌    |

To evolve towards **ABAC**, the `AbilityFactory` can be extended to receive the full user and the target resource, enabling rules like "USER can only update their own profile".
