# ADR: Access Control service extraction (readiness)

**Status:** Accepted (readiness only — no deploy)  
**Date:** 2026-05-20  
**Requirements:** [IAM-22, IAM-23, IAM-24](../.specs/features/modular-monolith-iam/spec.md) (P3: Access Control extraction readiness)  
**Related:** [Shared Kernel — Prisma `User`](./adr-shared-kernel-user.md) · [Coupling analysis](./coupling-analysis-user-auth.md) · [Coupling addendum (post Phase 2)](./coupling-analysis-extraction-readiness.md) · [Decomposition roadmap](./decomposition-planning-roadmap-user-auth.md) · [Identity stack decision](./identity-stack-decision.md)

---

## Context

Phase 1–2 refactored IAM into logical subdomains:

| Logical unit | Nest / code location | Responsibility |
|--------------|----------------------|----------------|
| User Directory | `src/user/` | User lifecycle, public profile APIs, no JWT |
| Access Control | `src/auth/authentication/` + `src/auth/authorization/` | Sign-in, JWT issue/verify, RBAC guards |
| Audit | `src/audit-log/` | Inbound audit persistence (event contract) |

User Directory already exposes persistence through ports ([T7](../.specs/features/modular-monolith-iam/tasks.md)):

| Port | Token | Consumer today | Read shape |
|------|-------|----------------|------------|
| `IUserDirectory` | `USER_DIRECTORY` | `UserService` | CRUD without `passwordHash` |
| `IUserCredentialsReader` | `USER_CREDENTIALS_READER` | `AuthService` | Email lookup with `passwordHash` for verify |

**Feasibility gate G5** (product driver for independent deploy) is **not** satisfied for this reference repo. Until G5 passes, **do not** split `AppModule` into separate deployables or extract microservices.

---

## Decision

### 1. Access Control = Authentication + Authorization (single deployable unit)

When service extraction is allowed (G5 + G6), the **first IAM split candidate after Audit** is **Access Control**: one deployable that owns:

- JWT issuance (`AuthService.signIn`, `JwtModule`)
- JWT validation (`AuthGuard`)
- Authorization policy (`AbilityFactory`, `PermissionsGuard`, `@CheckPermissions`)

User Directory remains a **separate** deployable that owns user lifecycle and **does not** issue or validate JWTs.

### 2. User Directory exposes identity / claims read API only (post-split)

After split, Authentication must not depend on User Directory’s Prisma adapter. The port surface today is the blueprint:

- **`IUserCredentialsReader`** — sign-in lookup (email + `passwordHash` + claims fields). In a distributed layout this becomes an **internal HTTP/gRPC API** or read replica, not a shared ORM import.
- **`IUserDirectory`** — admin/profile CRUD; may expose **`GET /users/:id/claims`** (or equivalent) returning `{ sub, email, role }` aligned with [`JwtPayload`](../src/shared/contracts/jwt-payload.ts) without leaking `passwordHash`.

Do **not** merge `UserRepository` and `AuthRepository` (see [Shared Kernel ADR](./adr-shared-kernel-user.md)).

### 3. Shared Kernel strategy: `User` table vs JWT claims

| Artifact | Owner (logical) | Split-time strategy |
|----------|-----------------|---------------------|
| Prisma `User` table / migrations | User Directory | Single schema owner; Auth stops direct ORM |
| `JwtPayload` (`sub`, `email`, `role`) | Shared contracts (`src/shared/contracts/`) | SSOT for guards and token shape; publish as npm package or OpenAPI component when repos split |
| `UserRole` enum | Prisma / generated client | Imported in DTOs and `JwtPayload`; avoid duplicate enums |
| Runtime `request['user']` | Access Control (in-process today) | Becomes validated JWT claims only in Access Control deployable |

**Option A (near term):** Shared Kernel stays **data + claims shape** documentation; monolith keeps one database.  
**Option B (G5 + G6):** User Directory owns data; Access Control calls **credentials/claims API**; Shared Kernel shrinks to **`JwtPayload` + versioned claims contract** only.

### 4. Monolith until G5: logical modules, one deploy

Until the [feasibility gate G5](./decomposition-planning-roadmap-user-auth.md#feasibility-gate-pattern-6) passes:

- Keep **one** `AppModule` / one process.
- Treat `authentication/` and `authorization/` as **logical** Nest boundaries inside `AuthModule` (folder + imports), not separate deployables.
- Guards continue to use SSOT [`JwtPayload`](../src/shared/contracts/jwt-payload.ts) from `src/shared/contracts/` (allowed by `npm run check:boundaries`).

`IPermissionChecker` facade (user → authz) is **deferred** — not required for readiness.

---

## Epic steps when G5 passes

Ordered work (aligns with [Story 10](./decomposition-planning-roadmap-user-auth.md#story-10-extract-access-control-service-future)):

1. **Re-run coupling** — confirm zero CRITICAL edges for Authentication ↔ Authorization (see [addendum](./coupling-analysis-extraction-readiness.md)).
2. **Version claims contract** — publish `JwtPayload` + `UserRole` as shared package or API schema; freeze guard behavior.
3. **Replace `IUserCredentialsReader` adapter** — HTTP/gRPC client to User Directory credentials endpoint; remove `AuthRepository` Prisma access.
4. **Extract Access Control service** — deploy AuthModule surface (sign-in, JWT, guards, policy) with its own DB only if needed (sessions/keys); no User CRUD.
5. **Shrink User Directory API** — identity + directory only; optional explicit claims endpoint for other products.
6. **Update global guard registration** — either API gateway validates JWT or each service embeds Access Control library; document guard order (`AuthGuard` → `PermissionsGuard`).

Dependencies: Stories 1–7 complete; Audit extraction learnings (Story 9) recommended before IAM service cut.

---

## Consequences

**Positive**

- Clear target deployable for IAM token + policy work.
- `JwtPayload` SSOT removes duplicate guard types and aligns verify with `PermissionsGuard`.
- Ports document the only allowed auth → user coupling today.

**Negative / trade-offs**

- `src/shared/contracts` is a new allowed import path for IAM — must stay minimal (no business logic).
- Shared Kernel `User` table coupling remains until G6 strategy (split schema vs claims API) is executed.

**Out of scope (this ADR)**

- Microservice deploy, k8s, or second `AppModule` instance.
- Merging repositories or adding `IPermissionChecker` unless trivial follow-up.

---

## Verification

- [x] Access Control = authn + authz deployable unit stated
- [x] User Directory = ports / claims API only after split
- [x] Shared Kernel: `User` table vs `JwtPayload` documented
- [x] Monolith until G5; epic steps listed
- [x] No merge of `UserRepository` + `AuthRepository`
