# Project State

**Last updated:** 2026-05-20

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-20 | Spec-driven em escopo **Medium**, não Quick Mode global | Projeto = mapeamento + spec + tasks; Quick Mode reservado por story |
| 2026-05-20 | **clean-arch-lite** como convenção arquitetural | Portas só em fronteiras de infra; evitar verbosidade que prejudica agents |
| 2026-05-20 | Stack ativa = `user` + `auth` + `audit-log` em `AppModule` | `src/identity/` existe mas não está wired — risco documentado |
| 2026-05-20 | Sem extração de microserviços no v1 | Reference repo; coupling saudável; Shared Kernel em `User` |

## Blockers

- Nenhum bloqueador técnico para iniciar Story 1

## Lessons

- Análises DDD em `docs/` são input para spec/tasks — não recriar relatórios em `.specs/`
- `README.md` desatualizado em relação a `app.module.ts` — corrigir quando tocar docs públicas

## Todos

- [ ] Executar T1 (flatten auth) — ver `tasks.md`
- [ ] Story 8 spike: decisão `identity/` vs `user`+`auth`

## Deferred

- Phase 3 service extraction (Stories 9–10)
- Rename `src/iam/` (Strategy B) até trigger de produto

## Preferences

- Documentação de spec em português; templates técnicos podem misturar EN (IDs de requisito)
- Trabalhos leves (STATE, handoff) funcionam bem com modelos rápidos

## Quick Tasks

_(nenhuma ainda)_
