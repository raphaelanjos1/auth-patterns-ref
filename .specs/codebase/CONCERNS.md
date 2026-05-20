# Codebase Concerns

**Analysis Date:** 2026-05-20

## Tech Debt

**Dual IAM stack (`identity/` vs `user`+`auth`):**

- Issue: Duas implementações paralelas (guards, authz, audit, tests duplicados)
- Files: `src/identity/**` (não wired), `src/user/**`, `src/auth/**`
- Why: Experimento clean-arch-lite sem migração concluída
- Impact: Risco de drift, confusão para agents e devs
- Fix approach: Story 8 spike — deprecar, migrar ou documentar boundary explícito

**Module root orphans (flattening pending):**

- Issue: 13 arquivos de produção na raiz de `user/`, `auth/`, `audit-log/` fora de leaf folders
- Files: ver [docs/component-flattening-analysis-user-auth.md](../../docs/component-flattening-analysis-user-auth.md)
- Impact: Árvore não reflete subdomínios IAM
- Fix approach: Stories 1, 5 em `.specs/features/modular-monolith-iam/tasks.md`

**Duplicate `UserRole` enum:**

- Issue: `export enum UserRole` em `src/user/dto/create-user.dto.ts` duplica Prisma
- Files: `src/user/dto/create-user.dto.ts`
- Impact: Drift entre DTO, JWT e policy map
- Fix approach: Story 2 — import de `@generated/prisma`

**Stringly-typed / duplicated audit emit:**

- Issue: `eventEmitter.emit(AUDIT_EVENT, ...)` repetido em services
- Files: `src/user/user.service.ts`, `src/auth/auth.service.ts`
- Impact: Ações audit inconsistentes, difícil grep/fitness
- Fix approach: Story 3 — helper + contrato tipado

## Documentation Drift

**README.md outdated:**

- Issue: Descreve apenas `auth/`, `user/`, `shared/` — omite `audit-log` e `identity/`
- Files: `README.md` vs `src/app.module.ts`
- Impact: Onboarding incorreto
- Fix approach: Atualizar quando milestone de docs for priorizado (Future in ROADMAP)

## Test Coverage Gaps

**E2E minimal:**

- Issue: `test/app.e2e-spec.ts` só testa `GET /`
- Files: `test/app.e2e-spec.ts`
- Impact: Regressões em auth/user não detectadas em e2e
- Fix approach: Adicionar e2e após estabilizar rotas post-flatten (opcional Phase 2)

## Security / Operational Notes

_(Nenhum CVE ou secret committed identificado nesta análise.)_

- JWT `expiresIn: '5m'` — adequado para demo; prod precisa refresh strategy (out of scope v1)
- Rate limiting global via Throttler — ver `docs/security.md` para detalhes

## Scaling / Extraction

**Shared Kernel on `User` table:**

- Issue: User Directory e Authentication compartilham modelo Prisma `User`
- Impact: Bloqueia extração de microserviços sem estratégia de schema/API
- Fix approach: Documentar ownership (Story 4); ports (Story 7) — **não extrair serviços no v1**

## References

Análises completas (evidência estendida):

- [decomposition-planning-roadmap-user-auth.md](../../docs/decomposition-planning-roadmap-user-auth.md)
- [coupling-analysis-user-auth.md](../../docs/coupling-analysis-user-auth.md)
- [common-domain-detection-user-auth.md](../../docs/common-domain-detection-user-auth.md)
