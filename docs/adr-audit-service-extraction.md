# ADR: Audit domain service extraction (blueprint)

**Status:** Proposed (readiness only — no deploy)  
**Date:** 2026-05-20  
**Requirements:** [IAM-21](../.specs/features/modular-monolith-iam/spec.md) (P3: Audit extraction ADR)  
**Gate:** [Extraction feasibility gate](./extraction-feasibility-gate.md) — **G5 FAIL** blocks deploy  
**Related:** [Audit log module](./audit-log.md) · [Decomposition roadmap Story 9](./decomposition-planning-roadmap-user-auth.md#story-9-extract-audit-domain-service-future) · `scripts/check-domain-boundaries.mjs`

---

## Context

Audit today lives in-process: IAM modules (`src/user`, `src/auth/authentication`) publish `audit.log` events; `AuditLogService` listens and writes to the `audit_log` table. Phase 2 removed risky coupling (typed actions, `publishAudit` helper, domain ports, fitness function). Phase 3 adds a **versioned event contract** (`schemaVersion` + JSON Schema v1) so a future Audit service can consume the same payload without IAM holding a database dependency on `audit_log`.

This ADR does **not** authorize deployment. Product gate **G5** must pass first ([feasibility gate](./extraction-feasibility-gate.md)).

---

## Decision

### 1. Event-only integration when extracting

IAM (and any future publisher) integrates with Audit **only** via:

- `publishAudit` from `src/audit-log/events/publish-audit.ts`
- `AuditEvent` + `AUDIT_EVENT` from `src/audit-log/events/audit.event.ts`
- Contract version: `AUDIT_CONTRACT_VERSION` / `audit-event.v1.schema.json`

No imports of `AuditLogService`, `AuditLogRepository`, or `audit-log.module` from IAM. Enforced by `npm run check:boundaries` (allowlist: `src/audit-log/events/*` only).

```6:8:scripts/check-domain-boundaries.mjs
 * Allowlist:
 * - IAM → Audit: only paths under src/audit-log/events (e.g. publish-audit, audit.event, audit-actions)
```

Transport at extraction time may be in-process EventEmitter → message bus (e.g. NATS, SQS, RabbitMQ); the **payload shape** remains v1 with `schemaVersion`.

### 2. Consumer lives in the Audit service

| Responsibility | Owner after extraction |
|----------------|------------------------|
| Subscribe to `audit.log` (or bus topic) | Audit service |
| Validate `schemaVersion` (reject/ dead-letter unknown major) | Audit service |
| Persist to `audit_log` table | Audit service |
| Prisma schema / migrations for `audit_log` | Audit service |
| Retry, idempotency, compliance retention | Audit service |

IAM **stops** hosting `AuditLogModule` / `AuditLogService` in the IAM deployable; it only publishes events.

### 3. No IAM direct DB access to `AuditLog`

Forbidden after extraction:

- IAM Prisma client writing to `audit_log`
- Shared repository that mixes `User` and `AuditLog` writes
- IAM HTTP handlers calling Audit’s persistence layer directly

Allowed:

- IAM → event bus / emitter → Audit consumer → Audit DB

Rollback (below) temporarily restores in-process listener + shared DB if needed.

### 4. Contract versioning

| Field | Rule |
|-------|------|
| `schemaVersion` | Required on every `AuditEvent`; current `1.0.0` (`AUDIT_CONTRACT_VERSION`) |
| Breaking change | New schema file (e.g. `audit-event.v2.schema.json`) + bump major; consumers support N and N-1 during migration |
| Non-breaking | Add optional metadata keys only within v1 |

Runtime validation in the monolith is **not** required (no Ajv dependency); Audit service may validate on ingest.

---

## Rollback plan

If extracted Audit service fails or bus delivery is unstable:

1. **Stop** IAM publishers from targeting the external bus (feature flag or config).
2. **Re-enable** `AuditLogModule` in IAM `AppModule` and in-process `@OnEvent(AUDIT_EVENT)` handler.
3. **Drain** dead-letter / failed bus messages into `audit_log` via a one-off script or manual replay.
4. **Revert** IAM deploy to last monolith version that included `AuditLogService` (keep event payload v1 compatible).
5. **Post-incident:** Document root cause; do not re-attempt extraction until G5 + operational readiness confirmed.

Target rollback time: single deploy cycle (no schema change on `User`; `audit_log` table unchanged).

---

## Ordered steps (execute only when G5 passes)

1. **Product / ops** — Document driver (compliance isolation, audit volume, separate SLO). Update [feasibility gate](./extraction-feasibility-gate.md): G5 → PASS.
2. **Contract** — Publish `audit-event.v1.schema.json` to shared schema registry or repo tag; pin `AUDIT_CONTRACT_VERSION` in IAM and Audit repos.
3. **Audit service skeleton** — New deployable with consumer + `AuditLogRepository` equivalent; own Prisma schema for `audit_log` only.
4. **Dual-write / shadow (optional)** — IAM emits to bus and in-process listener; compare counts until confident.
5. **Cut IAM persistence** — Remove `AuditLogModule` from IAM; IAM emits bus-only `publishAudit` payloads (same shape).
6. **Network & auth** — Bus credentials, mTLS or IAM roles; no anonymous publish.
7. **Observability** — Lag, DLQ depth, insert failures; alert separately from IAM API SLOs.
8. **Decommission shadow** — Turn off in-process listener; remove dual-write.
9. **Re-run gates** — G4 coupling, G6 if IAM still shares DB host (prefer separate DB instance for Audit).

---

## Consequences

| Positive | Negative |
|----------|----------|
| IAM deploys without audit DB dependency | Bus ops + monitoring overhead |
| Compliance can scale Audit independently | Event ordering / at-least-once handling in consumer |
| Clear contract for third-party publishers | G6 still applies to `User` — separate from Audit extract |

---

## References (code)

| Symbol | Location |
|--------|----------|
| `publishAudit` | `src/audit-log/events/publish-audit.ts` |
| `AuditEvent.schemaVersion` | `src/audit-log/events/audit.event.ts` |
| `AUDIT_CONTRACT_VERSION` | `src/audit-log/contracts/audit-contract.ts` |
| Fitness function | `scripts/check-domain-boundaries.mjs` |
