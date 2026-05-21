# Modular Monolith IAM — Specification

## Problem Statement

O repositório possui análises DDD em `docs/` e implementação Phase 1–3 na stack ativa (`user` + `auth` + `audit-log` + `permissions-api`). A stack paralela `src/identity/` foi **deprecada** ([docs/identity-stack-decision.md](../../docs/identity-stack-decision.md)). Este spec registra requisitos executados (flatten, audit contract, ports, boundaries, extraction readiness) **sem** microserviços deployados.

## Goals

- [x] Estrutura física alinhada ao mapa de domínios (authn leaf, user application leaf)
- [x] Integração IAM → Audit via contrato único e helper
- [x] Vocabulário `UserRole` sem duplicação
- [x] Governança de imports entre domínios (fitness function)
- [x] Decisão documentada sobre `src/identity/` — deprecate ([docs/identity-stack-decision.md](../../docs/identity-stack-decision.md))

## Out of Scope

| Feature | Reason |
|---------|--------|
| Deploy de microserviços Audit / Access Control | G5 (product trigger) não atendido; Phase 3 = readiness only |
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

### P3: Audit service extraction readiness (Phase 3)

**User Story**: Como arquiteto, quero contrato de audit versionado e blueprint de extração para que IAM publique eventos sem acoplamento a `AuditLog` table quando G5 passar.

**Why P3**: Story 9 do roadmap — preparação Pattern 6, não deploy.

**Acceptance Criteria**:

1. WHEN avaliar gate G1–G6 THEN documento SHALL registrar status pós Phase 2 e bloqueio G5
2. WHEN publicar audit THEN payload SHALL incluir `schemaVersion` alinhado a JSON Schema v1
3. WHEN IAM integrar audit THEN SHALL usar apenas `audit-log/events` + helper (sem import de `audit-log.service`)
4. WHEN ler ADR de extração audit THEN rollback plan e consumer boundary SHALL existir

**Independent Test**: Schema file exists; `npm test` green; doc review ADR + feasibility gate.

**Requirement IDs:** IAM-19, IAM-20, IAM-21

---

### P3: Access Control extraction readiness (Phase 3)

**User Story**: Como arquiteto, quero contrato de claims JWT compartilhado e blueprint Access Control para que User Directory exponha apenas identidade quando G5 passar.

**Why P3**: Story 10 do roadmap — depende de ports (T7) e padrões de T9.

**Acceptance Criteria**:

1. WHEN guards validam JWT THEN SHALL usar tipo `JwtPayload` SSOT em `shared/contracts`
2. WHEN documentar extração THEN ADR SHALL definir claims API vs Shared Kernel `User` table
3. WHEN reavaliar acoplamento THEN addendum SHALL confirmar zero arestas CRITICAL para split authn+authz
4. WHEN G5 faltar THEN decisão SHALL manter monólito modular com módulos lógicos documentados

**Independent Test**: Guards importam contrato; `npm test` green; doc review ADR + coupling addendum.

**Requirement IDs:** IAM-22, IAM-23, IAM-24

---

## Edge Cases

- WHEN mover arquivos (flatten) THEN relative imports and jest paths SHALL be updated
- WHEN remover enum duplicado THEN class-validator enums SHALL still accept Prisma enum values
- WHEN helper audit falhar THEN audit listener SHALL not break sign-in (errors logged/isolated per existing pattern)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| IAM-01 | P1: Flatten auth — tree layout | Tasks | Verified |
| IAM-02 | P1: Flatten auth — authorization unchanged | Tasks | Verified |
| IAM-03 | P1: Flatten auth — tests green | Tasks | Verified |
| IAM-04 | P1: UserRole SSOT import | Tasks | Verified |
| IAM-05 | P1: UserRole no duplicate enum | Tasks | Verified |
| IAM-06 | P1: Audit helper | Tasks | Verified |
| IAM-07 | P1: AuditAction typed | Tasks | Verified |
| IAM-08 | P1: No raw emit outside helper | Tasks | Verified |
| IAM-09 | P2: Shared Kernel doc | Tasks | Verified |
| IAM-10 | P2: User application leaf | Tasks | Verified |
| IAM-11 | P2: User dto sibling | Tasks | Verified |
| IAM-12 | P2: Fitness function rules | Tasks | Verified |
| IAM-13 | P2: CI enforcement | Tasks | Verified |
| IAM-14 | P2: Port IUserDirectory | Tasks | Verified |
| IAM-15 | P2: Port IUserCredentialsReader | Tasks | Verified |
| IAM-16 | P2: Tests mock ports | Tasks | Verified |
| IAM-17 | P2: Identity spike decision | Tasks | Verified |
| IAM-18 | P2: Identity migration epic list | Tasks | Verified (N/A — deprecate) |
| IAM-19 | P3: Feasibility gate G1–G6 | Tasks | Verified |
| IAM-20 | P3: Audit schema v1 + schemaVersion | Tasks | Verified |
| IAM-21 | P3: Audit extraction ADR | Tasks | Verified |
| IAM-22 | P3: JwtPayload SSOT | Tasks | Verified |
| IAM-23 | P3: Access Control extraction ADR | Tasks | Verified |
| IAM-24 | P3: Coupling addendum post Phase 2 | Tasks | Verified |

**Coverage:** 24 total, 24 verified (IAM-01–24)

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
