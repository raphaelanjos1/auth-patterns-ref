# ADR: RBAC contract SSOT in `permissions-api`

**Status:** Accepted  
**Date:** 2026-06-02  
**Related:** [domain-analysis-user-auth.md](./domain-analysis-user-auth.md) (Issue #1), [adr-access-control-service-extraction.md](./adr-access-control-service-extraction.md)

## Context

`src/permissions-api/` was introduced as an Open Host Service so modules such as `user` do not import `src/auth/authorization/*`. Initially the facade **re-exported** types from `auth/authorization`, and `permission-checker.port.ts` imported `PermissionRequirement` from the implementation. That inverted dependency: the published contract depended on the adapter.

## Decision

- **Single source of truth** for the RBAC public contract lives in `src/permissions-api/`:
  - `action.enum.ts`, `subject.enum.ts`
  - `check-permissions.decorator.ts` (`CheckPermissions`, `PermissionRequirement`, `PERMISSIONS_KEY`)
  - `permission-checker.port.ts` (`IPermissionChecker`)
- **`src/auth/authorization/`** holds implementation only: `policy-map.ts`, `ability-factory.ts`, `ability-permission-checker.ts`, `permissions.guard.ts`, and specs. It **imports** enums/decorator/types from `permissions-api`.
- **`yarn run check:boundaries`** scans `src/permissions-api/**` and forbids imports from `src/auth/**` and `src/user/**` (except `src/shared/contracts` for `JwtPayload` on the port).

## Consequences

### Positive

- Consumers (`user`, future modules) depend on a stable facade, not on auth internals.
- Access Control can be extracted later with `permissions-api` published as a shared package or API contract.
- Fitness function catches regressions (facade importing implementation).

### Negative / trade-offs

- `auth/authorization/index.ts` may re-export facade symbols for app-internal convenience; new cross-context code should still import from `permissions-api`.
- Decorator lives in the facade and uses `@nestjs/common` (`SetMetadata`) — acceptable for this NestJS reference repo.

## References

- [authorization.md](./authorization.md) — flow and “Adding permissions”
- [ARCHITECTURE-GUIDELINES.md](./ARCHITECTURE-GUIDELINES.md) §5, §7
- [scripts/check-domain-boundaries.mjs](../scripts/check-domain-boundaries.mjs)
