# Modular Monolith IAM — Specification

## Problem Statement

O repositório já possui análises DDD completas (`docs/`) mas **zero implementação** das melhorias estruturais (flatten, contratos audit, SSOT de roles). A árvore de código não reflete os subdomínios IAM/Audit/Shared; existe ainda uma stack paralela em `src/identity/` não integrada. Precisamos de requisitos testáveis e rastreáveis para executar Phase 1–2 **sem** microserviços e **sem** clean architecture verbosa.

## Goals

- [ ] Estrutura física alinhada ao mapa de domínios (authn leaf, user application leaf)
- [ ] Integração IAM → Audit via contrato único e helper
- [ ] Vocabulário `UserRole` sem duplicação
- [ ] Governança de imports entre domínios (fitness function)
- [ ] Decisão documentada sobre `src/identity/`

## Out of Scope

| Feature | Reason |
|---------|--------|
| Extração Audit / Access Control como serviços | Sem trigger G5; ver roadmap Phase 3 |
| Migração completa para `identity/` | Apenas spike/decisão (IAM-08) |
| Use-case classes, mappers por campo, pasta `application/` por operação | clean-arch-lite anti-bloat |
| Refresh tokens / OAuth externo | Fora do escopo reference v1 |

## User Stories

### P1: Flatten Authentication subdomain ⭐ MVP

**User Story**: Como mantenedor, quero arquivos de autenticação em `src/auth/authentication/` para que Authentication e Authorization sejam leaf components visíveis na árvore.

**Why P1**: Desbloqueia mapa de domínios e Stories 3, 6; baixo risco.

**Acceptance Criteria**:

1. WHEN inspecionar `src/auth/` THEN authentication business files SHALL reside under `authentication/` (service, controller, repository, guard, public decorator, sign-in dto)
2. WHEN `authorization/` existir THEN it SHALL remain unchanged at `src/auth/authorization/`
3. WHEN executar `npm test` THEN all existing tests SHALL pass without behavior change

**Independent Test**: `npm test` green; tree grep shows no authn business files at `auth/` root except documented composer (`auth.module.ts`).

**Requirement IDs:** IAM-01, IAM-02, IAM-03

---

### P1: UserRole single source of truth ⭐ MVP

**User Story**: Como mantenedor, quero um único tipo `UserRole` para que JWT, policy e DTOs não diverjam.

**Why P1**: Consolidação de baixo esforço, alto valor para agents.

**Acceptance Criteria**:

1. WHEN DTOs referenciam papel de usuário THEN they SHALL import `UserRole` from `@generated/prisma` or shared IAM contract
2. WHEN buscar `export enum UserRole` em `src/user/dto` THEN system SHALL find none
3. WHEN executar testes de authorization THEN behavior SHALL be unchanged

**Independent Test**: Grep + `npm test` on user/auth specs.

**Requirement IDs:** IAM-04, IAM-05

---

### P1: Audit publish helper and typed contract ⭐ MVP

**User Story**: Como mantenedor, quero uma API única de publicação de audit para que `user.service` e `auth.service` não dupliquem emit logic.

**Why P1**: Reduz acoplamento stringly-typed; prepara fitness function.

**Acceptance Criteria**:

1. WHEN IAM publica audit THEN it SHALL use shared helper (e.g. `publishAudit(emitter, payload)`)
2. WHEN definir ações audit THEN they SHALL use typed `AuditAction` from `audit-log/events`
3. WHEN grep por `eventEmitter.emit(AUDIT_EVENT` fora do helper THEN count SHALL be zero
4. WHEN executar `npm test` THEN audit tests SHALL pass

**Independent Test**: Helper unit usage + audit-log.service.spec.ts green.

**Requirement IDs:** IAM-06, IAM-07, IAM-08

---

### P2: Document User table Shared Kernel

**User Story**: Como arquiteto, quero ownership documentado da tabela `User` para futuras divisões de contexto.

**Why P2**: Baixo esforço; desbloqueia ports e extração futura.

**Acceptance Criteria**:

1. WHEN ler documentação de padrões THEN User Directory ownership of `User` model SHALL be explicit
2. WHEN Auth acessa credenciais THEN doc SHALL state credentials projection only (no merge com UserRepository)

**Independent Test**: Doc review — section exists in `docs/` or ADR linked from PROJECT.

**Requirement IDs:** IAM-09

---

### P2: Flatten User Directory application leaf

**User Story**: Como mantenedor, quero core user em `src/user/application/` para hierarquia consistente com auth.

**Acceptance Criteria**:

