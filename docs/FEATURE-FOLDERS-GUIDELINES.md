# Feature Folders Guidelines

**Status:** Adopted  
**Source:** Adapted from [EXAMPLE-RFC.md](./EXAMPLE-RFC.md) (RFC 09 — internal module organization)  
**Applies to:** All code under `src/` in this repository  
**See also:** [ARCHITECTURE-GUIDELINES.md](./ARCHITECTURE-GUIDELINES.md), [coding-patterns.md](./coding-patterns.md), [clean-arch-lite skill](../.cursor/skills/clean-arch-lite/SKILL.md)

---

## Purpose

This document defines **how to organize code inside a bounded context** (NestJS module tree under `src/<context>/`).

It answers:

- Organize by **business feature folders** or by **global technical layers**?
- Use **one NestJS module** per bounded context or **nested feature modules** per sub-feature?
- Where do **real boundaries** live in *this* repo (folders vs ports vs fitness functions)?

For **which** bounded contexts exist (strategic DDD), use [DOMAIN-IDENTIFICATION-GUIDELINES.md](./DOMAIN-IDENTIFICATION-GUIDELINES.md). For **cross-context** import rules, use [ARCHITECTURE-GUIDELINES.md](./ARCHITECTURE-GUIDELINES.md) §5.

---

## Terminology (this repo)

| Term | Meaning | Example in auth-patterns-ref |
|------|---------|------------------------------|
| **Bounded context** | Linguistic + ownership boundary; maps to a top-level `src/` folder | `user`, `auth`, `audit-log` |
| **NestJS module** | DI wiring unit (`*.module.ts`) | `UserModule`, `AuthModule`, `AuditLogModule` |
| **Feature** | Business capability **inside** a bounded context | `authentication`, `authorization` inside `auth` |
| **Feature folder** | Directory grouping all code for one feature | `src/auth/authentication/`, `src/auth/authorization/` |
| **Deploy unit** | What ships together | **Entire app** (`AppModule`) — not individual feature folders |
| **Technical boundary** | Enforced by tooling or explicit contracts | `yarn run check:boundaries`, ports, `permissions-api` facade |

**Avoid confusion:**

- A **feature folder** is **not** a deploy unit and **not** a bounded context.
- A **nested NestJS feature module** (e.g. `AuthenticationModule` + `AuthorizationModule` inside `auth`) is **optional**; this repo **does not** use that pattern for IAM.

---

## Problem: package by layer (anti-pattern here)

**Package by layer** splits a bounded context by technical role at the **root** of the context:

```
auth/                          # ❌ Avoid at context root
├── controllers/
├── services/
├── repositories/
└── dto/
```

### Why it hurts

1. **Fragmented navigation** — Sign-in touches controller, service, repository, and DTOs in different trees.
2. **Hidden business language** — Folder names say “services”, not “authentication” or “user directory”.
3. **Unclear ownership** — Hard to see which team or subdomain owns which slice when everything is layered together.

