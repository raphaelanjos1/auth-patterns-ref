# Extraction feasibility gate

**Status:** Phase 3 = readiness only (no microservices in this repo until product approves)

## Gate G5 (product)

Do **not** split IAM into separate deployables until product explicitly needs independent scaling, team ownership, or compliance isolation.

## Readiness checklist (technical)

| Item | Status |
|------|--------|
| Audit via events only (`audit-log/events`) | Done |
| RBAC contract SSOT in `permissions-api` | Done ([adr-rbac-contract-ssot.md](./adr-rbac-contract-ssot.md)) |
| `check:boundaries` covers `user`, `auth`, `permissions-api` | Done |
| Ports: `IUserDirectory`, `IUserCredentialsReader` | Done |
| Local verify gate (`npm run verify`) | Done (CI optional later) |

## Recommended extraction order (when G5 opens)

1. **Audit** — already event-based; smallest IAM coupling.
2. **Access Control** — take `auth/authorization` + publish `permissions-api` as client contract.
3. **User Directory** — owns `User` data; authentication becomes a separate consumer of credentials API.

## References

- [domain-analysis-user-auth.md](./domain-analysis-user-auth.md)
- [ARCHITECTURE-GUIDELINES.md](./ARCHITECTURE-GUIDELINES.md) §7
