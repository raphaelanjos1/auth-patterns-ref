# ADR: Audit service extraction (readiness)

**Status:** Accepted (readiness only)  
**Date:** 2026-06-02  
**Related:** [audit-log.md](./audit-log.md), [extraction-feasibility-gate.md](./extraction-feasibility-gate.md)

## Context

IAM modules must record audit events without coupling to audit persistence.

## Decision

- IAM publishes audit via `src/audit-log/events/` only (`publishAudit`, contract v1).
- **First** candidate for physical extraction when microservices are allowed (lowest coupling).
- `yarn run check:boundaries` forbids IAM imports of `audit-log` service/repository/module.

## Consequences

- Extracted audit service subscribes to the same event contract (or message bus equivalent) without IAM importing its Nest module.
