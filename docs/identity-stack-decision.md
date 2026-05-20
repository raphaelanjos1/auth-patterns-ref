# Identity stack decision (Story 8 spike)

**Status:** Accepted  
**Date:** 2026-05-20  
**Requirements:** IAM-17, IAM-18  
**Decision:** **Deprecate** the parallel `src/identity/` path; **do not** migrate or maintain a dual boundary in this repository.

---

## Context

Earlier DDD analyses ([component-inventory.md](./component-inventory.md), [decomposition-planning-roadmap-user-auth.md](./decomposition-planning-roadmap-user-auth.md)) described a richer parallel IAM layout under `src/identity/` (domain entities, ports, infrastructure) alongside the pragmatic `src/user/` + `src/auth/` stack.

**Verified on disk (2026-05-20):**

| Check | Result |
|-------|--------|
| `Test-Path src/identity` | **False** — directory absent |
| `AppModule` imports | `UserModule`, `AuthModule`, `AuditLogModule` only — no Identity module |

The **active, wired stack** is `user` (User Directory) + `auth` (Authentication + Authorization) + `audit-log`, with event-based audit integration. Phase 1–2 modular-monolith work (flatten, audit contract, fitness function, user `application/` leaf) targets this stack exclusively.

---

## Decision

**Deprecate / remove** `src/identity/` as a planned or parallel production path for this reference repo.

- Treat `user` + `auth` as the **single** IAM decomposition path (aligned with [domain-identification-grouping-user-auth.md](./domain-identification-grouping-user-auth.md)).
- Do **not** wire an Identity module into `AppModule` unless a future, explicit product decision reopens migration (out of v1 scope per [spec](../.specs/features/modular-monolith-iam/spec.md)).
- Do **not** maintain dual stacks (dual-boundary) — no second codebase exists to bound.

### Rationale

1. **No code to migrate** — `src/identity/` is not present; migration would be greenfield, not a move, with high cost and no runtime benefit for a reference app.
2. **Stack already converged** — Stories 1–7 improved the active path (structure, audit helper, ports direction in T7, CI boundaries). Duplicating that work in a revived `identity/` tree would confuse agents and readers.
3. **clean-arch-lite stance** — Rich domain + ports belong at real boundaries; incremental ports on `user`/`auth` (T7) satisfy extraction prep without a second module tree ([ARCHITECTURE.md](../.specs/codebase/ARCHITECTURE.md)).
4. **Documentation drift** — Inventories that claim ~78 files under `identity/` describe a **historical or planned** layout; docs should refer to the active stack unless the folder returns.

### Alternatives considered

| Option | Verdict |
|--------|---------|
| **Migrate** to `src/identity/` | Rejected — nothing on disk; would replace working modules with no product trigger. |
| **Dual-boundary** (both stacks, documented imports) | Rejected — only one stack exists; dual-boundary adds governance with zero code. |

---

## Consequences

- **Positive:** Single IAM mental model for contributors and agents; roadmap Stories 9–10 and ports work stay on `user`/`auth`.
- **Negative:** Tactical DDD patterns demonstrated only in docs/examples, not a live `identity/domain/` tree in-repo (acceptable for reference scope).
- **Docs:** References to “parallel `src/identity/`” in `docs/` and `.specs/codebase/` should be read as **deprecated / historical** until updated in a docs sweep.

---

## Migration epic list (IAM-18)

**Not applicable** — decision is deprecate, not migrate.

If `src/identity/` is **reintroduced** in a future branch, reopen this ADR and consider migrate with an ordered epic list such as:

1. Spike parity matrix (authn, authz, user CRUD, audit events vs current stack).
2. Port alignment (`IUserDirectory`, credentials reader) — avoid second repository merge.
3. Wire Identity module in `AppModule` behind feature flag or cutover plan.
4. Redirect HTTP routes / retire duplicate controllers.
5. Fitness function allowlists for any shared `audit-log/events` usage.
6. Delete `user/` + `auth/` application trees after test parity and e2e green.
7. Re-run component inventory and domain grouping on `identity/` only.

No execution of the above in the Story 8 spike.

---

## Next steps

1. **STATE.md** — Record decision; close Story 8 spike todo.
2. **Optional docs hygiene** (separate PR): add one-line “deprecated” notes in `component-inventory.md`, `ARCHITECTURE.md`, `common-domain-detection-user-auth.md` § Repository note; fix `README.md` if it still implies dual stack.
3. **T7 / IAM-14–16** — Continue ports on active `user`/`auth` path per tasks, not on `identity/`.
4. **Phase 3** — Service extraction (Stories 9–10) assumes User Directory vs Access Control split from **current** modules, not `identity/`.

---

## References

- [decomposition-planning-roadmap-user-auth.md](./decomposition-planning-roadmap-user-auth.md) — Story 8
- [component-inventory.md](./component-inventory.md) — identity section (historical)
- [.specs/project/STATE.md](../.specs/project/STATE.md) — decisions log
- [modular-monolith-iam spec](../.specs/features/modular-monolith-iam/spec.md) — IAM-17, IAM-18
