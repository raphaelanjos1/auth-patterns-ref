# Coupling analysis addendum — extraction readiness (post Phase 2)

**Date:** 2026-05-20  
**Requirement:** [IAM-24](../.specs/features/modular-monolith-iam/spec.md)  
**Baseline:** [Coupling analysis: User & Auth](./coupling-analysis-user-auth.md) (full report, 2026-05-20)  
**Scope:** Re-confirm edges relevant to splitting **Access Control** (Authentication + Authorization) and **User Directory** after Phase 1–2 refactors. **Not** a full re-analysis.

---

## Executive summary (addendum)

| Question | Post Phase 2 answer |
|----------|---------------------|
| CRITICAL edges for **authn + authz** split? | **0** — same as baseline §Executive Summary |
| CRITICAL edges for **User Directory ↔ Access Control** split? | **0** — moderate Shared Kernel remains |
| Safe to proceed with Phase 3 **readiness** docs/code? | **Yes** |
| Safe to **deploy** separate IAM services? | **No** — [G5 blocking](./decomposition-planning-roadmap-user-auth.md#feasibility-gate-pattern-6) |

---

## Access Control internal split (Authentication ↔ Authorization)

After flattening (`src/auth/authentication/`, `src/auth/authorization/`) and `JwtPayload` SSOT in `src/shared/contracts/`:

| Edge | Strength | Distance | Volatility | CRITICAL? |
|------|----------|----------|------------|-----------|
| `AuthGuard` → `PermissionsGuard` via `request['user']` | Medium (runtime sequential) | Very low (same deploy, global guards) | Low | **No** |

**Connascence:** JWT claims shape — now typed once as [`JwtPayload`](../src/shared/contracts/jwt-payload.ts) (resolves baseline note on `role: string` vs `UserRole`).

**Verdict:** Authentication and Authorization remain **intentionally cohesive** inside one Access Control deployable. No CRITICAL coupling prevents treating them as one extraction unit.

---

## User Directory ↔ Access Control (cross-logical-module)

| Edge | Post Phase 2 | CRITICAL? |
|------|--------------|-----------|
| `AuthService` → User persistence | **`USER_CREDENTIALS_READER`** port only (`src/user/domain/ports/`) — no `UserRepository` import | No |
| `UserService` → User persistence | **`USER_DIRECTORY`** port — `UserRepository` adapter | No |
| Prisma `User` table | **Shared Kernel** — dual adapters, same table ([ADR](./adr-shared-kernel-user.md)) | No (🟡 acceptable monolith; 🟠 if distributed without API) |
| `UserController` → `auth/authorization` | Published RBAC decorators (`CheckPermissions`, `Action`, `Subject`) — fitness allowlist | No |

**Remaining model coupling (explicit):**

1. **Shared Kernel `User`** — `UserRepository` (omit hash) and credentials reader adapter (full row for verify) share schema fields `email`, `passwordHash`, `role`.
2. **`UserRole` semantics** — Prisma enum, JWT `role`, `POLICY_MAP` (symmetric functional coupling, low volatility).
3. **`JwtPayload` contract** — shared package path `src/shared/contracts/`; issuer (`AuthService.signIn`) and consumers (guards) must stay aligned.

**Ports reference (T7):**

- [`IUserDirectory`](../src/user/domain/ports/user-directory.port.ts) — directory CRUD/read projections.
- [`IUserCredentialsReader`](../src/user/domain/ports/user-credentials-reader.port.ts) — read-only credentials for sign-in.

These ports are the **only** allowed `auth → user` compile-time dependency (`npm run check:boundaries`).

---

## Audit integration (contract surface)

| Edge | Mechanism | CRITICAL? |
|------|-----------|-----------|
| `UserService` / `AuthService` → Audit | **Contract** — `publishAudit` + `AuditEvent` from `src/audit-log/events/` (not `audit-log.service`) | No |

Publishers must not import audit persistence modules. Action codes align with `AuditAction` / audit event contract (see baseline §3–4 and Story 9 readiness).

---

## Comparison to baseline matrix

No new CRITICAL rows. Post Phase 2 changes vs [baseline cross-module matrix](./coupling-analysis-user-auth.md#cross-module-balance-matrix):

| Edge | Change since baseline |
|------|------------------------|
| Auth → Authorization | `JwtPayload` SSOT; paths under `authentication/` / `authorization/` |
| Auth → User (persistence) | Compile-time edge replaced by **`USER_CREDENTIALS_READER`** port |
| User → Auth (persistence) | Documented via **`USER_DIRECTORY`** port; repositories not merged |

All baseline diagnoses remain **🟢 Good** or **🟡 Acceptable**; none escalated to CRITICAL.

---

## References

- Full analysis: [coupling-analysis-user-auth.md](./coupling-analysis-user-auth.md)
- Access Control extraction ADR: [adr-access-control-service-extraction.md](./adr-access-control-service-extraction.md)
- Shared Kernel: [adr-shared-kernel-user.md](./adr-shared-kernel-user.md)
- Feasibility gates G1–G6: [decomposition-planning-roadmap-user-auth.md](./decomposition-planning-roadmap-user-auth.md#feasibility-gate-pattern-6)
