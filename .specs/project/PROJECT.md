# Auth Patterns Ref

**Vision:** API de referência para autenticação, autorização e auditoria com NestJS — padrões reutilizáveis e seguros para projetos futuros.

**For:** Desenvolvedores e arquitetos que precisam de um baseline IAM (Identity & Access Management) sem microserviços prematuros.

**Solves:** Falta de um exemplo pequeno, testável e documentado que mostre JWT, RBAC, audit trail e estrutura modular monolith — sem a cerimônia de clean architecture verbosa.

## Goals

- Manter **lógica de negócio isolada**, **DI por portas só onde há fronteira de infra**, e **testes sem subir o container** (princípios [clean-arch-lite](../../.cursor/skills/clean-arch-lite/SKILL.md)).
- Concluir **Phase 1–2** do roadmap de decomposição: estrutura alinhada a domínios IAM / Audit / Shared, contratos tipados, sem extração de serviços.
- Documentar decisões em `.specs/` e reutilizar análises DDD existentes em `docs/` (não duplicar relatórios longos).

## Tech Stack

**Core:**

- Framework: NestJS 11 + Express
- Language: TypeScript 5.7
- Database: PostgreSQL 17 + Prisma 7.5
- Package manager: npm (lockfile `yarn.lock` presente — usar um só na equipe)

**Key dependencies:** `@nestjs/jwt`, `argon2`, `@nestjs/event-emitter`, `@nestjs/throttler`, `class-validator`

## Scope

**v1 includes (implementação planejada):**

- Modular monolith com `user`, `auth` (authentication + authorization), `audit-log`, `shared`
- Stories 1–6 do [roadmap de decomposição](../features/modular-monolith-iam/spec.md) (flatten, contratos, SSOT, fitness function)
- Spike Story 8: decisão sobre `src/identity/` vs stack ativa

**Explicitly out of scope:**

- Extração de microserviços (Pattern 6) — sem trigger de produto (G5/G6 no [roadmap](../../docs/decomposition-planning-roadmap-user-auth.md))
- Migração completa para `src/identity/` neste ciclo (apenas spike/decisão)
- Camadas extras: use-case por operação, mapper por campo, `application/` folder obrigatório em todo módulo

## Constraints

- **Tamanho:** ~350 statements de produção — mudanças pequenas, PRs atômicos
- **Arquitetura:** clean-arch-lite — portas apenas em DB, hashing, JWT; serviços de aplicação flat no módulo
- **Fonte de verdade DDD:** `docs/decomposition-planning-roadmap-user-auth.md` e artefatos linkados

## Related Artifacts

| Artefato | Caminho |
|----------|---------|
| Brownfield | `.specs/codebase/` |
| Feature spec | `.specs/features/modular-monolith-iam/spec.md` |
| Tasks | `.specs/features/modular-monolith-iam/tasks.md` |
| Análises DDD | `docs/*-user-auth.md`, `docs/component-inventory.md` |
| Estado da sessão | `.specs/project/STATE.md` |