1. WHEN inspecionar `src/user/` THEN module, controller, service, repository SHALL be under `application/`
2. WHEN `dto/` existir THEN it SHALL remain sibling leaf
3. WHEN build/test THEN AppModule imports SHALL resolve

**Requirement IDs:** IAM-10, IAM-11

---

### P2: Domain boundary fitness function

**User Story**: Como mantenedor, quero CI falhando em imports cross-domain inválidos.

**Acceptance Criteria**:

1. WHEN IAM importa audit THEN only `audit-log/events` or helper path SHALL be allowed
2. WHEN violação ocorrer THEN CI script/eslint SHALL fail
3. WHEN allowlist existir THEN it SHALL be documented in CONVENTIONS or script header

**Requirement IDs:** IAM-12, IAM-13

---

### P2: User persistence ports

**User Story**: Como arquiteto, quero portas de leitura/escrita separadas para preparar split User Directory vs Access Control sem merge de repositórios.

**Acceptance Criteria**:

1. WHEN definir ports THEN `IUserDirectory` and `IUserCredentialsReader` SHALL exist with Symbol tokens
2. WHEN AuthRepository lê credenciais THEN it SHALL implement credentials port without exposing full user write API
3. WHEN unit tests mock persistence THEN they SHALL mock port interfaces

**Requirement IDs:** IAM-14, IAM-15, IAM-16

---

### P2: Identity stack decision (spike)

**User Story**: Como arquiteto, quero decisão explícita sobre `src/identity/` vs stack ativa.

**Acceptance Criteria**:

1. WHEN spike completar THEN written decision SHALL exist in `.specs/project/STATE.md` or `docs/`
2. WHEN decisão for migrate THEN ordered epic list SHALL be documented (not executed in spike)

**Requirement IDs:** IAM-17, IAM-18

---

## Edge Cases

- WHEN mover arquivos (flatten) THEN relative imports and jest paths SHALL be updated
- WHEN remover enum duplicado THEN class-validator enums SHALL still accept Prisma enum values
- WHEN helper audit falhar THEN audit listener SHALL not break sign-in (errors logged/isolated per existing pattern)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| IAM-01 | P1: Flatten auth — tree layout | Tasks | Pending |
| IAM-02 | P1: Flatten auth — authorization unchanged | Tasks | Pending |
| IAM-03 | P1: Flatten auth — tests green | Tasks | Pending |
| IAM-04 | P1: UserRole SSOT import | Tasks | Pending |
| IAM-05 | P1: UserRole no duplicate enum | Tasks | Pending |
| IAM-06 | P1: Audit helper | Tasks | Pending |
| IAM-07 | P1: AuditAction typed | Tasks | Pending |
| IAM-08 | P1: No raw emit outside helper | Tasks | Pending |
| IAM-09 | P2: Shared Kernel doc | Tasks | Pending |
| IAM-10 | P2: User application leaf | Tasks | Pending |
| IAM-11 | P2: User dto sibling | Tasks | Pending |
| IAM-12 | P2: Fitness function rules | Tasks | Pending |
| IAM-13 | P2: CI enforcement | Tasks | Pending |
| IAM-14 | P2: Port IUserDirectory | Tasks | Pending |
| IAM-15 | P2: Port IUserCredentialsReader | Tasks | Pending |
| IAM-16 | P2: Tests mock ports | Tasks | Pending |
| IAM-17 | P2: Identity spike decision | Tasks | Pending |
| IAM-18 | P2: Identity migration epic list | Tasks | Pending |

**Coverage:** 18 total, 0 verified — mapped in `tasks.md`

---

## Success Criteria

- [ ] Phase 1 stories (IAM-01–08) verified with `npm test` gate
- [ ] Orphaned production files ≤3 (composer exceptions documented)
- [ ] Domain map in `docs/domain-identification-grouping-user-auth.md` matches `src/` tree after Phase 2
- [ ] No new direct imports from IAM to `audit-log.service`

---

## Source Analysis (do not re-run)

| Document | Use |
|----------|-----|
| [decomposition-planning-roadmap-user-auth.md](../../../docs/decomposition-planning-roadmap-user-auth.md) | Stories 1–10, phases, gates |
| [domain-analysis-user-auth.md](../../../docs/domain-analysis-user-auth.md) | Subdomains, bounded contexts |
| [component-flattening-analysis-user-auth.md](../../../docs/component-flattening-analysis-user-auth.md) | Move lists |
| [common-domain-detection-user-auth.md](../../../docs/common-domain-detection-user-auth.md) | Consolidation rules |
| [coupling-analysis-user-auth.md](../../../docs/coupling-analysis-user-auth.md) | Integration rules |
