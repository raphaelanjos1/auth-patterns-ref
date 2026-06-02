# ADR: Access Control service extraction (readiness)

**Status:** Accepted (readiness only — no separate deploy)  
**Date:** 2026-06-02  
**Related:** [adr-rbac-contract-ssot.md](./adr-rbac-contract-ssot.md), [extraction-feasibility-gate.md](./extraction-feasibility-gate.md)

## Context

Authorization (RBAC) lives in `src/auth/authorization/` today. Other modules must not import it directly; they use `permissions-api`.

## Decision

- Keep **feature folder** `auth/authorization/` for implementation.
- Publish **contract** via `permissions-api` (SSOT after Phase A).
- Extraction order when product gate opens: **Audit → Access Control → User Directory** (see [extraction-feasibility-gate.md](./extraction-feasibility-gate.md)).
- Phase A complete: RBAC types and `@CheckPermissions` defined in `permissions-api`; boundaries script enforces `permissions-api ↛ auth`.

## Consequences

- Extracted Access Control service ships `permissions-api` (or equivalent package) as the client-facing contract; policy/ability implementation moves with the service.
- `user` continues to import only `permissions-api`, not `auth/authorization/*`.
