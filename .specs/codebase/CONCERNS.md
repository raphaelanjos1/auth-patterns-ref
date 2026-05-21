# Codebase Concerns

**Analysis Date:** 2026-05-20 (updated T13)

## Resolved (Phase 1–3 / T13)

| Concern | Resolution |
|---------|------------|
| Dual IAM stack (`identity/` vs `user`+`auth`) | **Deprecate** — `src/identity/` ausente; [docs/identity-stack-decision.md](../../docs/identity-stack-decision.md) |
| Module root orphans | **Done** — leaf folders `user/application/`, `auth/authentication/`, `auth/authorization/` |
| Duplicate `UserRole` enum | **Done** — DTOs usam `UserRole` de `@generated/prisma` |
| Stringly-typed / duplicated audit emit | **Done** — `publishAudit` em `audit-log/events/` + contrato v1 |
| README.md outdated | **Done** (T13) — árvore alinhada a `app.module.ts` |
| E2E auth/user gap | **Done** (T11) — `test/auth-user.e2e-spec.ts` (sign-in + `GET /user/:id` com mocks) |

## Tech Debt (open)

_(Nenhum item crítico de stack dupla ou flatten pendente.)_

## Test Coverage Gaps

**E2E (baseline):**

- Covered: `GET /` smoke, `POST /auth/sign-in`, CRUD HTTP `/user` com Bearer (Prisma/port mocks — sem Docker); teardown `app.close()` nos e2e
- Gap opcional: DB real (Testcontainers) se CI exigir

## Security / Operational Notes

_(Nenhum CVE ou secret committed identificado nesta análise.)_

- JWT `expiresIn: '5m'` — adequado para demo; prod precisa refresh strategy (out of scope v1)
- Rate limiting global via Throttler — ver `docs/security.md` para detalhes

## Scaling / Extraction

**Shared Kernel on `User` table:**

- Issue: User Directory e Authentication compartilham modelo Prisma `User`
- Impact: Bloqueia extração de microserviços sem estratégia de schema/API
- Fix approach: Ports (T7) + ADRs Phase 3 — **não extrair serviços no v1**; deploy bloqueado G5

## References

Análises completas (evidência estendida):

- [decomposition-planning-roadmap-user-auth.md](../../docs/decomposition-planning-roadmap-user-auth.md)
- [coupling-analysis-user-auth.md](../../docs/coupling-analysis-user-auth.md)
- [common-domain-detection-user-auth.md](../../docs/common-domain-detection-user-auth.md)
