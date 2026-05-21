# Extraction Feasibility Gate (G1–G6)

**Status:** Phase 3 readiness assessment (post Phase 2)  
**Date:** 2026-05-20  
**Scope:** Pattern 6 preparation only — no microservice deploy, no separate process, no npm package publish until product trigger passes.  
**Requirements:** [IAM-19](../.specs/features/modular-monolith-iam/spec.md) (P3: Audit extraction readiness)  
**Phase 3 spec:** [.specs/features/modular-monolith-iam/spec.md](../.specs/features/modular-monolith-iam/spec.md) — stories P3 (Audit + Access Control readiness)  
**Baseline table:** [Decomposition roadmap — Feasibility Gate](./decomposition-planning-roadmap-user-auth.md#feasibility-gate-pattern-6)

---

## Phase 2 completion (T1–T8)

| Task | Outcome |
|------|---------|
| T1 | `src/auth/authentication/` leaf — authn flattened |
| T2 | `UserRole` SSOT from `@generated/prisma` |
| T3 | `publishAudit` + typed `AuditAction` in `audit-log/events` |
| T4 | Shared Kernel ADR (`docs/adr-shared-kernel-user.md`) |
| T5 | `src/user/application/` leaf |
| T6 | Domain boundary fitness function (`npm run check:boundaries`) |
| T7 | `IUserDirectory` + `IUserCredentialsReader` ports |
| T8 | Identity stack: deprecate `src/identity/` (`docs/identity-stack-decision.md`) |

---

## Gate status (post Phase 2)

| Gate | Post Phase 2 status | Required to proceed | Notes |
|------|---------------------|---------------------|-------|
| **G1** — Bounded context clarity | **PASS** | Maintain domain map | IAM + Audit + Shared documented ([domain analysis](./domain-analysis-user-auth.md), [grouping](./domain-identification-grouping-user-auth.md)) |
| **G2** — Low-risk integration surfaces | **PASS** | Versioned `AuditEvent` + ports | `publishAudit`, `AuditAction`, JSON Schema v1 + `schemaVersion` (T9); user/auth ports (T7) |
| **G3** — Physical boundaries match logical | **PASS** | `authentication/` leaf complete | T1 done; authn no longer at `auth/` root |
| **G4** — Coupling health | **PASS** | Re-run coupling after refactors | No CRITICAL edges ([coupling analysis](./coupling-analysis-user-auth.md)); fitness function enforces IAM→Audit allowlist |
| **G5** — Business driver | **FAIL — blocks deploy** | Independent deploy/scaling need | Reference-only repo; no product trigger for microservice extraction |
| **G6** — Shared Kernel strategy | **PARTIAL** | Split schema ownership or ACL API | `User` table ownership documented (ADR); single Prisma schema remains — acceptable for modular monolith, open for service split |

---

## Verdict

| Question | Answer |
|----------|--------|
| Proceed with modular monolith hardening? | **Yes** — Phase 1–2 complete; Phase 3 readiness docs/contracts in progress |
| Deploy Audit (or IAM) as separate service? | **No** — **G5 FAIL** is the explicit deploy blocker |
| Phase 3 (T9/T10) value? | Blueprint + contracts so extraction is low-risk **when** G5 passes |

**Pattern 6 extraction:** Deferred until **G5** and **G6** strategy are accepted by product/architecture. Technical gates G1–G4 and G2 contract work are satisfied for Audit event-only integration; G6 remains the main data-boundary work for Access Control / User Directory split.

---

## Related deliverables (T9)

| Artifact | Purpose |
|----------|---------|
| [ADR: Audit service extraction](./adr-audit-service-extraction.md) | Event-only boundary, consumer ownership, rollback, ordered steps |
| `src/audit-log/contracts/audit-event.v1.schema.json` | Portable v1 payload contract |
| `scripts/check-domain-boundaries.mjs` | IAM must not import `audit-log.service` (only `audit-log/events/*`) |

---

## When G5 passes

1. Re-run this table with product driver documented (scale, compliance isolation, team topology).
2. Execute [ADR: Audit service extraction](./adr-audit-service-extraction.md) ordered steps.
3. Re-evaluate G6 before Access Control extraction (T10 ADR).
