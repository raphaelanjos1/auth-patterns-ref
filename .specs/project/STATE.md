# Project State

**Last updated:** 2026-05-20

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-20 | Spec-driven em escopo **Medium**, não Quick Mode global | Projeto = mapeamento + spec + tasks; Quick Mode reservado por story |
| 2026-05-20 | **clean-arch-lite** como convenção arquitetural | Portas só em fronteiras de infra; evitar verbosidade que prejudica agents |
| 2026-05-20 | Stack ativa = `user` + `auth` + `audit-log` em `AppModule` | Único path wired; ver decisão identity abaixo |
| 2026-05-20 | **Deprecate `src/identity/`** — stack única `user`+`auth` | `Test-Path src/identity` = False; ADR [docs/identity-stack-decision.md](../../docs/identity-stack-decision.md); Story 8 spike done |
| 2026-05-20 | Sem extração de microserviços no v1 | Reference repo; coupling saudável; Shared Kernel em `User` |

## Blockers

- Nenhum bloqueador técnico para iniciar Story 1

## Lessons

- Análises DDD em `docs/` são input para spec/tasks — não recriar relatórios em `.specs/`
- Análises que citam `src/identity/` (~78 arquivos) descrevem layout historico — pasta ausente; decisão = deprecate

## Todos

- [x] T7 (user ports) — `USER_DIRECTORY` / `USER_CREDENTIALS_READER` wired
- [x] Story 8 spike: decisão identity — **deprecate** ([docs/identity-stack-decision.md](../../docs/identity-stack-decision.md))
- [x] T9–T10 Phase 3 readiness (contratos + ADRs; deploy bloqueado G5)
- [x] T11 — E2E auth/user (`test/auth-user.e2e-spec.ts`, mocks)
- [x] T12 — `permissions-api` + `IPermissionChecker`; `user.controller` via facade
- [x] T13 — docs hygiene (README, ARCHITECTURE, CONCERNS, inventories)

## Decisions (Phase 3)

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-20 | Phase 3 = **extraction readiness**, not deploy | G5 fail; reference repo — [extraction-feasibility-gate.md](../../docs/extraction-feasibility-gate.md) |
| 2026-05-20 | Audit v1 contract + ADR before any Audit service | Story 9 — [adr-audit-service-extraction.md](../../docs/adr-audit-service-extraction.md) |
| 2026-05-20 | Access Control ADR + JwtPayload SSOT | Story 10 — [adr-access-control-service-extraction.md](../../docs/adr-access-control-service-extraction.md) |

## Deferred

- **Physical** service extraction (deploy) até G5 passar
- Rename `src/iam/` (Strategy B) até trigger de produto
- E2E com PostgreSQL real / CRUD completo (opcional)

## Preferences

- Documentação de spec em português; templates técnicos podem misturar EN (IDs de requisito)
- Trabalhos leves (STATE, handoff) funcionam bem com modelos rápidos

## Quick Tasks

_(nenhuma ainda)_
