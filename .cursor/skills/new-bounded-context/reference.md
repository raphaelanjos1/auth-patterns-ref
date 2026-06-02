# Fictional example: `billing` (not in repo)

Planning-only illustration — **not compilable code**.

## Problem space

- Bounded context: **Billing**
- Feature: **Subscription** (recurring plans)

## Proposed tree

```
src/billing/
├── subscription/
│   ├── subscription.controller.ts
│   ├── subscription.service.ts
│   └── subscription.repository.ts
├── billing.module.ts
└── dto/
```

## Integrations

| Need | Approach |
|------|----------|
| Audit | `publishAudit` from `audit-log/events` |
| Admin API protection | `@CheckPermissions` + enums from `permissions-api` |
| Persistence | Prisma via `shared/database` |
| User identity | Port or HTTP to User Directory later — **no** direct `src/user/application` imports |

## Boundaries (future)

When `src/billing/` is created, add to `check-domain-boundaries.mjs` with explicit allowlists (likely `shared/*`, `audit-log/events`, `permissions-api`).