The historical `src/identity/` stack (layered + rich domain) was **removed** in favor of the current IAM layout. Do not recreate it — see [ARCHITECTURE-GUIDELINES.md](./ARCHITECTURE-GUIDELINES.md) §2 and [coding-patterns.md](./coding-patterns.md#optional-rich-domain-module-not-in-active-iam).

---

## Decision

### Adopt: feature folders + single NestJS module per bounded context

| Level | Organization | NestJS modules | Technical boundaries |
|-------|----------------|----------------|----------------------|
| **Repository** | `src/user`, `src/auth`, `src/audit-log`, … | One module per context (typical) | `check:boundaries`, ports, facades |
| **Inside a context** | Feature folders (`authentication/`, `authorization/`) | **One** `AuthModule` for all auth features | **Folders only** (discipline + review) |
| **Inside a feature** | [clean-arch-lite](./coding-patterns.md) slices | — | Ports at infra edges only |

**Rejected for IAM:** nested **feature modules** (`AuthenticationModule`, `AuthorizationModule`, …) with `imports` / `exports` / `forwardRef()` between sub-features that always deploy and change together.

### Rationale (auth-patterns-ref)

1. **High cohesion** — Sign-in, guards, and RBAC share JWT shape, `User` projections, and audit events; one `AuthModule` keeps DI simple.
2. **Single deploy** — No separate deployment for `authentication` vs `authorization`; strong NestJS sub-module boundaries add cost without isolation benefit.
3. **Boundaries already exist at context level** — `user` ↔ `auth` separation is enforced by [scripts/check-domain-boundaries.mjs](../scripts/check-domain-boundaries.mjs) and ports (`IUserDirectory`, `IUserCredentialsReader`, `permissions-api`).
4. **Pragmatic clean architecture** — [coding-patterns.md](./coding-patterns.md) favors services + repository adapters, not an extra `application/` tree per operation.

---

## Canonical layout (active IAM stack)

```
src/
├── user/                          # Bounded context: User Directory
│   ├── application/               # UserModule, controller, service, repository adapter
│   ├── domain/ports/              # IUserDirectory, IUserCredentialsReader
│   └── dto/
├── auth/                          # Bounded context: Access Control
│   ├── authentication/          # Feature folder — sign-in, guard, credentials repo
│   ├── authorization/             # Feature folder — policy, ability, guards
│   └── auth.module.ts             # Single NestJS module for entire context
├── audit-log/
│   ├── events/                    # Public surface for IAM (publishAudit)
│   └── contracts/
├── permissions-api/               # RBAC contract SSOT (not a feature folder)
│   ├── action.enum.ts
│   ├── subject.enum.ts
│   ├── check-permissions.decorator.ts
│   ├── permission-checker.port.ts
│   └── index.ts
└── shared/                        # Shared infra (DB, hashing, JwtPayload SSOT)
```

**Navigation rule:** To work on sign-in, stay under `src/auth/authentication/`. To work on RBAC policy, stay under `src/auth/authorization/`.

Wiring references: [app.module.ts](../src/app.module.ts), [user.module.ts](../src/user/application/user.module.ts), [auth.module.ts](../src/auth/auth.module.ts).

---

## Feature folder template (clean-arch-lite)

Use this **inside** each feature folder. Adjust depth to size; do not create empty folders.

```
src/<context>/<feature>/
├── <feature>.controller.ts      # or grouped under application/ at context level (user)
├── <feature>.service.ts
├── <feature>.repository.ts      # Prisma adapter when this feature owns persistence access
├── *.spec.ts
├── *.dto.ts                     # or ../dto/ at context level (user)
└── (guards, decorators, enums co-located with the feature)
```

**User Directory** uses a slightly deeper context root (acceptable):

```
src/user/
├── application/     # module, controller, service, repository
├── domain/ports/    # symbols + interfaces only
└── dto/
```

**Rules:**

- **Co-locate** everything a developer needs for one business capability.
- **Ports** live in `domain/ports/` when another context may depend on them — not inside `application/`.
- **Do not** add `core/`, `http/`, `persistence/` as **global** siblings at the context root unless the whole context is large enough to justify shared infra subfolders (see audit `events/` + `contracts/`).

### Contrasting with the example RFC (Fakeflix / TypeORM)

The source RFC used `core/`, `http/`, `persistence/` under each feature for GraphQL + TypeORM. **This repo uses REST + Prisma** and [clean-arch-lite](../.cursor/skills/clean-arch-lite/SKILL.md). Map concepts as follows:

| RFC (example) | auth-patterns-ref |
|---------------|-------------------|
| `core/service/` | `*.service.ts` or `application/*.service.ts` |
| `http/graphql/resolver/` | `*.controller.ts` + DTOs |
| `persistence/repository/` | `*.repository.ts` (Prisma adapter implementing a port) |
| `shared/persistence/migration/` | Prisma schema at repo root; [prisma-migrations.md](./prisma-migrations.md) |

---

## Feature folders vs nested feature modules

| Aspect | Feature folders (adopted) | Nested feature modules (not used for IAM) |
|--------|---------------------------|-------------------------------------------|
| Boundaries | Visual + code review | NestJS `imports` / `exports` |
| DI | Direct providers in one `*.module.ts` | Multiple `*.module.ts`, often `forwardRef()` |
| Circular deps between sub-features | Same module — inject normally | Common; needs `forwardRef()` |
| Fit for IAM | ✅ Same deploy, same team, shared JWT/RBAC | ❌ Extra config, little isolation gain |
| When to reconsider | Compliance needs compile-time isolation **within** one context | Rare; prefer new **bounded context** under `src/` if deploy must split |

---

## Where real boundaries live

Feature folders **do not** block imports. Use these mechanisms instead:

| Mechanism | What it enforces |
|-----------|------------------|
| `yarn run check:boundaries` | IAM → audit only via `audit-log/events/`; user ↔ auth via ports / `permissions-api`; `permissions-api ↛ auth` |
| **Ports** (`Symbol` + interface) | `IUserDirectory` without `passwordHash`; credentials only in auth adapter |
| **Facades** | `permissions-api` — **defines** `Action`/`Subject`/`@CheckPermissions`; `auth/authorization` **implements** policy/guards |
| **Events** | `publishAudit` — no `AuditLogService` from IAM |

Adding a feature folder **does not** replace any of the above.

---

## Adding a new feature folder

1. **Name** — Ubiquitous language from [CONTEXT.md](./CONTEXT.md) / domain docs (e.g. `authentication`, not `auth-core`).
2. **Place** — Under the correct bounded context: `src/<context>/<feature>/`.
3. **Register** — Add providers/controllers to the **existing** context module (`auth.module.ts`, `user.module.ts`), unless you are creating a **new** bounded context (new top-level `src/<context>/` + `AppModule` import).
4. **Cross-context access** — New port or facade; run `yarn run check:boundaries`.
5. **Audit / RBAC** — [coding-patterns.md](./coding-patterns.md#audit-integration) and `permissions-api` for non-auth controllers.
6. **Tests** — Co-locate `*.spec.ts` next to the unit under test.

---

## When to use feature folders

- Bounded context has **two or more** distinct business capabilities (e.g. `auth`: authentication + authorization).
- Multiple developers touch the same context and need **obvious** ownership paths.
- You are preparing for possible **extraction** — folders mirror subdomain boundaries ([adr-access-control-service-extraction.md](./adr-access-control-service-extraction.md)).

---

## When NOT to use

| Situation | Prefer |
|-----------|--------|
| &lt; ~10 files, single concept | Flat under `src/<context>/` (e.g. small `audit-log` pieces) |
| Thin facade only | Flat file tree (`permissions-api/index.ts`) |
| POC / spike likely to move | Minimal structure; refactor when the spike survives |
| Entire context is one feature | `application/` + `domain/ports/` at context root (`user`) — no extra feature subfolder |
| Need rich domain entities | Optional `domain/` + `infrastructure/` per [coding-patterns.md](./coding-patterns.md#optional-rich-domain-module-not-in-active-iam) — still **not** global package-by-layer |

---

## When to re-evaluate nested feature modules

Consider a **nested** `*.module.ts` per feature only if **all** apply:

- Sub-features need **hard** encapsulation (regulatory, third-party audit of imports).
- Sub-features are maintained by **different** teams with **no** shared release cadence.
- `forwardRef()` and export surfaces are acceptable ongoing cost.

If the goal is **separate deployment**, add a new **bounded context** under `src/` (and update boundary checks), not an internal NestJS feature module.

---

## Trade-offs

| Benefit | Cost |
|---------|------|
| Business concepts visible in the tree | Deeper paths (`auth/authorization/policy-map.ts`) |
| One module — simple DI and transactions | No compiler enforcement between feature folders |
| Easier extraction readiness | Team discipline required to avoid cross-feature “shortcuts” |

**Cross-cutting inside a context** (e.g. shared enums): prefer `src/<context>/` shared subfolder or `shared/contracts` for true cross-context SSOT — not a fourth global layer at repo root.

---

## Agent checklist

Before proposing structure changes:

- [ ] Bounded context vs feature vs deploy unit named correctly
- [ ] No new nested `*Module` inside `auth` / `user` without explicit approval
- [ ] No global `controllers/` / `services/` at context root
- [ ] Ports and `check:boundaries` updated if imports cross contexts
- [ ] [coding-patterns.md](./coding-patterns.md#new-module-checklist) satisfied

---

## References

### This repository

- [ARCHITECTURE-GUIDELINES.md](./ARCHITECTURE-GUIDELINES.md) — module map and cross-module rules
- [coding-patterns.md](./coding-patterns.md) — ports, services, DI, anti-bloat
- [EXAMPLE-RFC.md](./EXAMPLE-RFC.md) — original decision record (monorepo / GraphQL / TypeORM context)

### External

- [NestJS — Feature modules](https://docs.nestjs.com/modules#feature-modules)
- [Package by feature, not layer — Philipp Hauer](https://phauer.com/2020/package-by-feature/)
- [Screaming Architecture — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html)
