# Roadmap

**Current Milestone:** Phase 3 — Extraction readiness ✅  
**Status:** Complete (Stories 1–10 implemented or documented; deploy gated on G5)

---

## Milestone 0: Baseline & spec ✅

**Goal:** Codebase mapeada, visão e spec traceáveis em `.specs/`

**Target:** 2026-05-20

### Features

**Brownfield mapping** - COMPLETE

- `.specs/codebase/*` (7 arquivos)
- Referência cruzada com `docs/` existentes

**Project & feature spec** - COMPLETE

- `PROJECT.md`, `ROADMAP.md`, `STATE.md`
- `features/modular-monolith-iam/spec.md` + `tasks.md`

---

## Milestone 1: Phase 1 — Estrutura e contratos (Sprints 1–2)

**Goal:** Árvore IAM legível, audit tipado, `UserRole` SSOT — sem mudança de comportamento runtime

**Target:** 1–2 semanas (part-time)

### Features

**Flatten Authentication** - PLANNED

- `src/auth/authentication/` (Story 1)
- Testes e imports verdes

**UserRole single source of truth** - PLANNED

- Remover enum duplicado em DTOs (Story 2)

**Audit contract & publish helper** - PLANNED

- Helper único + `AuditAction` tipado (Story 3)

**Shared Kernel documentation** - PLANNED

- Ownership da tabela `User` (Story 4)

---

## Milestone 2: Phase 2 — Domínios alinhados (Sprints 3–4)

**Goal:** Layout físico = mapa de domínios; portas de persistência; governança de imports

**Target:** 2–3 semanas após Milestone 1

### Features

**Flatten User Directory** - PLANNED

- `src/user/application/` (Story 5)

**Domain boundary fitness function** - PLANNED

- ESLint/script + CI (Story 6)

**User persistence ports** - PLANNED

- `IUserDirectory` + `IUserCredentialsReader` (Story 7)

**Identity stack decision (spike)** - PLANNED

- Deprecar, migrar ou dual-boundary (Story 8)

**IPermissionChecker facade** - COMPLETE (T12)  
**E2E auth/user** - COMPLETE (T11)  
**Docs hygiene** - COMPLETE (T13)

- Story opcional do roadmap original

---

## Milestone 3: Extraction readiness ✅

**Goal:** Contratos versionados + ADRs se produto exigir serviços separados

**Status:** COMPLETE (2026-05-20) — deploy ainda bloqueado por **G5**

### Features

**Audit extraction readiness (Story 9)** - COMPLETE

- `docs/extraction-feasibility-gate.md`, `docs/adr-audit-service-extraction.md`
- `src/audit-log/contracts/` + `schemaVersion` on events

**Access Control extraction readiness (Story 10)** - COMPLETE

- `docs/adr-access-control-service-extraction.md`, `docs/coupling-analysis-extraction-readiness.md`
- `src/shared/contracts/jwt-payload.ts`

---

## Future Considerations

- Atualizar `README.md` (estrutura `audit-log`, remover stack desatualizada)
- Unificar package manager (npm vs yarn)
- E2E cobrindo fluxos auth/user reais
- Adotar padrões de `src/identity/` (domain + ports) só onde Story 8 recomendar
